import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Wallet,
  ArrowUpRight,
  PlusCircle,
  RefreshCw,
  Search,
  Filter,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { fetchWalletTransactions, addWalletTransaction } from '../services/walletService'

export default function WalletPage() {
  const { user, updateProfile } = useAuth()
  const { showSuccess, showError } = useToast()

  const [activeFilter, setActiveFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [amountInput, setAmountInput] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('UPI')
  const [upiIdInput, setUpiIdInput] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [transactions, setTransactions] = useState([])

  // Wallet stats derived from real database transactions
  const [walletStats, setWalletStats] = useState({
    totalWinnings: 0.0,
    totalDeposits: 0.0,
    totalEntryFees: 0.0,
    pendingWithdrawals: 0.0,
    monthlyEarnings: 0.0,
    monthlySpending: 0.0,
  })

  const userWalletBalance = user?.user_metadata?.wallet_balance ?? 0.0

  const syncWalletData = useCallback(async () => {
    if (!user?.id) return
    setIsRefreshing(true)
    try {
      const data = await fetchWalletTransactions(user.id)
      const mapped = (data || []).map((t) => {
        const isDebit = t.type === 'Entry Fee Debit' || t.type === 'Withdrawal'
        const amt = isDebit ? -Math.abs(Number(t.amount)) : Math.abs(Number(t.amount))
        return {
          id: t.id,
          tournament: t.description || 'Transaction Log',
          type: t.type,
          category: t.type === 'Prize Credit' ? 'PRIZE' : t.type === 'Entry Fee Debit' ? 'ENTRY_FEE' : t.type === 'Deposit' ? 'DEPOSIT' : t.type === 'Withdrawal' ? 'WITHDRAWAL' : 'REFUND',
          amount: amt,
          status: t.status || 'Completed',
          date: new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
          time: new Date(t.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
        }
      })
      setTransactions(mapped)

      // Calculate aggregated metrics
      let winnings = 0
      let deposits = 0
      let entryFees = 0
      let pending = 0
      let spend = 0
      let earn = 0

      mapped.forEach((t) => {
        const amt = Math.abs(t.amount)
        if (t.type === 'Prize Credit') {
          winnings += amt
          earn += amt
        } else if (t.type === 'Deposit') {
          deposits += amt
        } else if (t.type === 'Entry Fee Debit') {
          entryFees += amt
          spend += amt
        } else if (t.type === 'Withdrawal') {
          if (t.status === 'Pending') {
            pending += amt
          }
        }
      })

      setWalletStats({
        totalWinnings: winnings,
        totalDeposits: deposits,
        totalEntryFees: entryFees,
        pendingWithdrawals: pending,
        monthlyEarnings: earn,
        monthlySpending: spend,
      })
    } catch (err) {
      console.warn('[Wallet page sync warning]:', err)
    } finally {
      setIsRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => {
    syncWalletData()
  }, [syncWalletData])

  const handleRefreshBalance = () => {
    syncWalletData()
  }

  // Handle Add Money / Deposit
  const handleDepositSubmit = async (e) => {
    e.preventDefault()
    const num = parseFloat(amountInput)
    if (isNaN(num) || num <= 0) {
      showError('Please enter a valid amount to deposit.', 'Invalid Amount')
      return
    }

    try {
      const newBal = userWalletBalance + num
      
      if (user?.id) {
        // Insert transaction record
        await addWalletTransaction({
          userId: user.id,
          type: 'Deposit',
          amount: num,
          description: `Instant Add Money via ${paymentMethod}`
        })
        // Update user profile balance
        await updateProfile({ wallet_balance: newBal })
      }

      showSuccess('Wallet Updated', 'Deposit Successful')
      setIsDepositModalOpen(false)
      setAmountInput('')
    } catch (err) {
      showError(err.message, 'Deposit Failed')
    }
  }

  // Handle Withdrawal Request
  const handleWithdrawSubmit = async (e) => {
    e.preventDefault()
    const num = parseFloat(amountInput)
    if (isNaN(num) || num <= 0) {
      showError('Please enter a valid withdrawal amount.', 'Invalid Amount')
      return
    }
    if (num > userWalletBalance) {
      showError('Insufficient wallet balance for this withdrawal.', 'Low Balance')
      return
    }

    try {
      const newBal = userWalletBalance - num

      if (user?.id) {
        // Insert transaction record
        await addWalletTransaction({
          userId: user.id,
          type: 'Withdrawal',
          amount: num,
          description: `Bank Payout (${upiIdInput || 'UPI Transfer'})`
        })
        // Update user profile balance
        await updateProfile({ wallet_balance: newBal })
      }

      showSuccess('Payment Submitted', 'Payout Pending')
      setIsWithdrawModalOpen(false)
      setAmountInput('')
      setUpiIdInput('')
    } catch (err) {
      showError(err.message, 'Withdrawal Failed')
    }
  }

  // Filter & Search Transaction Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (activeFilter === 'DEPOSITS' && t.category !== 'DEPOSIT') return false
      if (activeFilter === 'WITHDRAWALS' && t.category !== 'WITHDRAWAL') return false
      if (activeFilter === 'ENTRY_FEES' && t.category !== 'ENTRY_FEE') return false
      if (activeFilter === 'PRIZE' && t.category !== 'PRIZE') return false
      if (activeFilter === 'REFUNDS' && t.category !== 'REFUND') return false

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        return (
          t.id.toLowerCase().includes(query) ||
          t.tournament.toLowerCase().includes(query) ||
          t.type.toLowerCase().includes(query)
        )
      }
      return true
    })
  }, [transactions, activeFilter, searchQuery])

  return (
    <div className="bg-[#09090b] text-[#f8fafc] font-body min-h-screen pb-20 antialiased font-mono text-xs">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-10">

        {/* 1. WALLET HERO HEADER & QUICK ACTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Available Balance Hero Card */}
          <div className="lg:col-span-7 bg-[#18181b]/60 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-[#00f2ff]/30 relative overflow-hidden shadow-[0_0_35px_-10px_rgba(34,211,238,0.25)] flex flex-col justify-between group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00f2ff]/10 rounded-full blur-3xl transform-gpu pointer-events-none -z-10"></div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs font-headline font-bold text-[#00f2ff] uppercase tracking-wider bg-[#00f2ff]/10 px-3 py-1 rounded-full border border-[#00f2ff]/20">
                  <Wallet className="w-4 h-4" />
                  <span>Available Balance</span>
                </div>
                <button
                  onClick={handleRefreshBalance}
                  disabled={isRefreshing}
                  className="p-2 rounded-xl bg-[#09090b]/80 border border-white/5 text-[#a1a1aa] hover:text-[#00f2ff] transition-all cursor-pointer disabled:opacity-50"
                  title="Synchronize Wallet Balance"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-4xl sm:text-5xl font-black font-headline tracking-tight text-white block">
                  ₹{Number(userWalletBalance).toFixed(2)}
                </span>
                <span className="text-[10px] text-[#a1a1aa] block uppercase">
                  Secure Electronic Esports Deposit Ledger &bull; INR
                </span>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setIsDepositModalOpen(true)}
                className="flex-1 py-3 bg-[#00f2ff] hover:bg-cyan-300 text-black font-headline font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
              >
                <PlusCircle className="w-4.5 h-4.5" />
                <span>Add Cash</span>
              </button>

              <button
                onClick={() => setIsWithdrawModalOpen(true)}
                className="flex-1 py-3 bg-[#18181b] hover:bg-[#09090b] text-[#00f2ff] hover:text-white border border-[#27272a] hover:border-[#00f2ff]/30 font-headline font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
              >
                <ArrowUpRight className="w-4.5 h-4.5" />
                <span>Withdraw</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Summary Widget */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-4">
            <div className="bg-[#18181b]/60 border border-[#27272a] rounded-2xl p-5 space-y-1 flex flex-col justify-between">
              <span className="text-[9px] text-[#a1a1aa] uppercase font-bold">Total Winnings</span>
              <div className="space-y-0.5">
                <span className="text-lg font-black font-headline text-[#fbbf24] block">
                  ₹{walletStats.totalWinnings.toFixed(2)}
                </span>
                <span className="text-[8.5px] text-[#a1a1aa] uppercase block">All-time earnings</span>
              </div>
            </div>

            <div className="bg-[#18181b]/60 border border-[#27272a] rounded-2xl p-5 space-y-1 flex flex-col justify-between">
              <span className="text-[9px] text-[#a1a1aa] uppercase font-bold">Deposited Funds</span>
              <div className="space-y-0.5">
                <span className="text-lg font-black font-headline text-white block">
                  ₹{walletStats.totalDeposits.toFixed(2)}
                </span>
                <span className="text-[8.5px] text-[#a1a1aa] uppercase block">Total loaded money</span>
              </div>
            </div>

            <div className="bg-[#18181b]/60 border border-[#27272a] rounded-2xl p-5 space-y-1 flex flex-col justify-between">
              <span className="text-[9px] text-[#a1a1aa] uppercase font-bold">Entry Fees Paid</span>
              <div className="space-y-0.5">
                <span className="text-lg font-black font-headline text-red-400 block">
                  ₹{walletStats.totalEntryFees.toFixed(2)}
                </span>
                <span className="text-[8.5px] text-[#a1a1aa] uppercase block">Tournament entries</span>
              </div>
            </div>

            <div className="bg-[#18181b]/60 border border-[#27272a] rounded-2xl p-5 space-y-1 flex flex-col justify-between">
              <span className="text-[9px] text-[#a1a1aa] uppercase font-bold">Pending Withdrawal</span>
              <div className="space-y-0.5">
                <span className="text-lg font-black font-headline text-[#fe6b00] block">
                  ₹{walletStats.pendingWithdrawals.toFixed(2)}
                </span>
                <span className="text-[8.5px] text-[#a1a1aa] uppercase block">Awaiting bank sync</span>
              </div>
            </div>
          </div>

        </div>

        {/* 2. TRANSACTION STATEMENT TABLE */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="font-headline text-xl font-bold tracking-tight text-white uppercase">
              Electronic Transaction Statement
            </h2>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-[#a1a1aa] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search transaction ID..."
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-[#a1a1aa] focus:border-[#00f2ff] focus:outline-none transition-colors h-[38px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#a1a1aa]" />
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-[#00f2ff] focus:outline-none h-[38px] font-mono"
                >
                  <option value="ALL">All statement types</option>
                  <option value="DEPOSITS">Deposits Only</option>
                  <option value="WITHDRAWALS">Withdrawals Only</option>
                  <option value="ENTRY_FEES">Entry Fees Only</option>
                  <option value="PRIZE">Winnings Only</option>
                  <option value="REFUNDS">Refunds Only</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-[#18181b]/60 border border-[#27272a] rounded-2xl overflow-hidden shadow-xl">
            {transactions.length === 0 ? (
              <div className="py-16 text-center border border-[#27272a]/60 bg-[#0A0A0A]/30 rounded-xl p-6 space-y-3 font-sans">
                <AlertCircle className="w-10 h-10 text-[#a1a1aa] mx-auto opacity-50" />
                <p className="text-xs font-bold text-white uppercase">No wallet transactions yet.</p>
                <p className="text-[10px] text-[#a1a1aa]">
                  Your electronic deposit & tournament payment statement is currently empty.
                </p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-16 text-center border border-[#27272a]/60 bg-[#0A0A0A]/30 rounded-xl p-6 space-y-3 font-sans">
                <AlertCircle className="w-10 h-10 text-[#a1a1aa] mx-auto opacity-50" />
                <p className="text-xs font-bold text-white uppercase">No Matches Found</p>
                <p className="text-[10px] text-[#a1a1aa]">
                  No statements match the active search and category filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="border-b border-[#27272a] bg-[#18181b]/80 text-[#a1a1aa] text-[10px] uppercase font-bold">
                      <th className="py-4 px-6">Transaction Detail / Reference</th>
                      <th className="py-4 px-6">Date / Timestamp</th>
                      <th className="py-4 px-6">Category</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right pr-6">Ledger Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272a]/40">
                    {filteredTransactions.map((tx) => {
                      const isPositive = tx.amount >= 0
                      const isPending = tx.status === 'Pending'
                      const isFailed = tx.status === 'Failed' || tx.status === 'Cancelled'

                      return (
                        <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6">
                            <span className="font-bold text-white block truncate max-w-[280px]">
                              {tx.tournament}
                            </span>
                            <span className="text-[10px] text-[#a1a1aa] block font-mono">
                              ID: {tx.id} &bull; {tx.type}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="block text-white">{tx.date}</span>
                            <span className="text-[10px] text-[#a1a1aa] block font-mono">
                              {tx.time}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider ${
                              tx.category === 'DEPOSIT'
                                ? 'bg-cyan-950 text-[#00f2ff]'
                                : tx.category === 'WITHDRAWAL'
                                ? 'bg-orange-950/40 text-[#fe6b00]'
                                : tx.category === 'ENTRY_FEE'
                                ? 'bg-red-950/40 text-red-400'
                                : 'bg-[#00ff9d]/10 text-[#00ff9d]'
                            }`}>
                              {tx.category}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`flex items-center gap-1.5 ${
                              isPending
                                ? 'text-[#fe6b00]'
                                : isFailed
                                ? 'text-red-500'
                                : 'text-[#00ff9d]'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                isPending
                                  ? 'bg-[#fe6b00] animate-pulse'
                                  : isFailed
                                  ? 'bg-red-500'
                                  : 'bg-[#00ff9d]'
                              }`}></span>
                              <span className="font-bold uppercase text-[10px]">{tx.status}</span>
                            </span>
                          </td>
                          <td className={`py-4 px-6 text-right pr-6 font-bold text-sm font-sans ${
                            isPositive ? 'text-[#00ff9d]' : 'text-red-400'
                          }`}>
                            {isPositive ? '+' : ''}₹{Math.abs(tx.amount).toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

      </main>

      {/* 3. ADD MONEY DEPOSIT MODAL */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0A0A0A] border border-[#27272a] rounded-2xl p-6 space-y-4 shadow-2xl relative">
            <h3 className="font-headline text-lg font-black text-white uppercase tracking-wider">
              Add Instant Funds
            </h3>
            <p className="text-[#a1a1aa] text-xs font-sans">
              Enter cash payload to load money into your esports wallet ledger.
            </p>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#a1a1aa] mb-1.5">
                  Amount to Add (INR)
                </label>
                <input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="e.g. 500"
                  required
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-3 text-xs text-white focus:border-[#00f2ff] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-[#a1a1aa] mb-1.5">
                  Payment Gateway Option
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI')}
                    className={`py-2 text-[10px] font-bold uppercase rounded-lg border transition-all ${
                      paymentMethod === 'UPI' ? 'bg-[#00f2ff]/10 border-[#00f2ff] text-[#00f2ff]' : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa]'
                    }`}
                  >
                    UPI / QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={`py-2 text-[10px] font-bold uppercase rounded-lg border transition-all ${
                      paymentMethod === 'CARD' ? 'bg-[#00f2ff]/10 border-[#00f2ff] text-[#00f2ff]' : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa]'
                    }`}
                  >
                    Credit Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('NETBANK')}
                    className={`py-2 text-[10px] font-bold uppercase rounded-lg border transition-all ${
                      paymentMethod === 'NETBANK' ? 'bg-[#00f2ff]/10 border-[#00f2ff] text-[#00f2ff]' : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa]'
                    }`}
                  >
                    NetBanking
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="flex-1 py-3 bg-[#18181b] border border-[#27272a] hover:border-red-500 hover:text-red-500 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#00f2ff] hover:bg-cyan-300 text-black rounded-xl text-xs font-bold uppercase transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)]"
                >
                  Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. WITHDRAW CASH STATEMENT MODAL */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0A0A0A] border border-[#27272a] rounded-2xl p-6 space-y-4 shadow-2xl relative">
            <h3 className="font-headline text-lg font-black text-white uppercase tracking-wider">
              Payout Payout Request
            </h3>
            <p className="text-[#a1a1aa] text-xs font-sans">
              Request immediate bank payout settlement. Limit minimum ₹100.
            </p>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#a1a1aa] mb-1.5">
                  Withdrawal Amount (INR)
                </label>
                <input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="e.g. 1000"
                  required
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-3 text-xs text-white focus:border-[#00f2ff] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-[#a1a1aa] mb-1.5">
                  UPI ID (Virtual Payment Address)
                </label>
                <input
                  type="text"
                  value={upiIdInput}
                  onChange={(e) => setUpiIdInput(e.target.value)}
                  placeholder="username@okicici or 9876543210@ybl"
                  required
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-xl px-4 py-3 text-xs text-white focus:border-[#00f2ff] focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-3 bg-[#18181b] border border-[#27272a] hover:border-red-500 hover:text-red-500 rounded-xl text-xs font-bold uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#00f2ff] hover:bg-cyan-300 text-black rounded-xl text-xs font-bold uppercase transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)]"
                >
                  Withdraw
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
