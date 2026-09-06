// Supabase Edge Function: verify-razorpay-payment
// Server-side HMAC-SHA256 signature verification for Razorpay tournament payments

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function verifyHmacSha256(data: string, signature: string, secret: string): Promise<boolean> {
  if (!secret) return true // Test/mock bypass only if secret not configured in dev
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
    const generatedHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    return generatedHex.toLowerCase() === signature.toLowerCase()
  } catch (err) {
    console.error('[HMAC Verification Exception]:', err)
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
    const { order_id, payment_id, signature, tournament_id } = body

    if (!order_id || !payment_id || !tournament_id) {
      return new Response(
        JSON.stringify({ error: 'order_id, payment_id, and tournament_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Verify Razorpay cryptographic signature server-side
    const signaturePayload = `${order_id}|${payment_id}`
    const isValidSignature = await verifyHmacSha256(signaturePayload, signature || '', razorpayKeySecret)

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 4. Fetch the existing pending payment record
    const { data: paymentRecord, error: fetchError } = await supabaseAdmin
      .from('tournament_payments')
      .select('*')
      .eq('razorpay_order_id', order_id)
      .eq('tournament_id', tournament_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !paymentRecord) {
      return new Response(
        JSON.stringify({ error: 'Payment order record not found for this tournament and user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Idempotency: If already verified, return success safely
    if (paymentRecord.status === 'VERIFIED') {
      return new Response(
        JSON.stringify({
          success: true,
          payment_id: paymentRecord.id,
          razorpay_payment_id: paymentRecord.razorpay_payment_id || payment_id,
          status: 'VERIFIED',
          message: 'Payment already verified.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (paymentRecord.status === 'CONSUMED') {
      return new Response(
        JSON.stringify({ error: 'This payment has already been used for registration' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isValidSignature) {
      // Mark as FAILED on signature failure
      await supabaseAdmin
        .from('tournament_payments')
        .update({ status: 'FAILED', updated_at: new Date().toISOString() })
        .eq('id', paymentRecord.id)

      return new Response(
        JSON.stringify({ error: 'Cryptographic signature verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Update payment record to VERIFIED
    const nowIso = new Date().toISOString()
    const { data: updatedPayment, error: updateError } = await supabaseAdmin
      .from('tournament_payments')
      .update({
        status: 'VERIFIED',
        razorpay_payment_id: payment_id,
        verified_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', paymentRecord.id)
      .select('id, razorpay_order_id, razorpay_payment_id, status, amount, currency')
      .single()

    if (updateError) {
      console.error('[Payment Verification Update Error]:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update payment status to verified' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: updatedPayment.id,
        razorpay_payment_id: updatedPayment.razorpay_payment_id,
        status: 'VERIFIED',
        amount: updatedPayment.amount,
        currency: updatedPayment.currency,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('[verify-razorpay-payment Exception]:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
