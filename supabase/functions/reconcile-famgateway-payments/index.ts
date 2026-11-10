// Supabase Edge Function: reconcile-famgateway-payments
// Secure background & cron reconciliation worker for stale PENDING FamGateway payment orders

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  const runId = `rec_${Date.now()}`

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const famgatewayApiKey = (Deno.env.get('FAMGATEWAY_API_KEY') || '').trim()
    const famgatewayApiUrl = (Deno.env.get('FAMGATEWAY_API_URL') || 'https://famgateway.in/api').trim()
    const famgatewayEnabled = (Deno.env.get('FAMGATEWAY_ENABLED') || 'false').trim().toLowerCase() === 'true'

    // 1. Authenticate caller strictly (service_role or authenticated Admin)
    const authHeader = req.headers.get('Authorization') || ''
    const isServiceRole = authHeader.includes(supabaseServiceKey) && supabaseServiceKey.length > 0

    let isAuthorized = isServiceRole

    if (!isAuthorized && authHeader) {
      const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: { user } } = await supabaseUserClient.auth.getUser()
      if (user) {
        // Verify admin status strictly from public.user_roles schema
        const supabaseAdminCheck = createClient(supabaseUrl, supabaseServiceKey)
        const { data: roleRecord, error: roleError } = await supabaseAdminCheck
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!roleError && roleRecord) {
          const role = String(roleRecord.role || '').toLowerCase().trim()
          const ADMIN_ROLES = ['admin', 'super_admin', 'owner']
          if (ADMIN_ROLES.includes(role)) {
            isAuthorized = true
          }
        }
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Reconciliation execution restricted to service_role or admin.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!famgatewayEnabled || !famgatewayApiKey) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'FamGateway integration is not enabled or API key is not configured. Reconciliation skipped.',
          famgateway_enabled: famgatewayEnabled,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Identify stale PENDING orders:
    // Orders between 5 minutes old (let client/webhook finish) and 24 hours old.
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: staleOrders, error: fetchError } = await supabaseAdmin
      .from('tournament_payments')
      .select('id, tournament_id, user_id, amount, currency, status, provider, provider_order_id, created_at, metadata')
      .eq('provider', 'FAMGATEWAY')
      .eq('status', 'PENDING')
      .lte('created_at', fiveMinutesAgo)
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: true })
      .limit(20)

    if (fetchError) {
      console.error(`[${runId}] Error fetching stale pending orders:`, fetchError)
      return new Response(
        JSON.stringify({ error: 'Database query error', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const orderList = staleOrders || []
    console.log(`[${runId}] Discovered ${orderList.length} stale PENDING FamGateway order(s) to reconcile.`)

    let verifiedCount = 0
    let recoveredCount = 0
    let capacityRefundedCount = 0
    let failedCount = 0
    let stillPendingCount = 0
    const auditLogs: any[] = []

    for (const order of orderList) {
      const orderId = order.provider_order_id
      if (!orderId) {
        continue
      }

      try {
        // 3. Query official FamGateway verification endpoint
        const verifyRes = await fetch(
          `${famgatewayApiUrl}/verify-order.php?order_id=${encodeURIComponent(orderId)}`,
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
          console.warn(`[${runId}] Gateway HTTP ${verifyRes.status} for order: ${orderId}`)
          auditLogs.push({ order_id: orderId, action: 'SKIPPED_HTTP_ERROR', status_code: verifyRes.status })
          continue
        }

        const verifyData = await verifyRes.json()
        const dataObj = (typeof verifyData?.data === 'object' && verifyData?.data !== null) ? verifyData.data : {}
        const gatewayStatus = String(verifyData?.status || '').toLowerCase()

        // Extract UTR from data.utr first, then root utr, then data.transaction_id, then root transaction_id, then orderId
        const utr = String(
          dataObj.utr ||
          verifyData.utr ||
          dataObj.transaction_id ||
          verifyData.transaction_id ||
          orderId
        ).trim()

        if (gatewayStatus === 'success' || gatewayStatus === 'paid') {
          const rawAmount = verifyData?.amount ?? dataObj?.amount

          // 1. Reject missing or empty amounts
          if (rawAmount === undefined || rawAmount === null || rawAmount === '') {
            console.warn(`[${runId}] Missing payment amount for order ${orderId}`)
            auditLogs.push({ order_id: orderId, action: 'FLAGGED_INVALID_AMOUNT', reason: 'MISSING_AMOUNT' })
            continue
          }

          const paidAmount = Number(rawAmount)
          const expectedDbAmount = Number(order.amount)

          // 2. Reject non-finite, NaN, zero, or negative amounts
          if (!Number.isFinite(paidAmount) || isNaN(paidAmount) || paidAmount <= 0) {
            console.warn(`[${runId}] Non-finite or non-positive amount for order ${orderId}: ${rawAmount}`)
            auditLogs.push({ order_id: orderId, action: 'FLAGGED_INVALID_AMOUNT', reason: 'NON_FINITE_OR_NEGATIVE', received: rawAmount })
            continue
          }

          // 3. Convert both verified and expected amounts into integer paise
          const paidPaise = Math.round(paidAmount * 100)
          const expectedPaise = Math.round(expectedDbAmount * 100)

          // 4. Require exact equality. Reject both underpayment and overpayment.
          if (paidPaise !== expectedPaise) {
            console.warn(`[${runId}] Amount mismatch for order ${orderId}: expected ₹${expectedDbAmount.toFixed(2)}, received ₹${paidAmount.toFixed(2)}`)
            auditLogs.push({
              order_id: orderId,
              action: 'FLAGGED_AMOUNT_MISMATCH',
              expected: expectedDbAmount,
              received: paidAmount,
              is_underpayment: paidPaise < expectedPaise,
            })
            continue
          }

          // Atomically update payment to VERIFIED
          const nowIso = new Date().toISOString()
          const { error: updateErr } = await supabaseAdmin
            .from('tournament_payments')
            .update({
              status: 'VERIFIED',
              provider_payment_id: utr,
              verified_at: nowIso,
              updated_at: nowIso,
              metadata: {
                ...(order.metadata || {}),
                reconciled_by: runId,
                reconciled_at: nowIso,
                reconciled_gateway_status: gatewayStatus,
                reconciled_amount: paidAmount,
                reconciled_utr: utr,
              },
            })
            .eq('id', order.id)
            .eq('status', 'PENDING') // Concurrency guard

          if (updateErr) {
            console.error(`[${runId}] Failed to update payment ${order.id} to VERIFIED:`, updateErr)
            continue
          }

          verifiedCount++

          // Attempt Headless Registration Recovery
          const { data: recoveryRes, error: recoveryErr } = await supabaseAdmin.rpc(
            'recover_tournament_registration_from_payment',
            { p_payment_id: order.id }
          )

          if (recoveryErr) {
            console.error(`[${runId}] Recovery RPC error for order ${orderId}:`, recoveryErr)
            auditLogs.push({ order_id: orderId, action: 'VERIFIED_RECOVERY_RPC_ERROR', error: recoveryErr.message })
          } else if (recoveryRes?.error_code === 'TOURNAMENT_FULL_REFUNDED') {
            capacityRefundedCount++
            auditLogs.push({ order_id: orderId, action: 'CAPACITY_FULL_REFUNDED_TO_WALLET', refund_res: recoveryRes })
          } else if (recoveryRes?.recovered) {
            recoveredCount++
            auditLogs.push({ order_id: orderId, action: 'RECOVERED_REGISTRATION', registration_id: recoveryRes.registration_id })
          } else {
            auditLogs.push({ order_id: orderId, action: 'VERIFIED_AWAITING_REGISTRATION', recovery_res: recoveryRes })
          }
        } else if (gatewayStatus === 'expired' || gatewayStatus === 'failed') {
          // Mark as FAILED in database
          await supabaseAdmin
            .from('tournament_payments')
            .update({
              status: 'FAILED',
              updated_at: new Date().toISOString(),
              metadata: {
                ...(order.metadata || {}),
                reconciled_by: runId,
                reconciled_at: new Date().toISOString(),
                reconciled_gateway_status: gatewayStatus,
              },
            })
            .eq('id', order.id)
            .eq('status', 'PENDING')

          failedCount++
          auditLogs.push({ order_id: orderId, action: 'MARKED_FAILED', gateway_status: gatewayStatus })
        } else {
          // Still pending at gateway. Check if order is past 15 min TTL
          const orderAgeMs = Date.now() - new Date(order.created_at).getTime()
          if (orderAgeMs > 15 * 60 * 1000) {
            await supabaseAdmin
              .from('tournament_payments')
              .update({
                status: 'FAILED',
                updated_at: new Date().toISOString(),
                metadata: {
                  ...(order.metadata || {}),
                  reconciled_by: runId,
                  reconciled_at: new Date().toISOString(),
                  reconciled_reason: 'ORDER_TTL_EXPIRED',
                },
              })
              .eq('id', order.id)
              .eq('status', 'PENDING')

            failedCount++
            auditLogs.push({ order_id: orderId, action: 'MARKED_EXPIRED_TTL' })
          } else {
            stillPendingCount++
            auditLogs.push({ order_id: orderId, action: 'STILL_PENDING' })
          }
        }
      } catch (orderEx: any) {
        console.error(`[${runId}] Exception reconciling order ${orderId}:`, orderEx)
        auditLogs.push({ order_id: orderId, action: 'EXCEPTION', error: orderEx.message })
      }
    }

    const durationMs = Date.now() - startTime

    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        duration_ms: durationMs,
        summary: {
          scanned: orderList.length,
          verified: verifiedCount,
          recovered: recoveredCount,
          capacity_refunded_to_wallet: capacityRefundedCount,
          failed_or_expired: failedCount,
          still_pending: stillPendingCount,
        },
        audit_logs: auditLogs,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error(`[${runId}] Fatal reconciliation exception:`, err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error', run_id: runId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

