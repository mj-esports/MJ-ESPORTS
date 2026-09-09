import { supabase, isSupabaseConfigured } from '../lib/supabase.js'

// Phase 9.4: Shared Authoritative Wallet Balance Event Bus
let cachedAuthoritativeBalance = null
const balanceListeners = new Set()

export function getAuthoritativeWalletBalance() {
  return cachedAuthoritativeBalance
}

export function subscribeToWalletBalance(callback) {
  if (typeof callback === 'function') {
    balanceListeners.add(callback)
    if (cachedAuthoritativeBalance !== null) {
      try {
        callback(cachedAuthoritativeBalance)
      } catch (err) {
        console.warn('[walletService] listener callback error:', err)
      }
    }
  }
  return () => {
    balanceListeners.delete(callback)
  }
}

export function notifyWalletBalanceUpdated(newBalance) {
  const numeric = typeof newBalance === 'number' ? newBalance : Number(newBalance || 0)
  cachedAuthoritativeBalance = numeric
  balanceListeners.forEach((listener) => {
    try {
      listener(numeric)
    } catch (err) {
      console.warn('[walletService] listener dispatch error:', err)
    }
  })
}

/**
 * Phase 9.1: Fetch or initialize user wallet via secure RPC
 * Authoritative source of wallet balance (PostgreSQL wallets table)
 */
export async function fetchUserWallet() {
  if (!isSupabaseConfigured) {
    return { success: false, error_code: 'NOT_CONFIGURED', message: 'Supabase is not configured.' }
  }

  try {
    const { data, error } = await supabase.rpc('get_or_create_wallet')
    if (error) {
      console.warn('[walletService] get_or_create_wallet RPC warning:', error.message)
      return { success: false, error_code: error.code || 'RPC_ERROR', message: error.message }
    }
    if (data?.success && data?.wallet) {
      const balance = Number(data.wallet.balance || 0.0)
      notifyWalletBalanceUpdated(balance)
    }
    return data || { success: false, error_code: 'NO_DATA', message: 'No wallet data returned.' }
  } catch (err) {
    console.warn('[walletService] fetchUserWallet exception:', err.message)
    return { success: false, error_code: 'EXCEPTION', message: err.message }
  }
}

/**
 * Phase 9.1: Fetch immutable wallet ledger entries for authenticated user
 * Supports optional pagination (limit, offset) and optional transaction filtering
 */
export async function fetchWalletLedger({
  limit = 50,
  offset = 0,
  userId = null,
  transactionType = null,
  direction = null,
} = {}) {
  if (!isSupabaseConfigured) return []
  try {
    let query = supabase
      .from('wallet_ledger')
      .select('*')
      .order('created_at', { ascending: false })

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (transactionType) {
      query = query.eq('transaction_type', transactionType)
    }

    if (direction) {
      query = query.eq('direction', direction)
    }

    if (limit !== null && limit !== undefined) {
      const from = Number(offset || 0)
      const to = from + Number(limit) - 1
      query = query.range(from, to)
    }

    const { data, error } = await query

    if (error) {
      console.warn('[walletService] fetchWalletLedger warning:', error.message)
      return []
    }
    return data || []
  } catch (err) {
    console.warn('[walletService] fetchWalletLedger exception:', err.message)
    return []
  }
}

/**
 * Phase 2: Fetches ALL confirmed PRIZE_CREDIT ledger entries for the authenticated player
 * Uses paginated batching to guarantee 100% complete traversal without arbitrary limits.
 */
export async function fetchAllUserPrizeCredits(userId) {
  if (!isSupabaseConfigured || !userId) return []
  try {
    let allPrizeCredits = []
    let offset = 0
    const batchSize = 1000
    let hasMore = true

    while (hasMore) {
      const batch = await fetchWalletLedger({
        limit: batchSize,
        offset: offset,
        userId: userId,
        transactionType: 'PRIZE_CREDIT',
        direction: 'CREDIT',
      })

      if (Array.isArray(batch) && batch.length > 0) {
        allPrizeCredits = allPrizeCredits.concat(batch)
        if (batch.length < batchSize) {
          hasMore = false
        } else {
          offset += batchSize
        }
      } else {
        hasMore = false
      }
    }

    return allPrizeCredits
  } catch (err) {
    console.warn('[walletService] fetchAllUserPrizeCredits exception:', err.message)
    return []
  }
}

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
 * Phase 9.2: Generates a unique client idempotency key for top-up attempts
 */
export function generateTopupIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'topup-req-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 11)
}

/**
 * Phase 9.3: Generates a standard client-generated UUID v4 idempotency key
 * for wallet-funded tournament registration.
 */
export function generateWalletRegistrationIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // RFC 4122 compliant fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * Phase 9.2: Create Razorpay order for wallet top-up via authoritative Edge Function
 */
export async function createWalletTopupOrder(amount, clientIdempotencyKey) {
  if (!isSupabaseConfigured) {
    return { success: false, error_code: 'NOT_CONFIGURED', message: 'Supabase is not configured.' }
  }

  try {
    const { data, error } = await supabase.functions.invoke('create-wallet-topup-order', {
      body: {
        amount,
        client_idempotency_key: clientIdempotencyKey,
      },
    })

    if (error) {
      console.error('[walletService] create-wallet-topup-order error:', error)
      return { success: false, message: error.message || 'Failed to create top-up order.' }
    }

    return data || { success: false, message: 'No response data from server.' }
  } catch (err) {
    console.error('[walletService] createWalletTopupOrder exception:', err)
    return { success: false, message: err.message || 'Unexpected error creating top-up order.' }
  }
}

/**
 * Phase 9.2: Verify Razorpay payment signature and execute atomic settlement via Edge Function
 */
export async function verifyWalletTopup({ orderId, paymentId, signature }) {
  if (!isSupabaseConfigured) {
    return { success: false, error_code: 'NOT_CONFIGURED', message: 'Supabase is not configured.' }
  }

  try {
    const { data, error } = await supabase.functions.invoke('verify-wallet-topup', {
      body: {
        order_id: orderId,
        payment_id: paymentId,
        signature: signature,
      },
    })

    if (error) {
      console.error('[walletService] verify-wallet-topup error:', error)
      return { success: false, message: error.message || 'Payment verification failed.' }
    }

    if (data?.success && data?.balance_after !== undefined) {
      notifyWalletBalanceUpdated(Number(data.balance_after))
    }

    return data || { success: false, message: 'No verification response data from server.' }
  } catch (err) {
    console.error('[walletService] verifyWalletTopup exception:', err)
    return { success: false, message: err.message || 'Unexpected error verifying top-up.' }
  }
}

/**
 * Secure Deposit RPC Call (Legacy/Manual)
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
