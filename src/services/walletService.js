import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

export async function fetchWalletTransactions(userId) {
  if (!isSupabaseConfigured || !userId) return []
  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[walletService] fetch error:', error)
      return []
    }
    return data || []
  } catch (err) {
    console.error('[walletService] exception:', err)
    return []
  }
}

/**
 * Secure Deposit RPC Call
 */
export async function depositMoney({ amount, paymentMethod = 'UPI', gatewayOrderId = null, gatewayPaymentId = null }) {
  if (!isSupabaseConfigured) {
    return { success: false, error_code: 'NOT_CONFIGURED', message: 'Supabase is not configured.' }
  }

  try {
    const { data, error } = await supabase.rpc('process_wallet_deposit', {
      p_amount: Number(amount),
      p_payment_method: paymentMethod,
      p_gateway_order_id: gatewayOrderId,
      p_gateway_payment_id: gatewayPaymentId,
    })

    if (error) {
      console.error('[walletService] deposit RPC error:', error)
      return { success: false, error_code: error.code || 'RPC_ERROR', message: error.message }
    }

    return data || { success: true }
  } catch (err) {
    console.error('[walletService] deposit exception:', err)
    return { success: false, error_code: 'EXCEPTION', message: err.message }
  }
}

/**
 * Secure Withdrawal Request RPC Call
 */
export async function requestWithdrawal({ amount, payoutDetails }) {
  if (!isSupabaseConfigured) {
    return { success: false, error_code: 'NOT_CONFIGURED', message: 'Supabase is not configured.' }
  }

  try {
    const { data, error } = await supabase.rpc('request_wallet_withdrawal', {
      p_amount: Number(amount),
      p_payout_details: payoutDetails || 'Bank Payout Request',
    })

    if (error) {
      console.error('[walletService] withdrawal RPC error:', error)
      return { success: false, error_code: error.code || 'RPC_ERROR', message: error.message }
    }

    return data || { success: true }
  } catch (err) {
    console.error('[walletService] withdrawal exception:', err)
    return { success: false, error_code: 'EXCEPTION', message: err.message }
  }
}

/**
 * Secure Admin Prize Allocation RPC Call
 */
export async function adminAwardPrize({ targetUserId, tournamentId, amount, description }) {
  if (!isSupabaseConfigured) {
    return { success: false, error_code: 'NOT_CONFIGURED', message: 'Supabase is not configured.' }
  }

  try {
    const { data, error } = await supabase.rpc('admin_process_prize_credit', {
      p_target_user_id: targetUserId,
      p_tournament_id: tournamentId,
      p_amount: Number(amount),
      p_description: description || 'Tournament Prize Allocation',
    })

    if (error) {
      console.error('[walletService] prize credit RPC error:', error)
      return { success: false, error_code: error.code || 'RPC_ERROR', message: error.message }
    }

    return data || { success: true }
  } catch (err) {
    console.error('[walletService] prize credit exception:', err)
    return { success: false, error_code: 'EXCEPTION', message: err.message }
  }
}

/**
 * Legacy Adapter: Routes callers to secure RPC implementations
 */
export async function addWalletTransaction({ userId, type, amount, description, tournamentId }) {
  if (type === 'Deposit') {
    return await depositMoney({ amount, paymentMethod: 'UPI' })
  }
  if (type === 'Withdrawal') {
    return await requestWithdrawal({ amount, payoutDetails: description })
  }
  if (type === 'Prize Credit' && tournamentId) {
    return await adminAwardPrize({ targetUserId: userId, tournamentId, amount, description })
  }
  console.warn('[walletService] Direct addWalletTransaction is deprecated. Use secure RPC calls.')
  return null
}
