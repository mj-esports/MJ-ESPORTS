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

const activeTxLocks = new Set()

export async function addWalletTransaction({ userId, type, amount, description, tournamentId }) {
  if (!isSupabaseConfigured || !userId) return null

  const lockKey = `tx_${userId}_${type}_${amount}_${tournamentId || ''}`
  if (activeTxLocks.has(lockKey)) {
    console.warn('[walletService] Duplicate transaction request blocked:', lockKey)
    return null
  }
  activeTxLocks.add(lockKey)

  try {
    const numAmount = Number(amount)
    const { data, error } = await supabase
      .from('wallet_transactions')
      .insert([
        {
          user_id: userId,
          type: type, // 'Entry Fee Debit' | 'Prize Credit' | 'Refund' | 'Bonus Credit' | 'Deposit' | 'Withdrawal'
          amount: numAmount,
          description: description,
          tournament_id: tournamentId || null,
          status: 'Completed',
        },
      ])
      .select('id, user_id, type, amount, description, tournament_id, status, created_at')
      .single()

    if (error) {
      console.error('[walletService] insert error:', error)
      return null
    }

    // Also update public.profiles wallet_balance / earnings if applicable
    const { data: profile } = await supabase
      .from('profiles')
      .select('earnings')
      .eq('id', userId)
      .maybeSingle()

    if (profile && type === 'Prize Credit') {
      const currentEarned = parseFloat(String(profile.earnings || '0').replace(/[^0-9.]/g, '')) || 0
      const newEarned = currentEarned + numAmount
      await supabase
        .from('profiles')
        .update({ earnings: `₹${newEarned.toLocaleString()}` })
        .eq('id', userId)
    }

    return data
  } catch (err) {
    console.error('[walletService] exception:', err)
    return null
  } finally {
    activeTxLocks.delete(lockKey)
  }
}
