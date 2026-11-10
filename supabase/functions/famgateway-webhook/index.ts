// Supabase Edge Function: famgateway-webhook
// Authoritative server-to-server webhook listener for FamGateway payment clearance & headless recovery

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Constant-time string comparison to prevent timing attacks.
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
 * Computes HMAC-SHA256 over the raw UTF-8 request body using FamGateway API Key.
 */
async function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  apiKey: string
): Promise<boolean> {
  if (!apiKey || !signature || !rawBody) return false
  try {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(apiKey.trim())
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
      encoder.encode(rawBody)
    )
    const hashArray = Array.from(new Uint8Array(signatureBuffer))
    const generatedHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toLowerCase()
    const providedHex = signature.trim().toLowerCase()

    return constantTimeCompare(generatedHex, providedHex)
  } catch (err) {
    console.error('[verifyWebhookSignature Exception]:', err)
    return false
  }
}

serve(async (req: Request) => {
  try {
    // 1. Only allow POST requests for webhooks
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 2. Read raw request body before JSON parsing
    let rawBody: string
    try {
      rawBody = await req.text()
    } catch (err) {
      console.error('[famgateway-webhook] Failed to read raw body:', err)
      return new Response(JSON.stringify({ error: 'Failed to read request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 3. Read FAMGATEWAY_API_KEY and fail closed immediately if missing
    const apiKey = (Deno.env.get('FAMGATEWAY_API_KEY') || '').trim()
    if (!apiKey) {
      console.error('[famgateway-webhook] FAMGATEWAY_API_KEY is not configured in Supabase Edge Function Secrets')
      return new Response(
        JSON.stringify({ error: 'Webhook processing misconfigured (secret missing)' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 4. Extract signature header and reject missing signature with HTTP 400
    const signature =
      req.headers.get('x-famgateway-signature') ||
      req.headers.get('X-FamGateway-Signature') ||
      req.headers.get('x-signature')

    if (!signature) {
      console.warn('[famgateway-webhook] Missing signature header')
      return new Response(JSON.stringify({ error: 'Missing X-FamGateway-Signature header' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 5. Verify HMAC-SHA256 signature against raw request body (reject invalid with HTTP 401)
    const isValidSignature = await verifyWebhookSignature(rawBody, signature, apiKey)
    if (!isValidSignature) {
      console.warn('[famgateway-webhook] Cryptographic signature verification failed')
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // 6. Parse JSON payload only after verified signature
    let eventPayload: any
    try {
      eventPayload = JSON.parse(rawBody)
    } catch (err) {
      console.error('[famgateway-webhook] Invalid JSON payload:', err)
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const orderId = String(eventPayload?.order_id || '').trim()
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Missing order_id in webhook payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Detect synthetic test events (e.g. from FamGateway dashboard "Test & Verify" button)
    const isTestEvent = Boolean(
      eventPayload?.test === true ||
      eventPayload?.is_test === true ||
      eventPayload?.mode === 'test' ||
      String(eventPayload?.event || '').toLowerCase().includes('test') ||
      orderId.toUpperCase().startsWith('TEST-') ||
      orderId.toUpperCase().startsWith('TEST_') ||
      /^TEST[-_]/i.test(orderId)
    )

    const utr = String(eventPayload?.utr || '').trim()
    const paidAmount = parseFloat(eventPayload?.amount || '0')
    const eventStatus = String(eventPayload?.status || '').toLowerCase()

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 6. Idempotency Check in public.famgateway_webhook_events
    const { data: existingEvent, error: checkErr } = await supabaseAdmin
      .from('famgateway_webhook_events')
      .select('id, order_id, status')
      .eq('order_id', orderId)
      .maybeSingle()

    if (checkErr) {
      console.warn('[famgateway-webhook] Error checking idempotency event:', checkErr.message)
    }

    if (existingEvent) {
      console.log(`[famgateway-webhook] Idempotent duplicate event for order: ${orderId}. Returning 200 OK.`)
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Event already processed (idempotent replay)',
          order_id: orderId,
          test_mode: isTestEvent,
          status: isTestEvent ? 'TEST_ACKNOWLEDGED' : (existingEvent.status || 'PROCESSED'),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let processingStatus = 'PROCESSED'
    let processingError: string | null = null

    // 7. Locate tournament payment record
    const { data: tp, error: tpErr } = await supabaseAdmin
      .from('tournament_payments')
      .select('id, tournament_id, user_id, amount, status, provider_order_id, registration_id')
      .eq('provider_order_id', orderId)
      .maybeSingle()

    if (tpErr) {
      console.error('[famgateway-webhook] Error querying tournament_payments:', tpErr)
    }

    if (!tp) {
      if (isTestEvent) {
        console.log(`[famgateway-webhook] Provider synthetic test event verified for order: ${orderId}.`)
        processingStatus = 'IGNORED'
        processingError = null
      } else {
        console.warn(`[famgateway-webhook] Order ${orderId} does not match any MJ ESPORTS payment record.`)
        processingStatus = 'IGNORED'
        processingError = 'Unknown payment order reference'
      }
    } else {
      // Validate payment status
      if (eventStatus === 'paid' || eventStatus === 'success') {
        // Amount check
        if (paidAmount > 0 && paidAmount < Number(tp.amount)) {
          processingStatus = 'FAILED'
          processingError = `Amount mismatch: expected ₹${tp.amount}, received ₹${paidAmount}`
        } else if (tp.status === 'CONSUMED') {
          console.log(`[famgateway-webhook] Payment ${tp.id} already consumed for registration ${tp.registration_id}.`)
        } else {
          // Update to VERIFIED if PENDING
          const nowIso = new Date().toISOString()
          const { error: updateErr } = await supabaseAdmin
            .from('tournament_payments')
            .update({
              status: 'VERIFIED',
              provider_payment_id: utr || orderId,
              verified_at: nowIso,
              updated_at: nowIso,
            })
            .eq('id', tp.id)

          if (updateErr) {
            processingStatus = 'FAILED'
            processingError = `Failed to update payment status to VERIFIED: ${updateErr.message}`
          } else {
            // Trigger headless registration recovery if player disconnected
            const { data: recoveryRes, error: recoveryErr } = await supabaseAdmin.rpc(
              'recover_tournament_registration_from_payment',
              { p_payment_id: tp.id }
            )

            if (recoveryErr) {
              console.warn('[famgateway-webhook] Registration recovery RPC notice:', recoveryErr.message)
            } else {
              console.log('[famgateway-webhook] Headless registration recovery result:', recoveryRes)
            }
          }
        }
      } else {
        console.log(`[famgateway-webhook] Ignored non-success event status: ${eventStatus}`)
        processingStatus = 'IGNORED'
      }
    }

    // 8. Record audit log in public.famgateway_webhook_events
    // Table status check constraint requires: status IN ('PROCESSED', 'IGNORED', 'FAILED')
    try {
      const { error: insertErr } = await supabaseAdmin
        .from('famgateway_webhook_events')
        .upsert(
          {
            order_id: orderId,
            event_type: eventPayload?.event || (isTestEvent ? 'provider.test' : 'payment.success'),
            utr: utr || null,
            amount: isNaN(paidAmount) ? null : paidAmount,
            payload: eventPayload,
            status: processingStatus,
            error_message: processingError,
            processed_at: new Date().toISOString(),
          },
          { onConflict: 'order_id' }
        )

      if (insertErr) {
        console.error('[famgateway-webhook] Failed to write audit event log:', insertErr)
      }
    } catch (logErr: any) {
      console.error('[famgateway-webhook] Exception writing audit event log:', logErr)
    }

    if (processingStatus === 'FAILED') {
      return new Response(
        JSON.stringify({ error: processingError || 'Webhook processing failed', order_id: orderId }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (isTestEvent && !tp) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Test webhook event acknowledged successfully',
          test_mode: true,
          order_id: orderId,
          status: 'TEST_ACKNOWLEDGED',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!tp) {
      return new Response(
        JSON.stringify({
          success: false,
          ignored: true,
          message: 'Order reference not found in payment records',
          order_id: orderId,
          status: 'IGNORED',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, order_id: orderId, status: processingStatus }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (fatalErr: any) {
    console.error('[famgateway-webhook] Fatal unhandled exception:', fatalErr)
    return new Response(
      JSON.stringify({
        error: 'Webhook processing encountered an internal error',
        message: fatalErr?.message || String(fatalErr),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
