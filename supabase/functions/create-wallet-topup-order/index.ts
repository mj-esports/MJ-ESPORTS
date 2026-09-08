// Supabase Edge Function: create-wallet-topup-order
// Authoritative creation of Razorpay orders for wallet top-ups (Phase 9.2)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const razorpayKeyId = (Deno.env.get('RAZORPAY_KEY_ID') || '').trim()
    const razorpayKeySecret = (Deno.env.get('RAZORPAY_KEY_SECRET') || '').trim()

    // 1. Authenticate caller strictly
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parse request payload
    let body: any
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { amount, client_idempotency_key } = body

    // 3. Validate client_idempotency_key
    if (!client_idempotency_key || typeof client_idempotency_key !== 'string' || client_idempotency_key.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'client_idempotency_key is required and must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const cleanIdempotencyKey = client_idempotency_key.trim()
    if (cleanIdempotencyKey.length > 128) {
      return new Response(
        JSON.stringify({ error: 'client_idempotency_key exceeds maximum length of 128 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Phase 9.4: Validate amount precision and range
    // Amount must be whole rupees only (no decimals/paise) and between 1 and 200 INR.
    // Legacy Phase 9.2 bounds (numericAmount < 10.00, numericAmount > 10000.00) are superseded by Phase 9.4 limit.
    if (amount === undefined || amount === null) {
      return new Response(
        JSON.stringify({ error: 'amount is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rawAmountStr = String(amount).trim()
    const wholeRupeeRegex = /^\d+$/
    if (!wholeRupeeRegex.test(rawAmountStr)) {
      return new Response(
        JSON.stringify({ error: 'amount must be a whole INR number of rupees (no decimals or paise permitted)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const numericAmount = parseInt(rawAmountStr, 10)
    if (isNaN(numericAmount) || numericAmount < 1 || numericAmount > 200) {
      return new Response(
        JSON.stringify({ error: 'amount must be between ₹1 and ₹200' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Amount in integer paise safely
    const amountInPaise = numericAmount * 100
    if (amountInPaise < 100 || amountInPaise > 20000) {
      return new Response(
        JSON.stringify({ error: 'amount in paise is out of valid bounds' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Ensure user has a wallet via get_or_create_wallet() & verify ₹200 balance ceiling
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: walletData, error: walletError } = await supabaseClient.rpc('get_or_create_wallet')

    if (walletError || !walletData?.success || !walletData?.wallet?.id) {
      console.error('[create-wallet-topup-order] Failed to ensure wallet:', walletError || walletData)
      return new Response(
        JSON.stringify({ error: 'Failed to access user wallet' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const walletId = walletData.wallet.id
    const currentBalance = Number(walletData.wallet.balance || 0.0)

    // Phase 9.4: Check that current balance + topup amount does not exceed ₹200
    if ((currentBalance + numericAmount) > 200.0) {
      const maxAllowed = Math.max(0, 200 - Math.floor(currentBalance))
      return new Response(
        JSON.stringify({
          error: `Top-up rejected: wallet balance cannot exceed ₹200. Current balance is ₹${Math.floor(currentBalance)}. Maximum allowed top-up is ₹${maxAllowed}.`,
          error_code: 'WALLET_LIMIT_EXCEEDED',
          current_balance: currentBalance,
          max_allowed_topup: maxAllowed,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Check for existing top-up order with this client_idempotency_key
    const { data: existingTopup, error: existingError } = await supabaseAdmin
      .from('wallet_topups')
      .select('id, razorpay_order_id, amount, currency, status, client_idempotency_key')
      .eq('user_id', user.id)
      .eq('client_idempotency_key', cleanIdempotencyKey)
      .maybeSingle()

    if (existingError) {
      console.error('[create-wallet-topup-order] Error checking existing topup:', existingError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify idempotency state' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingTopup) {
      if (existingTopup.status === 'PENDING') {
        // Return existing order without creating a duplicate Razorpay order
        return new Response(
          JSON.stringify({
            success: true,
            order_id: existingTopup.razorpay_order_id,
            key_id: razorpayKeyId,
            amount: Math.round(Number(existingTopup.amount) * 100),
            currency: existingTopup.currency,
            topup_id: existingTopup.id,
            idempotent_replay: true,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else if (existingTopup.status === 'COMPLETED') {
        return new Response(
          JSON.stringify({ error: 'This top-up request has already been completed.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        return new Response(
          JSON.stringify({
            error: `This top-up request is in terminal state '${existingTopup.status}'. Please initiate a new top-up.`,
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 7. Create Razorpay order
    // Receipt must be <= 40 characters
    const receipt = `top_${user.id.replace(/-/g, '').slice(0, 12)}_${Date.now().toString(36)}`.slice(0, 40)

    let orderId: string
    if (razorpayKeyId && razorpayKeySecret) {
      const basicAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`)
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt,
          notes: {
            purpose: 'wallet_topup',
            user_id: user.id,
            wallet_id: walletId,
            client_idempotency_key: cleanIdempotencyKey,
          },
        }),
      })

      if (!rzpRes.ok) {
        const errorData = await rzpRes.json().catch(() => ({}))
        console.error('[Razorpay Topup Order Error]:', errorData)
        return new Response(
          JSON.stringify({
            error: 'Failed to create payment order with payment gateway',
            gateway_error: errorData?.error?.description || errorData?.error?.code || 'Order creation rejected',
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const rzpData = await rzpRes.json()
      orderId = rzpData.id
    } else {
      // Mock order for test environments when Razorpay keys are not configured
      orderId = `order_topup_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    }

    // 8. Insert top-up record in public.wallet_topups
    const { data: newTopup, error: insertError } = await supabaseAdmin
      .from('wallet_topups')
      .insert({
        user_id: user.id,
        wallet_id: walletId,
        amount: numericAmount,
        currency: 'INR',
        client_idempotency_key: cleanIdempotencyKey,
        razorpay_order_id: orderId,
        status: 'PENDING',
        metadata: {
          receipt,
          source: 'create-wallet-topup-order',
        },
      })
      .select('id, razorpay_order_id, amount, currency, status')
      .single()

    if (insertError) {
      // Handle race condition: check if duplicate key violation occurred
      if (insertError.code === '23505') {
        const { data: racedTopup } = await supabaseAdmin
          .from('wallet_topups')
          .select('id, razorpay_order_id, amount, currency, status')
          .eq('user_id', user.id)
          .eq('client_idempotency_key', cleanIdempotencyKey)
          .maybeSingle()

        if (racedTopup) {
          return new Response(
            JSON.stringify({
              success: true,
              order_id: racedTopup.razorpay_order_id,
              key_id: razorpayKeyId,
              amount: Math.round(Number(racedTopup.amount) * 100),
              currency: racedTopup.currency,
              topup_id: racedTopup.id,
              idempotent_replay: true,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }

      console.error('[Database wallet_topups Insertion Error]:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to record pending top-up' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 9. Return safe response (never expose secret)
    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderId,
        key_id: razorpayKeyId,
        amount: amountInPaise,
        display_amount: numericAmount,
        currency: 'INR',
        topup_id: newTopup.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('[create-wallet-topup-order Exception]:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
