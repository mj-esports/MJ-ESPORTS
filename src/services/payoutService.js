import { supabase, isSupabaseConfigured } from '../lib/supabase'

/**
 * Check if current user possesses 'owner' role via RPC or user_roles query
 */
export async function checkIsOwner() {
  if (!isSupabaseConfigured) return false
  try {
    const { data, error } = await supabase.rpc('is_owner')
    if (error) {
      const { data: session } = await supabase.auth.getSession()
      const userId = session?.session?.user?.id
      if (!userId) return false
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single()
      return roleRow?.role === 'owner'
    }
    return Boolean(data)
  } catch (err) {
    console.warn('[payoutService] checkIsOwner warning:', err)
    return false
  }
}

/**
 * Direct RPC verification for Phase 5.1-A Owner Authentication
 * Authoritative: browser Supabase session -> supabase.auth.getSession() -> supabase.rpc('is_owner')
 */
export async function verifyOwnerSessionRPC() {
  if (!isSupabaseConfigured) {
    return {
      isLoading: false,
      isAuthenticated: false,
      authenticatedUserEmail: 'Supabase Not Configured',
      authenticatedUserId: 'N/A',
      isOwnerRpcResult: false,
      sessionError: null,
      rpcError: 'Supabase client is not configured',
      error: 'Supabase client is not configured',
    }
  }

  try {
    // 1. Obtain current authenticated Supabase session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    const user = sessionData?.session?.user

    if (sessionError) {
      return {
        isLoading: false,
        isAuthenticated: false,
        authenticatedUserEmail: 'Session Error',
        authenticatedUserId: 'N/A',
        isOwnerRpcResult: false,
        sessionError: sessionError.message,
        rpcError: null,
        error: sessionError.message,
      }
    }

    if (!user) {
      return {
        isLoading: false,
        isAuthenticated: false,
        authenticatedUserEmail: 'No active session (Unauthenticated)',
        authenticatedUserId: 'N/A',
        isOwnerRpcResult: false,
        sessionError: null,
        rpcError: null,
        error: null,
      }
    }

    // 2. Call the zero-parameter authoritative database RPC
    const { data: isOwnerBool, error: ownerError } = await supabase.rpc('is_owner')

    return {
      isLoading: false,
      isAuthenticated: true,
      authenticatedUserEmail: user.email || 'N/A',
      authenticatedUserId: user.id || 'N/A',
      isOwnerRpcResult: Boolean(isOwnerBool),
      sessionError: null,
      rpcError: ownerError ? ownerError.message : null,
      error: ownerError ? ownerError.message : null,
    }
  } catch (err) {
    return {
      isLoading: false,
      isAuthenticated: false,
      authenticatedUserEmail: 'Verification Exception',
      authenticatedUserId: 'N/A',
      isOwnerRpcResult: false,
      sessionError: null,
      rpcError: err.message,
      error: err.message,
    }
  }
}

/**
 * Fetch all payout queue records from public.payout_queue
 */
export async function fetchPayoutQueue() {
  if (!isSupabaseConfigured) return []
  try {
    const { data, error } = await supabase
      .from('payout_queue')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[payoutService] fetchPayoutQueue warning:', error.message)
      return []
    }
    return data || []
  } catch (err) {
    console.error('[payoutService] fetchPayoutQueue exception:', err)
    return []
  }
}

/**
 * Fetch all payout approval requests from public.payout_approval_requests
 */
export async function fetchPayoutApprovalRequests() {
  if (!isSupabaseConfigured) return []
  try {
    const { data, error } = await supabase
      .from('payout_approval_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[payoutService] fetchPayoutApprovalRequests warning:', error.message)
      return []
    }
    return data || []
  } catch (err) {
    console.error('[payoutService] fetchPayoutApprovalRequests exception:', err)
    return []
  }
}

/**
 * Create a Payout Queue Entry from a Verified Result (RPC call)
 */
export async function createPayoutProposal({
  tournamentId,
  sourceResultId,
  winnerUserId = null,
  winnerGameUid = null,
  winnerGameIgn,
  rank = 1,
  payoutAmount,
  idempotencyKey = null,
}) {
  if (!isSupabaseConfigured) {
    return { success: false, error_code: 'NOT_CONFIGURED', message: 'Supabase is not configured.' }
  }

  try {
    const { data, error } = await supabase.rpc('create_payout_queue_from_verified_result', {
      p_tournament_id: tournamentId,
      p_source_result_id: sourceResultId,
      p_winner_user_id: winnerUserId,
      p_winner_game_uid: winnerGameUid,
      p_winner_game_ign: winnerGameIgn,
      p_rank: Number(rank),
      p_payout_amount: Number(payoutAmount),
      p_idempotency_key: idempotencyKey,
    })

    if (error) {
      console.error('[payoutService] createPayoutProposal RPC error:', error)
      return { success: false, error_code: error.code || 'RPC_ERROR', message: error.message }
    }

    return data || { success: true }
  } catch (err) {
    console.error('[payoutService] createPayoutProposal exception:', err)
    return { success: false, error_code: 'EXCEPTION', message: err.message }
  }
}

/**
 * Request Owner Approval for a Payout Queue Entry (RPC call)
 */
export async function requestPayoutApproval(payoutQueueId) {
  if (!isSupabaseConfigured) {
    return { success: false, error_code: 'NOT_CONFIGURED', message: 'Supabase is not configured.' }
  }

  try {
    const { data, error } = await supabase.rpc('request_payout_approval', {
      p_payout_queue_id: payoutQueueId,
    })

    if (error) {
      console.error('[payoutService] requestPayoutApproval RPC error:', error)
      return { success: false, error_code: error.code || 'RPC_ERROR', message: error.message }
    }

    return data || { success: true }
  } catch (err) {
    console.error('[payoutService] requestPayoutApproval exception:', err)
    return { success: false, error_code: 'EXCEPTION', message: err.message }
  }
}

/**
 * Approve a Payout Queue Entry (RPC call - EXCLUSIVE TO OWNER)
 */
export async function approvePayoutProposal(payoutQueueId, approvalRequestId = null) {
  if (!isSupabaseConfigured) {
    return { success: false, error_code: 'NOT_CONFIGURED', message: 'Supabase is not configured.' }
  }

  try {
    const { data, error } = await supabase.rpc('approve_payout', {
      p_payout_queue_id: payoutQueueId,
      p_approval_request_id: approvalRequestId,
    })

    if (error) {
      console.error('[payoutService] approvePayoutProposal RPC error:', error)
      return { success: false, error_code: error.code || 'RPC_ERROR', message: error.message }
    }

    return data || { success: true }
  } catch (err) {
    console.error('[payoutService] approvePayoutProposal exception:', err)
    return { success: false, error_code: 'EXCEPTION', message: err.message }
  }
}

/**
 * Reject a Payout Queue Entry (RPC call)
 */
export async function rejectPayoutProposal(payoutQueueId, rejectionReason = 'Rejected by platform owner during review.') {
  if (!isSupabaseConfigured) {
    return { success: false, error_code: 'NOT_CONFIGURED', message: 'Supabase is not configured.' }
  }

  try {
    const { data, error } = await supabase.rpc('reject_payout', {
      p_payout_queue_id: payoutQueueId,
      p_rejection_reason: rejectionReason,
    })

    if (error) {
      console.error('[payoutService] rejectPayoutProposal RPC error:', error)
      return { success: false, error_code: error.code || 'RPC_ERROR', message: error.message }
    }

    return data || { success: true }
  } catch (err) {
    console.error('[payoutService] rejectPayoutProposal exception:', err)
    return { success: false, error_code: 'EXCEPTION', message: err.message }
  }
}
