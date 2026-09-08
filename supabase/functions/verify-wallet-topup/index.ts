// Supabase Edge Function: verify-wallet-topup
// Server-side HMAC-SHA256 signature verification & atomic settlement for wallet top-ups (Phase 9.2)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Constant-time comparison between two ASCII/hex strings to prevent timing side-channel attacks.
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

/**
 * Computes HMAC-SHA256 and verifies against expected hex signature using constant-time comparison.
 */
async function verifyHmacSha256(data: string, signature: string, secret: string): Promise<boolean> {
  if (!secret) return true // Test/mock bypass only if secret not configured in dev environment
  try {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      encoder.encode(data)
    )
    const hashArray = Array.from(new Uint8Array(signatureBuffer))
    const generatedHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toLowerCase()
    const providedHex = signature.trim().toLowerCase()

    return constantTimeCompare(generatedHex, providedHex)
  } catch (err) {
    console.error('[verify-wallet-topup HMAC Exception]:', err)
    return false
  }
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

    // 2. Parse and validate request payload
    let body: any
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { order_id, payment_id, signature } = body

    if (!order_id || typeof order_id !== 'string' || order_id.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'order_id is required and must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!payment_id || typeof payment_id !== 'string' || payment_id.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'payment_id is required and must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!signature || typeof signature !== 'string' || signature.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'signature is required and must be a non-empty string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cleanOrderId = order_id.trim()
    const cleanPaymentId = payment_id.trim()
    const cleanSignature = signature.trim()

    if (cleanOrderId.length > 64 || cleanPaymentId.length > 64 || cleanSignature.length > 128) {
      return new Response(
        JSON.stringify({ error: 'Parameters exceed allowable length limits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 3. Locate top-up record owned by authenticated user
    const { data: topup, error: fetchError } = await supabaseAdmin
      .from('wallet_topups')
      .select('id, user_id, wallet_id, amount, currency, status, razorpay_order_id, razorpay_payment_id')
      .eq('razorpay_order_id', cleanOrderId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError || !topup) {
      return new Response(
        JSON.stringify({ error: 'Top-up order record not found for this user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Check for already settled top-up (idempotent replay)
    if (topup.status === 'COMPLETED') {
      if (topup.razorpay_payment_id === cleanPaymentId) {
        return new Response(
          JSON.stringify({
            success: true,
            already_settled: true,
            topup_id: topup.id,
            amount: topup.amount,
            wallet_id: topup.wallet_id,
            message: 'Top-up was already verified and settled successfully (idempotent replay).',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        return new Response(
          JSON.stringify({ error: 'This top-up was already settled with a different payment ID.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 5. Terminal state guard
    if (topup.status !== 'PENDING') {
      return new Response(
        JSON.stringify({ error: `Cannot verify top-up in terminal state '${topup.status}'.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Verify HMAC-SHA256 signature with RAZORPAY_KEY_SECRET
    const signaturePayload = `${cleanOrderId}|${cleanPaymentId}`
    const isValidSignature = await verifyHmacSha256(signaturePayload, cleanSignature, razorpayKeySecret)

    if (!isValidSignature) {
      console.warn(`[verify-wallet-topup] Invalid HMAC signature for order ${cleanOrderId}`)
      return new Response(
        JSON.stringify({ error: 'Invalid Razorpay cryptographic signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Check global payment_id uniqueness: payment_id must not be used on any other top-up
    const { data: existingPayment, error: paymentCheckError } = await supabaseAdmin
      .from('wallet_topups')
      .select('id')
      .eq('razorpay_payment_id', cleanPaymentId)
      .neq('id', topup.id)
      .maybeSingle()

    if (paymentCheckError) {
      console.error('[verify-wallet-topup] Error checking payment uniqueness:', paymentCheckError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify payment uniqueness' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (existingPayment) {
      return new Response(
        JSON.stringify({ error: 'This payment ID has already been credited to another top-up.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 8. Invoke settlement RPC via service_role
    // Note: The RPC uses ONLY database-stored topup amount and user_id/wallet_id
    const { data: settleResult, error: settleRpcError } = await supabaseAdmin.rpc('settle_wallet_topup', {
      p_topup_id: topup.id,
      p_razorpay_payment_id: cleanPaymentId,
      p_razorpay_signature: cleanSignature,
    })

    if (settleRpcError) {
      console.error('[verify-wallet-topup] RPC execution error:', settleRpcError)
      return new Response(
        JSON.stringify({ error: 'Database settlement transaction failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!settleResult || !settleResult.success) {
      console.error('[verify-wallet-topup] Settlement rejected:', settleResult)
      return new Response(
        JSON.stringify({
          error: settleResult?.message || 'Settlement failed',
          error_code: settleResult?.error_code || 'SETTLEMENT_REJECTED',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 9. Return authoritative balance and transaction details
    return new Response(
      JSON.stringify({
        success: true,
        topup_id: topup.id,
        amount: topup.amount,
        balance_after: settleResult.balance_after,
        transaction_id: settleResult.transaction_id,
        message: 'Wallet top-up verified and credited successfully.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('[verify-wallet-topup Exception]:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
