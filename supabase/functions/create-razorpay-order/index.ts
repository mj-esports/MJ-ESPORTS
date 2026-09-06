// Supabase Edge Function: create-razorpay-order
// Authoritative creation of Razorpay orders for tournament entry fees

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
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID') || ''
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') || ''

    // 1. Authenticate caller
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
    const body = await req.json()
    const { tournament_id } = body

    if (!tournament_id) {
      return new Response(
        JSON.stringify({ error: 'tournament_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Admin client for authoritative DB checks & payment recording
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { data: tournament, error: tournError } = await supabaseAdmin
      .from('tournaments')
      .select('id, title, entry_fee, status, max_teams, registered_teams')
      .eq('id', tournament_id)
      .single()

    if (tournError || !tournament) {
      return new Response(
        JSON.stringify({ error: 'Tournament not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (tournament.status !== 'Registration Open') {
      return new Response(
        JSON.stringify({ error: 'Tournament registration is closed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if ((tournament.registered_teams || 0) >= (tournament.max_teams || 32)) {
      return new Response(
        JSON.stringify({ error: 'Tournament slots are full' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Authoritatively compute required entry fee (Never trust frontend amount)
    const rawFee = String(tournament.entry_fee || 'Free').trim()
    const digits = rawFee.replace(/[^0-9.]/g, '')
    const numericFee = rawFee.toLowerCase() === 'free' || !digits ? 0 : parseFloat(digits)

    if (numericFee <= 0) {
      return new Response(
        JSON.stringify({ error: 'This tournament is free. No Razorpay order required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const amountInPaise = Math.round(numericFee * 100)
    const idempotencyKey = `${user.id}_${tournament_id}_${Date.now()}`

    // 5. Call Razorpay API to generate order
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
          receipt: idempotencyKey,
          notes: {
            tournament_id: tournament.id,
            user_id: user.id,
            title: tournament.title,
          },
        }),
      })

      if (!rzpRes.ok) {
        const errorData = await rzpRes.json().catch(() => ({}))
        console.error('[Razorpay Order Creation Error]:', errorData)
        return new Response(
          JSON.stringify({ error: 'Failed to create payment order with payment gateway' }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const rzpData = await rzpRes.json()
      orderId = rzpData.id
    } else {
      // Fallback for mock/test environments
      orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    }

    // 6. Record PENDING transaction in public.tournament_payments
    const { data: paymentRecord, error: insertError } = await supabaseAdmin
      .from('tournament_payments')
      .insert({
        tournament_id: tournament.id,
        user_id: user.id,
        razorpay_order_id: orderId,
        amount: numericFee,
        currency: 'INR',
        status: 'PENDING',
        idempotency_key: idempotencyKey,
      })
      .select('id, razorpay_order_id, amount, currency, status')
      .single()

    if (insertError) {
      console.error('[Database Payment Record Insertion Error]:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to record pending payment record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderId,
        payment_record_id: paymentRecord.id,
        amount: amountInPaise,
        display_amount: numericFee,
        currency: 'INR',
        key_id: razorpayKeyId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('[create-razorpay-order Exception]:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
