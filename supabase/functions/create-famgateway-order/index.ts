// Supabase Edge Function: create-famgateway-order
// Authoritative creation of FamGateway API v2 orders for tournament entry fees

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
    const famgatewayEnabled = (Deno.env.get('FAMGATEWAY_ENABLED') || 'false').trim().toLowerCase() === 'true'

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

    const { tournament_id, registration_data } = body

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

    // Check if user is already registered for this tournament
    const { data: existingReg } = await supabaseAdmin
      .from('tournament_registrations')
      .select('id, status')
      .eq('tournament_id', tournament_id)
      .eq('user_id', user.id)
      .neq('status', 'Rejected')
      .maybeSingle()

    if (existingReg) {
      return new Response(
        JSON.stringify({ error: 'You have already registered for this tournament' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Authoritatively compute required entry fee (Never trust frontend amount)
    const rawFee = String(tournament.entry_fee || 'Free').trim()
    const digits = rawFee.replace(/[^0-9.]/g, '')
    const numericFee = rawFee.toLowerCase() === 'free' || !digits ? 0 : parseFloat(digits)

    if (numericFee <= 0) {
      return new Response(
        JSON.stringify({ error: 'This tournament is free. No payment order required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Compliance & Activation check
    if (!famgatewayEnabled) {
      return new Response(
        JSON.stringify({
          error: 'Payment gateway integration is currently undergoing compliance review. Please use wallet balance or contact support.',
          error_code: 'GATEWAY_COMPLIANCE_DISABLED',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const idempotencyKey = `fg_${user.id.replace(/-/g, '').slice(0, 8)}_${Date.now()}`

    // 6. Check for active unexpired PENDING order for this user & tournament (< 10 minutes old)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: activePending } = await supabaseAdmin
      .from('tournament_payments')
      .select('id, provider, provider_order_id, amount, currency, status, metadata, created_at')
      .eq('tournament_id', tournament.id)
      .eq('user_id', user.id)
      .eq('provider', 'FAMGATEWAY')
      .eq('status', 'PENDING')
      .gte('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false })
      .maybeSingle()

    if (activePending && activePending.provider_order_id) {
      const meta = activePending.metadata || {}
      return new Response(
        JSON.stringify({
          success: true,
          order_id: activePending.provider_order_id,
          payment_record_id: activePending.id,
          amount: activePending.amount,
          payable_amount: meta.payable_amount || activePending.amount,
          currency: activePending.currency || 'INR',
          upi_intent: meta.upi_intent || null,
          qr_url: meta.qr_url || null,
          checkout_url: meta.checkout_url || null,
          idempotent_replay: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Call FamGateway API v2: POST /api/create-order.php (per official support specification)
    let orderId: string
    let payableAmount: number = numericFee
    let upiIntent: string | null = null
    let qrUrl: string | null = null
    let checkoutUrl: string | null = null
    let expiresAt: string | null = null

    if (famgatewayApiKey) {
      const cleanPhone = String(registration_data?.whatsappNumber || '').replace(/[^0-9]/g, '').slice(-10)
      const cleanName = String(registration_data?.captainName || registration_data?.name || user.email?.split('@')[0] || 'MJ Player').slice(0, 60)
      const cleanEmail = String(registration_data?.email || user.email || '').trim().slice(0, 100)

      // Support confirmed redirect_url configuration with URL validation
      const famgatewayRedirectEnv = (Deno.env.get('FAMGATEWAY_REDIRECT_URL') || '').trim()
      const requestOrigin = (req.headers.get('origin') || req.headers.get('referer') || '').trim()

      let redirectUrl = `https://mjesports.in/tournaments/${encodeURIComponent(String(tournament_id))}`
      const candidateRedirect = famgatewayRedirectEnv || requestOrigin
      if (candidateRedirect) {
        try {
          const parsed = new URL(candidateRedirect)
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            if (parsed.pathname && parsed.pathname !== '/') {
              redirectUrl = parsed.toString()
            } else {
              redirectUrl = `${parsed.origin}/tournaments/${encodeURIComponent(String(tournament_id))}`
            }
          }
        } catch {
          // fallback remains valid URL
        }
      }
      try {
        new URL(redirectUrl)
      } catch {
        redirectUrl = 'https://mjesports.in/tournaments'
      }

      // Support confirmed webhook_url pointing to authoritative Supabase famgateway-webhook Edge Function
      let webhookUrl = ''
      if (supabaseUrl) {
        try {
          const parsedWebhook = new URL(`${supabaseUrl.replace(/\/+$/, '')}/functions/v1/famgateway-webhook`)
          if (parsedWebhook.protocol === 'http:' || parsedWebhook.protocol === 'https:') {
            webhookUrl = parsedWebhook.toString()
          }
        } catch {
          webhookUrl = ''
        }
      }

      // Support confirmed JSON payload structure: api_key, amount, customer_name, customer_email, customer_phone, redirect_url, webhook_url
      const fgPayload: Record<string, any> = {
        api_key: famgatewayApiKey,
        amount: numericFee,
        customer_name: cleanName,
        customer_email: cleanEmail,
        redirect_url: redirectUrl,
      }
      if (cleanPhone.length === 10) {
        fgPayload.customer_phone = cleanPhone
      }
      if (webhookUrl) {
        fgPayload.webhook_url = webhookUrl
      }

      // Endpoint resolution: default to create-order.php per official support confirmation,
      // while preserving configurability via FAMGATEWAY_API_URL
      let orderEndpoint = `${famgatewayApiUrl.replace(/\/+$/, '')}/create-order.php`
      if (famgatewayApiUrl.endsWith('/create-order.php') || famgatewayApiUrl.endsWith('/create-order')) {
        orderEndpoint = famgatewayApiUrl
      }

      const fgRes = await fetch(orderEndpoint, {
        method: 'POST',
        headers: {
          'X-Api-Key': famgatewayApiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'MJ-Esports-Backend/1.0',
        },
        body: JSON.stringify(fgPayload),
      })

      if (!fgRes.ok) {
        let rawErrorText = ''
        let upstreamMessage = 'Gateway rejected order request'
        try {
          rawErrorText = await fgRes.text()
          const parsed = JSON.parse(rawErrorText)
          upstreamMessage = parsed.message || parsed.error || parsed.status || rawErrorText
        } catch {
          upstreamMessage = rawErrorText.slice(0, 200) || 'Unknown gateway error'
        }

        // Sanitize sensitive credentials, authorization headers, emails, and phone numbers
        const sanitizedMsg = String(upstreamMessage)
          .replace(/(?:key|token|secret|authorization|bearer)[=:\s"]+[^",\s\}]+/gi, '[REDACTED_CREDENTIAL]')
          .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[REDACTED_EMAIL]')
          .replace(/\b\d{10,12}\b/g, '[REDACTED_PHONE]')
          .slice(0, 250)

        // Log upstream HTTP status and sanitized message (zero PII, zero keys)
        console.error(`[create-famgateway-order] Upstream FamGateway error [HTTP ${fgRes.status}]: ${sanitizedMsg}`)

        // Map upstream HTTP status to safe frontend error code and message
        let errorCode = 'GATEWAY_ERROR'
        let userMessage = 'Failed to initialize payment session with gateway'

        if (fgRes.status === 401) {
          errorCode = 'GATEWAY_AUTH_ERROR'
          userMessage = 'Payment gateway authentication failed. Please contact support or use another payment method.'
        } else if (fgRes.status === 403) {
          const isMerchantRestricted = /(inactive|restricted|suspended|merchant)/i.test(upstreamMessage)
          if (isMerchantRestricted) {
            errorCode = 'GATEWAY_MERCHANT_RESTRICTED'
            userMessage = 'Payment gateway merchant account is currently inactive or restricted.'
          } else {
            errorCode = 'GATEWAY_ACCESS_DENIED'
            userMessage = 'Payment gateway access denied. Please contact support or use another payment method.'
          }
        } else if (fgRes.status === 400) {
          errorCode = 'GATEWAY_INVALID_REQUEST'
          userMessage = 'Payment gateway rejected order parameters.'
        } else if (fgRes.status === 429) {
          errorCode = 'GATEWAY_RATE_LIMITED'
          userMessage = 'Payment gateway rate limit reached. Please try again in a few moments.'
        } else if (fgRes.status >= 500) {
          errorCode = 'GATEWAY_UPSTREAM_UNAVAILABLE'
          userMessage = 'Payment gateway service is currently unavailable. Please try again later.'
        }

        return new Response(
          JSON.stringify({
            error: userMessage,
            error_code: errorCode,
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let fgData: any = {}
      try {
        fgData = await fgRes.json()
      } catch {
        console.error('[create-famgateway-order] Gateway returned non-JSON response')
        return new Response(
          JSON.stringify({
            error: 'Gateway returned non-JSON response',
            error_code: 'GATEWAY_MALFORMED_RESPONSE',
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const orderData = fgData?.data || fgData

      orderId = orderData.order_id
      if (!orderId) {
        console.error('[create-famgateway-order] Gateway response missing order_id')
        return new Response(
          JSON.stringify({
            error: 'Gateway returned empty order reference',
            error_code: 'GATEWAY_EMPTY_ORDER_ID',
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      payableAmount = orderData.payable_amount ? parseFloat(orderData.payable_amount) : numericFee
      upiIntent = orderData.upi_intent || null
      qrUrl = orderData.qr_url || null
      checkoutUrl = orderData.checkout_url || null
      expiresAt = orderData.expires_at_ist || null
    } else {
      // Mock order fallback for local testing when keys are not configured
      orderId = `ORD_MOCK_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`
      upiIntent = `upi://pay?pa=mjesports@fam&pn=MJ+ESPORTS&tr=${orderId}&tn=Entry+Fee+${tournament.title}&am=${numericFee.toFixed(2)}&cu=INR`
      checkoutUrl = `https://famgateway.in/pay.php?order_id=${orderId}`
      qrUrl = `https://famgateway.in/api/qr-image.php?order_id=${orderId}`
    }

    // 8. Record PENDING transaction in public.tournament_payments
    const { data: paymentRecord, error: insertError } = await supabaseAdmin
      .from('tournament_payments')
      .insert({
        tournament_id: tournament.id,
        user_id: user.id,
        provider: 'FAMGATEWAY',
        provider_order_id: orderId,
        amount: numericFee,
        currency: 'INR',
        status: 'PENDING',
        idempotency_key: idempotencyKey,
        metadata: {
          payable_amount: payableAmount,
          upi_intent: upiIntent,
          qr_url: qrUrl,
          checkout_url: checkoutUrl,
          expires_at_ist: expiresAt,
          registration_data: registration_data || {},
          source: 'create-famgateway-order',
        },
      })
      .select('id, provider, provider_order_id, amount, currency, status')
      .single()

    if (insertError) {
      console.error('[Database tournament_payments Insertion Error]:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to record pending payment record in database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderId,
        payment_record_id: paymentRecord.id,
        amount: numericFee,
        payable_amount: payableAmount,
        currency: 'INR',
        upi_intent: upiIntent,
        qr_url: qrUrl,
        checkout_url: checkoutUrl,
        expires_at: expiresAt,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('[create-famgateway-order Exception]:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
