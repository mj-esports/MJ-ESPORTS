// Supabase Edge Function: razorpay-webhook
// Authoritative server-to-server webhook listener for Razorpay payment recovery (Phase 2)

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
 * Computes HMAC-SHA256 over the raw UTF-8 request body and compares
 * against the provided hex signature in constant time.
 */
async function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string
): Promise<boolean> {
  if (!webhookSecret || !signature || !rawBody) return false
  try {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(webhookSecret.trim())
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
  // 1. Only allow POST requests for webhooks
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 2. Read raw request body as string before any JSON parsing
  let rawBody: string
  try {
    rawBody = await req.text()
  } catch (err) {
    console.error('[razorpay-webhook] Failed to read raw body:', err)
    return new Response(JSON.stringify({ error: 'Failed to read request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 3. Extract signature header
  const signature = req.headers.get('x-razorpay-signature')
  if (!signature) {
    console.warn('[razorpay-webhook] Missing X-Razorpay-Signature header')
    return new Response(JSON.stringify({ error: 'Missing X-Razorpay-Signature header' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 4. Retrieve secret strictly from Edge Function secrets (Do NOT reuse key_secret)
  const webhookSecret = (Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || '').trim()
  if (!webhookSecret) {
    console.error('[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not configured in Supabase Edge Function Secrets')
    return new Response(
      JSON.stringify({ error: 'Webhook processing misconfigured (secret missing)' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 5. Verify signature over raw body in constant time
  const isValidSignature = await verifyWebhookSignature(rawBody, signature, webhookSecret)
  if (!isValidSignature) {
    console.warn('[razorpay-webhook] Cryptographic signature verification failed')
    return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 6. Parse JSON payload only AFTER verified signature
  let eventPayload: any
  try {
    eventPayload = JSON.parse(rawBody)
  } catch (err) {
    console.error('[razorpay-webhook] Invalid JSON payload despite valid signature:', err)
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const eventType = eventPayload?.event
  if (!eventType) {
    return new Response(JSON.stringify({ error: 'Missing event field in webhook payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Determine unique event ID
  const eventId = String(
    eventPayload?.event_id ||
    req.headers.get('x-razorpay-event-id') ||
    `${eventType}_${eventPayload?.payload?.payment?.entity?.id || eventPayload?.payload?.refund?.entity?.id || Date.now()}`
  ).trim()

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  // 7. Idempotency Check: Verify if event has already been processed
  const { data: existingEvent, error: eventCheckErr } = await supabaseAdmin
    .from('razorpay_webhook_events')
    .select('id, event_id, status')
    .eq('event_id', eventId)
    .maybeSingle()

  if (eventCheckErr) {
    console.error('[razorpay-webhook] Error checking idempotency event log:', eventCheckErr)
  }

  if (existingEvent) {
    console.log(`[razorpay-webhook] Idempotent duplicate event received: ${eventId}. Returning 200 OK.`)
    return new Response(
      JSON.stringify({ success: true, message: 'Event already processed (idempotent replay)', event_id: eventId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  let processingStatus = 'PROCESSED'
  let processingError: string | null = null
  let entityType: string | null = null
  let entityId: string | null = null

  try {
    // ------------------------------------------------------------------------
    // EVENT: payment.captured
    // ------------------------------------------------------------------------
    if (eventType === 'payment.captured') {
      const paymentEntity = eventPayload?.payload?.payment?.entity
      if (!paymentEntity) {
        throw new Error('payment.captured event is missing payload.payment.entity')
      }

      const paymentId = String(paymentEntity.id || '').trim()
      const orderId = String(paymentEntity.order_id || '').trim()
      const amountInPaise = Number(paymentEntity.amount)
      const currency = String(paymentEntity.currency || 'INR').toUpperCase()

      if (!paymentId || !orderId) {
        throw new Error('payment.captured is missing required payment id or order id')
      }

      entityId = paymentId

      // Check A: Is this a Wallet Top-up Order?
      const { data: topup, error: topupErr } = await supabaseAdmin
        .from('wallet_topups')
        .select('id, user_id, wallet_id, amount, currency, status, razorpay_order_id, razorpay_payment_id')
        .eq('razorpay_order_id', orderId)
        .maybeSingle()

      if (topupErr) {
        console.error('[razorpay-webhook] Error querying wallet_topups:', topupErr)
      }

      if (topup) {
        entityType = 'wallet_topup'
        console.log(`[razorpay-webhook] Matched wallet top-up order: ${orderId} (Status: ${topup.status})`)

        // Cross-verify authoritative amount
        const expectedPaise = Math.round(Number(topup.amount) * 100)
        if (expectedPaise !== amountInPaise) {
          throw new Error(`Amount mismatch for topup ${topup.id}: expected ${expectedPaise} paise, received ${amountInPaise} paise`)
        }

        if (topup.status === 'COMPLETED') {
          console.log(`[razorpay-webhook] Wallet top-up ${topup.id} was already completed. Idempotent return.`)
        } else if (topup.status === 'PENDING') {
          // Authoritative settlement via stored procedure
          const { data: settleRes, error: settleErr } = await supabaseAdmin.rpc('settle_wallet_topup', {
            p_topup_id: topup.id,
            p_razorpay_payment_id: paymentId,
            p_razorpay_signature: `webhook_verified_${eventId}`,
          })

          if (settleErr || !settleRes?.success) {
            throw new Error(`Failed to settle wallet topup: ${settleErr?.message || settleRes?.message || 'Settlement rejected'}`)
          }
          console.log(`[razorpay-webhook] Successfully settled wallet top-up ${topup.id} via webhook`)
        } else {
          console.warn(`[razorpay-webhook] Top-up ${topup.id} in unexpected status '${topup.status}'. Skipped.`)
        }
      } else {
        // Check B: Is this a Tournament Entry Payment?
        const { data: tournPayment, error: tournErr } = await supabaseAdmin
          .from('tournament_payments')
          .select('id, tournament_id, user_id, amount, currency, status, razorpay_order_id, razorpay_payment_id, registration_id')
          .eq('razorpay_order_id', orderId)
          .maybeSingle()

        if (tournErr) {
          console.error('[razorpay-webhook] Error querying tournament_payments:', tournErr)
        }

        if (tournPayment) {
          entityType = 'tournament_payment'
          console.log(`[razorpay-webhook] Matched tournament payment order: ${orderId} (Status: ${tournPayment.status})`)

          // Cross-verify authoritative amount
          const expectedPaise = Math.round(Number(tournPayment.amount) * 100)
          if (expectedPaise !== amountInPaise) {
            throw new Error(`Amount mismatch for tournament payment ${tournPayment.id}: expected ${expectedPaise} paise, received ${amountInPaise} paise`)
          }

          if (tournPayment.status === 'CONSUMED') {
            console.log(`[razorpay-webhook] Tournament payment ${tournPayment.id} already consumed for registration ${tournPayment.registration_id}. Idempotent return.`)
          } else {
            // Update to VERIFIED if currently PENDING
            if (tournPayment.status === 'PENDING') {
              const nowIso = new Date().toISOString()
              const { error: updateErr } = await supabaseAdmin
                .from('tournament_payments')
                .update({
                  status: 'VERIFIED',
                  razorpay_payment_id: paymentId,
                  verified_at: nowIso,
                  updated_at: nowIso,
                })
                .eq('id', tournPayment.id)

              if (updateErr) {
                throw new Error(`Failed to update tournament payment status to VERIFIED: ${updateErr.message}`)
              }
            }

            // Attempt automated registration recovery if registration data is available
            const { data: recoverRes, error: recoverErr } = await supabaseAdmin.rpc(
              'recover_tournament_registration_from_payment',
              { p_payment_id: tournPayment.id }
            )

            if (recoverErr) {
              console.warn('[razorpay-webhook] Registration recovery RPC warning:', recoverErr.message)
            } else {
              console.log('[razorpay-webhook] Registration recovery result:', recoverRes)
            }
          }
        } else {
          // Neither wallet nor tournament payment matched
          entityType = 'unmatched_order'
          processingStatus = 'IGNORED'
          console.warn(`[razorpay-webhook] payment.captured order ${orderId} not found in MJ ESPORTS database`)
        }
      }
    }
    // ------------------------------------------------------------------------
    // EVENT: refund.processed
    // ------------------------------------------------------------------------
    else if (eventType === 'refund.processed') {
      const refundEntity = eventPayload?.payload?.refund?.entity
      if (refundEntity) {
        const refundId = String(refundEntity.id || '').trim()
        const paymentId = String(refundEntity.payment_id || '').trim()
        entityId = refundId

        // Update tournament payment record if exists
        const { data: tp } = await supabaseAdmin
          .from('tournament_payments')
          .select('id, metadata, status')
          .eq('razorpay_payment_id', paymentId)
          .maybeSingle()

        if (tp) {
          entityType = 'tournament_payment_refund'
          const existingMeta = tp.metadata || {}
          await supabaseAdmin
            .from('tournament_payments')
            .update({
              status: 'REFUNDED',
              updated_at: new Date().toISOString(),
              metadata: {
                ...existingMeta,
                gateway_refund: {
                  refund_id: refundId,
                  amount: refundEntity.amount,
                  status: refundEntity.status,
                  processed_at: new Date().toISOString(),
                },
              },
            })
            .eq('id', tp.id)

          console.log(`[razorpay-webhook] Synchronized gateway refund for tournament payment ${tp.id}`)
        } else {
          entityType = 'unknown_refund'
          processingStatus = 'IGNORED'
        }
      }
    } else {
      // Other unhandled events (e.g. payment.failed, order.paid)
      processingStatus = 'IGNORED'
      console.log(`[razorpay-webhook] Ignored unhandled event type: ${eventType}`)
    }
  } catch (err: any) {
    processingStatus = 'FAILED'
    processingError = err.message || 'Internal processing error'
    console.error('[razorpay-webhook] Event processing exception:', err)
  }

  // 8. Record event in public.razorpay_webhook_events for complete auditability
  await supabaseAdmin
    .from('razorpay_webhook_events')
    .insert({
      event_id: eventId,
      event_type: eventType,
      entity_id: entityId,
      entity_type: entityType,
      payload: eventPayload,
      status: processingStatus,
      error_message: processingError,
      processed_at: new Date().toISOString(),
    })
    .catch((logErr: any) => {
      console.error('[razorpay-webhook] Failed to log event to database:', logErr)
    })

  // If processing failed due to unexpected database error, return 500 to let Razorpay retry
  if (processingStatus === 'FAILED') {
    return new Response(
      JSON.stringify({ error: processingError || 'Webhook processing failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Return success 200 OK
  return new Response(
    JSON.stringify({ success: true, event_id: eventId, status: processingStatus }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
