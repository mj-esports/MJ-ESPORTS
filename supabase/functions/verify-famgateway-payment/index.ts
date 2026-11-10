// Supabase Edge Function: verify-famgateway-payment
// Server-side verification of FamGateway payments for tournament entry fees

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
    const famgatewayApiKey = (Deno.env.get('FAMGATEWAY_API_KEY') || '').trim()
    const famgatewayApiUrl = (Deno.env.get('FAMGATEWAY_API_URL') || 'https://famgateway.in/api').trim()

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
        JSON.stringify({ error: 'Invalid JSON request payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { order_id, tournament_id } = body

    if (!order_id || !tournament_id) {
      return new Response(
        JSON.stringify({ error: 'order_id and tournament_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cleanOrderId = String(order_id).trim()
    const cleanTournamentId = String(tournament_id).trim()

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 3. Fetch existing pending/verified payment record
    const { data: paymentRecord, error: fetchError } = await supabaseAdmin
      .from('tournament_payments')
      .select('*')
      .eq('provider_order_id', cleanOrderId)
      .eq('tournament_id', cleanTournamentId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !paymentRecord) {
      return new Response(
        JSON.stringify({ error: 'Payment order record not found for this tournament and user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Idempotency guards
    if (paymentRecord.status === 'CONSUMED') {
      return new Response(
        JSON.stringify({
          success: true,
          status: 'CONSUMED',
          already_consumed: true,
          registration_id: paymentRecord.registration_id,
          message: 'Payment has already been confirmed and consumed for registration.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (paymentRecord.status === 'VERIFIED') {
      return new Response(
        JSON.stringify({
          success: true,
          status: 'VERIFIED',
          payment_id: paymentRecord.id,
          order_id: paymentRecord.provider_order_id,
          utr: paymentRecord.provider_payment_id,
          amount: paymentRecord.amount,
          currency: paymentRecord.currency,
          message: 'Payment already verified.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Query FamGateway API v2: GET /api/verify-order.php?order_id={order_id}
    let isPaymentVerified = false
    let verifiedUtr: string | null = null
    let gatewayStatus = 'pending'

    if (famgatewayApiKey) {
      const verifyRes = await fetch(
        `${famgatewayApiUrl}/verify-order.php?order_id=${encodeURIComponent(cleanOrderId)}`,
        {
          method: 'GET',
          headers: {
            'X-Api-Key': famgatewayApiKey,
            'Content-Type': 'application/json',
            'User-Agent': 'MJ-Esports-Backend/1.0',
          },
        }
      )

      if (!verifyRes.ok) {
        console.warn(`[FamGateway Verify HTTP ${verifyRes.status}]:`, await verifyRes.text().catch(() => ''))
        return new Response(
          JSON.stringify({
            success: false,
            status: 'PENDING',
            message: 'Payment verification in progress. Awaiting bank confirmation.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const verifyData = await verifyRes.json()
      gatewayStatus = String(verifyData?.status || '').toLowerCase()

      if (gatewayStatus === 'success' || gatewayStatus === 'paid') {
        const rawGatewayAmount = verifyData?.amount ?? verifyData?.data?.amount

        // 1. Reject missing, empty, or undefined amounts
        if (rawGatewayAmount === undefined || rawGatewayAmount === null || rawGatewayAmount === '') {
          return new Response(
            JSON.stringify({
              error: 'Payment gateway returned missing or empty payment amount',
              error_code: 'INVALID_AMOUNT',
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const verifiedAmount = Number(rawGatewayAmount)
        const expectedAmount = Number(paymentRecord.amount)

        // 2. Reject malformed, non-finite, NaN, or non-positive amounts
        if (!Number.isFinite(verifiedAmount) || isNaN(verifiedAmount) || verifiedAmount <= 0) {
          return new Response(
            JSON.stringify({
              error: 'Payment gateway returned malformed or non-finite payment amount',
              error_code: 'INVALID_AMOUNT',
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // 3. Enforce exact monetary equality in integer paise to eliminate floating-point precision error
        const verifiedPaise = Math.round(verifiedAmount * 100)
        const expectedPaise = Math.round(expectedAmount * 100)

        // Reject both underpayment and overpayment
        if (verifiedPaise !== expectedPaise) {
          const isUnderpayment = verifiedPaise < expectedPaise
          return new Response(
            JSON.stringify({
              error: isUnderpayment
                ? `Paid amount (₹${verifiedAmount.toFixed(2)}) is less than required fee (₹${expectedAmount.toFixed(2)})`
                : `Paid amount (₹${verifiedAmount.toFixed(2)}) exceeds required fee (₹${expectedAmount.toFixed(2)})`,
              error_code: 'AMOUNT_MISMATCH',
              expected_amount: expectedAmount,
              verified_amount: verifiedAmount,
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // 4. Validate currency consistency (preserves INR constraint)
        const gatewayCurrency = String(verifyData?.currency || verifyData?.data?.currency || 'INR').trim().toUpperCase()
        const expectedCurrency = String(paymentRecord.currency || 'INR').trim().toUpperCase()
        if (gatewayCurrency !== expectedCurrency) {
          return new Response(
            JSON.stringify({
              error: `Payment currency mismatch: expected ${expectedCurrency}, received ${gatewayCurrency}`,
              error_code: 'CURRENCY_MISMATCH',
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        isPaymentVerified = true
        const dataObj = (typeof verifyData?.data === 'object' && verifyData?.data !== null) ? verifyData.data : {}
        verifiedUtr = String(
          dataObj.utr ||
          verifyData.utr ||
          dataObj.transaction_id ||
          verifyData.transaction_id ||
          cleanOrderId
        ).trim()
      } else if (gatewayStatus === 'expired') {
        await supabaseAdmin
          .from('tournament_payments')
          .update({ status: 'FAILED', updated_at: new Date().toISOString() })
          .eq('id', paymentRecord.id)

        return new Response(
          JSON.stringify({
            success: false,
            status: 'EXPIRED',
            error: 'Payment session has expired. Please initiate a new registration.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Test environment simulation only if no API key is provided
      if (cleanOrderId.startsWith('ORD_MOCK_')) {
        isPaymentVerified = true
        verifiedUtr = `UTR_MOCK_${Date.now()}`
      }
    }

    if (!isPaymentVerified) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 'PENDING',
          message: 'Payment is pending. Please complete the transfer in your UPI app.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Update payment record to VERIFIED
    const nowIso = new Date().toISOString()
    const { data: updatedPayment, error: updateError } = await supabaseAdmin
      .from('tournament_payments')
      .update({
        status: 'VERIFIED',
        provider_payment_id: verifiedUtr,
        verified_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', paymentRecord.id)
      .select('id, provider_order_id, provider_payment_id, status, amount, currency')
      .single()

    if (updateError) {
      console.error('[Payment Verification DB Update Error]:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to record payment verification in database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: updatedPayment.id,
        order_id: updatedPayment.provider_order_id,
        utr: updatedPayment.provider_payment_id,
        status: 'VERIFIED',
        amount: updatedPayment.amount,
        currency: updatedPayment.currency,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('[verify-famgateway-payment Exception]:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

