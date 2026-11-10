/**
 * MJ ESPORTS — Tournament Payment Service
 * Secure client service coordinating FamGateway UPI integration
 * and Supabase server verification.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * ============================================================================
 * FAMGATEWAY API v2 INTEGRATION
 * ============================================================================
 */

/**
 * Authoritatively requests a FamGateway order session from the server.
 * The Edge Function reads the authoritative fee from the database.
 */
export async function createFamgatewayOrder(tournamentId, registrationData = {}) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase client is not configured.')
  }

  // 1. Authoritatively refresh session to obtain a guaranteed fresh access token
  let refreshData
  let refreshError
  try {
    const res = await supabase.auth.refreshSession()
    refreshData = res?.data
    refreshError = res?.error
  } catch (err) {
    refreshError = err
  }

  if (refreshError || !refreshData?.session?.access_token) {
    throw new Error('Your session has expired. Please log in again to continue.')
  }

  const accessToken = refreshData.session.access_token

  // 2. Explicitly attach Bearer token to authorize at Edge API Gateway (Verify JWT ON)
  const { data, error } = await supabase.functions.invoke('create-famgateway-order', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: {
      tournament_id: String(tournamentId),
      registration_data: registrationData,
    },
  })

  if (error) {
    throw new Error(error.message || 'Failed to initialize payment session with server.')
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data
}

/**
 * Submits the order reference to the server for authoritative FamGateway validation.
 * Never relies on client-side success claims.
 */
export async function verifyFamgatewayPayment({ orderId, tournamentId }) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase client is not configured.')
  }

  const { data, error } = await supabase.functions.invoke('verify-famgateway-payment', {
    body: {
      order_id: String(orderId),
      tournament_id: String(tournamentId),
    },
  })

  if (error) {
    throw new Error(error.message || 'Payment verification request failed.')
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data
}

/**
 * Triggers native mobile UPI app intent (PhonePe, Google Pay, Paytm, BHIM).
 * Uses the universal NPCI UPI deep link (upi://pay?...) returned by FamGateway.
 */
export function triggerUpiIntent(upiIntent) {
  if (!upiIntent || typeof upiIntent !== 'string') {
    throw new Error('Invalid UPI intent link.')
  }

  // Open URI on mobile
  if (typeof window !== 'undefined') {
    window.location.href = upiIntent
  }
}

/**
 * Authoritatively requests tournament cancellation and player wallet refunds via RPC.
 * Only callable by administrators or service_role.
 */
export async function cancelTournamentWithRefund(tournamentId, reason = 'Tournament Cancelled by Organizer') {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase client is not configured.')
  }

  const { data, error } = await supabase.rpc('cancel_tournament_and_refund', {
    p_tournament_id: String(tournamentId),
    p_reason: String(reason || 'Tournament Cancelled by Organizer'),
  })

  if (error) {
    throw new Error(error.message || 'Failed to cancel tournament and issue refunds.')
  }

  if (data?.success === false) {
    throw new Error(data.message || 'Failed to cancel tournament.')
  }

  return data
}
