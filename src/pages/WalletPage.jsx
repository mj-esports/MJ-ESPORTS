import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Wallet,
  ArrowUpRight,
  PlusCircle,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  X
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { fetchWalletTransactions, depositMoney, requestWithdrawal } from '../services/walletService'

export default function WalletPage() {
  const { user } = useAuth()
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
          category:
            t.type === 'Prize Credit'
              ? 'PRIZE'
              : t.type === 'Entry Fee Debit'
              ? 'ENTRY_FEE'
              : t.type === 'Deposit'
              ? 'DEPOSIT'
              : t.type === 'Withdrawal'
              ? 'WITHDRAWAL'
              : 'REFUND',
          amount: amt,
          status: t.status || 'Completed',
          date: new Date(t.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          time: new Date(t.created_at).toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
          }),
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

  // Handle Add Money / Deposit via Secure RPC
  const handleDepositSubmit = async (e) => {
    e.preventDefault()
    const num = parseFloat(amountInput)
    if (isNaN(num) || num <= 0) {
      showError('Please enter a valid amount to deposit.', 'Invalid Amount')
      return
    }

    try {
      if (user?.id) {
        const res = await depositMoney({
          amount: num,
          paymentMethod: paymentMethod,
        })
        if (res && res.success === false) {
          throw new Error(res.message || 'Deposit processing failed.')
        }
      }

      showSuccess('Wallet Updated', 'Deposit Successful')
      setIsDepositModalOpen(false)
      setAmountInput('')
      await syncWalletData()
    } catch (err) {
      showError(err.message || 'Deposit Failed', 'Deposit Failed')
    }
  }

  // Handle Withdrawal Request via Secure RPC
  const handleWithdrawSubmit = async (e) => {
    e.preventDefault()
    const num = parseFloat(amountInput)
    if (isNaN(num) || num <= 0) {
      showError('Please enter a valid withdrawal amount.', 'Invalid Amount')
      return
    }

    try {
      if (user?.id) {
        const res = await requestWithdrawal({
          amount: num,
          payoutDetails: `Bank Payout (${upiIdInput || 'UPI Transfer'})`,
        })
        if (res && res.success === false) {
          throw new Error(res.message || 'Withdrawal processing failed.')
        }
      }

      showSuccess('Payment Submitted', 'Payout Request Pending')
      setIsWithdrawModalOpen(false)
      setAmountInput('')
      setUpiIdInput('')
      await syncWalletData()
    } catch (err) {
      showError(err.message || 'Withdrawal Failed', 'Withdrawal Failed')
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
    <div className="bg-[#131314] text-[#b9cacb] font-body min-h-screen pb-28 sm:pb-32 antialiased text-xs overflow-x-hidden">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6 sm:space-y-8">

        {/* 1. WALLET HERO HEADER & QUICK ACTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">

          {/* Available Balance Hero Card (Compact Mobile Layout) */}
          <div className="lg:col-span-7 bg-[#141416] rounded border border-[#27272a] p-5 sm:p-6 md:p-8 relative overflow-hidden shadow-xl flex flex-col justify-between group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00f2ff]/5 rounded-full blur-3xl pointer-events-none -z-10"></div>

            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-headline font-bold text-[#00f2ff] uppercase tracking-wider bg-[#00f2ff]/10 px-2.5 sm:px-3 py-1 rounded border border-[#00f2ff]/20">
                  <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>Available Balance</span>
                </div>
                <button
                  onClick={handleRefreshBalance}
                  disabled={isRefreshing}
                  className="p-2 rounded bg-[#1c1b1c] border border-[#27272a] text-[#849495] hover:text-[#00f2ff] hover:border-[#00f2ff]/40 transition-all cursor-pointer disabled:opacity-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title="Synchronize Wallet Balance"
                >
                  <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-headline tracking-tight text-white block leading-tight">
                  ₹{Number(userWalletBalance).toFixed(2)}
                </span>
                <span className="text-[10px] sm:text-xs text-[#849495] block uppercase font-label-bold tracking-wider">
                  INR Wallet Balance
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-5 sm:mt-6">
              <button
                onClick={() => setIsDepositModalOpen(true)}
                className="py-3 bg-[#00f2ff] hover:bg-[#74f5ff] text-[#00363a] font-headline font-bold uppercase tracking-wider rounded text-xs sm:text-sm transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] flex items-center justify-center gap-1.5 sm:gap-2 min-h-[44px] cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
                <span>Add Cash</span>
              </button>

              <button
                onClick={() => setIsWithdrawModalOpen(true)}
                className="py-3 bg-[#1c1b1c] hover:bg-[#201f20] text-[#e5e2e3] hover:text-[#00f2ff] border border-[#27272a] hover:border-[#00f2ff]/40 font-headline font-bold uppercase tracking-wider rounded text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 min-h-[44px] cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
                <span>Withdraw</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Summary Widget (Responsive 2-col mobile, 4-col desktop layout) */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-[#141416] border border-[#27272a] rounded p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-[10px] text-[#849495] uppercase font-label-bold tracking-wider">Total Winnings</span>
              <div className="space-y-0.5 mt-2">
                <span className="text-base sm:text-lg md:text-xl font-bold font-headline text-[#fed83a] block">
                  ₹{walletStats.totalWinnings.toFixed(2)}
                </span>
                <span className="text-[9px] text-[#849495] uppercase block">All-time earnings</span>
              </div>
            </div>

            <div className="bg-[#141416] border border-[#27272a] rounded p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-[10px] text-[#849495] uppercase font-label-bold tracking-wider">Deposited Funds</span>
              <div className="space-y-0.5 mt-2">
                <span className="text-base sm:text-lg md:text-xl font-bold font-headline text-white block">
                  ₹{walletStats.totalDeposits.toFixed(2)}
                </span>
                <span className="text-[9px] text-[#849495] uppercase block">Total loaded money</span>
              </div>
            </div>

            <div className="bg-[#141416] border border-[#27272a] rounded p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-[10px] text-[#849495] uppercase font-label-bold tracking-wider">Entry Fees Paid</span>
              <div className="space-y-0.5 mt-2">
                <span className="text-base sm:text-lg md:text-xl font-bold font-headline text-[#ef4444] block">
                  ₹{walletStats.totalEntryFees.toFixed(2)}
                </span>
                <span className="text-[9px] text-[#849495] uppercase block">Tournament entries</span>
              </div>
            </div>

            <div className="bg-[#141416] border border-[#27272a] rounded p-4 sm:p-5 flex flex-col justify-between">
              <span className="text-[10px] text-[#849495] uppercase font-label-bold tracking-wider">Pending Withdrawal</span>
              <div className="space-y-0.5 mt-2">
                <span className="text-base sm:text-lg md:text-xl font-bold font-headline text-[#ff5e07] block">
                  ₹{walletStats.pendingWithdrawals.toFixed(2)}
                </span>
                <span className="text-[9px] text-[#849495] uppercase block">Awaiting bank sync</span>
              </div>
            </div>
          </div>

        </div>

        {/* 2. TRANSACTION STATEMENT TABLE */}
        <section className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <h2 className="font-headline text-lg sm:text-xl font-extrabold tracking-tight text-white uppercase">
              Electronic Transaction Statement
            </h2>

            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-[#849495] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search transaction ID..."
                  className="w-full bg-[#141416] border border-[#27272a] rounded pl-9 pr-4 py-2 text-xs text-white placeholder-[#849495] focus:border-[#00f2ff] focus:outline-none transition-colors h-[40px] font-body"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#849495] shrink-0" />
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="bg-[#141416] border border-[#27272a] rounded px-3 py-2 text-xs text-[#e5e2e3] focus:border-[#00f2ff] focus:outline-none h-[40px] font-headline uppercase font-bold cursor-pointer w-full sm:w-auto"
                >
                  <option value="ALL">All Statement Types</option>
                  <option value="DEPOSITS">Deposits Only</option>
                  <option value="WITHDRAWALS">Withdrawals Only</option>
                  <option value="ENTRY_FEES">Entry Fees Only</option>
                  <option value="PRIZE">Winnings Only</option>
                  <option value="REFUNDS">Refunds Only</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-[#141416] border border-[#27272a] rounded overflow-hidden shadow-xl">
            {transactions.length === 0 ? (
              <div className="py-10 sm:py-12 text-center border border-[#27272a] bg-[#141416] rounded p-6 space-y-2.5">
                <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-[#849495] mx-auto opacity-60" />
                <p className="text-xs sm:text-sm font-bold text-white uppercase font-headline">No wallet transactions yet.</p>
                <p className="text-[11px] text-[#849495] font-body max-w-sm mx-auto">
                  Your electronic deposit & tournament payment statement is currently empty.
                </p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-10 sm:py-12 text-center border border-[#27272a] bg-[#141416] rounded p-6 space-y-2.5">
                <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-[#849495] mx-auto opacity-60" />
                <p className="text-xs sm:text-sm font-bold text-white uppercase font-headline">No Matches Found</p>
                <p className="text-[11px] text-[#849495] font-body max-w-sm mx-auto">
                  No statements match the active search and category filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse text-xs table-fixed sm:table-auto">
                  <thead>
                    <tr className="border-b border-[#27272a] bg-[#1c1b1c] text-[#849495] text-[10px] font-headline uppercase font-bold tracking-wider">
                      <th className="py-3.5 sm:py-4 px-3 sm:px-6">Transaction Detail / Reference</th>
                      <th className="py-3.5 sm:py-4 px-3 sm:px-6 hidden sm:table-cell">Date / Timestamp</th>
                      <th className="py-3.5 sm:py-4 px-3 sm:px-6">Category</th>
                      <th className="py-3.5 sm:py-4 px-3 sm:px-6">Status</th>
                      <th className="py-3.5 sm:py-4 px-3 sm:px-6 text-right pr-3 sm:pr-6">Ledger Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272a]">
                    {filteredTransactions.map((tx) => {
                      const isPositive = tx.amount >= 0
                      const isPending = tx.status === 'Pending'
                      const isFailed = tx.status === 'Failed' || tx.status === 'Cancelled'

                      return (
                        <tr key={tx.id} className="hover:bg-[#201f20] transition-colors">
                          <td className="py-3.5 sm:py-4 px-3 sm:px-6 min-w-0 max-w-[180px] sm:max-w-[280px]">
                            <span className="font-bold text-white block truncate font-headline text-xs" title={tx.tournament}>
                              {tx.tournament}
                            </span>
                            <span className="text-[10px] text-[#849495] block font-mono truncate" title={`ID: ${tx.id} • ${tx.type}`}>
                              ID: {tx.id} &bull; {tx.type}
                            </span>
                            <span className="text-[10px] text-[#849495] block font-mono sm:hidden mt-0.5">
                              {tx.date} {tx.time}
                            </span>
                          </td>
                          <td className="py-3.5 sm:py-4 px-3 sm:px-6 hidden sm:table-cell">
                            <span className="block text-[#e5e2e3]">{tx.date}</span>
                            <span className="text-[10px] text-[#849495] block font-mono">
                              {tx.time}
                            </span>
                          </td>
                          <td className="py-3.5 sm:py-4 px-3 sm:px-6">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold font-headline uppercase tracking-wider whitespace-nowrap ${
                                tx.category === 'DEPOSIT'
                                  ? 'bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30'
                                  : tx.category === 'WITHDRAWAL'
                                  ? 'bg-[#ff5e07]/10 text-[#ff5e07] border border-[#ff5e07]/30'
                                  : tx.category === 'ENTRY_FEE'
                                  ? 'bg-red-950/40 text-red-400 border border-red-900/40'
                                  : 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30'
                              }`}
                            >
                              {tx.category}
                            </span>
                          </td>
                          <td className="py-3.5 sm:py-4 px-3 sm:px-6">
                            <span
                              className={`flex items-center gap-1.5 whitespace-nowrap ${
                                isPending
                                  ? 'text-[#ff5e07]'
                                  : isFailed
                                  ? 'text-red-500'
                                  : 'text-[#10b981]'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isPending
                                    ? 'bg-[#ff5e07] animate-pulse'
                                    : isFailed
                                    ? 'bg-red-500'
                                    : 'bg-[#10b981]'
                                }`}
                              ></span>
                              <span className="font-bold uppercase text-[10px] font-headline">{tx.status}</span>
                            </span>
                          </td>
                          <td
                            className={`py-3.5 sm:py-4 px-3 sm:px-6 text-right pr-3 sm:pr-6 font-bold text-xs sm:text-sm font-headline whitespace-nowrap ${
                              isPositive ? 'text-[#10b981]' : 'text-red-400'
                            }`}
                          >
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#141416] border border-[#27272a] rounded p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsDepositModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-[#849495] hover:text-white rounded bg-[#1c1b1c] border border-[#27272a] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-headline text-lg font-extrabold text-white uppercase tracking-wider">
              Add Instant Funds
            </h3>
            <p className="text-[#849495] text-xs font-body">
              Enter cash payload to load money into your esports wallet ledger.
            </p>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#849495] font-label-bold mb-1.5">
                  Amount to Add (INR)
                </label>
                <input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="e.g. 500"
                  required
                  className="w-full bg-[#1c1b1c] border border-[#27272a] rounded px-4 py-2.5 text-xs text-white focus:border-[#00f2ff] focus:outline-none font-body"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-[#849495] font-label-bold mb-1.5">
                  Payment Gateway Option
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI')}
                    className={`py-2 text-[10px] font-bold uppercase rounded border transition-all cursor-pointer font-headline ${
                      paymentMethod === 'UPI'
                        ? 'bg-[#00f2ff]/10 border-[#00f2ff] text-[#00f2ff]'
                        : 'bg-[#1c1b1c] border-[#27272a] text-[#849495] hover:text-white'
                    }`}
                  >
                    UPI / QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={`py-2 text-[10px] font-bold uppercase rounded border transition-all cursor-pointer font-headline ${
                      paymentMethod === 'CARD'
                        ? 'bg-[#00f2ff]/10 border-[#00f2ff] text-[#00f2ff]'
                        : 'bg-[#1c1b1c] border-[#27272a] text-[#849495] hover:text-white'
                    }`}
                  >
                    Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('NETBANK')}
                    className={`py-2 text-[10px] font-bold uppercase rounded border transition-all cursor-pointer font-headline ${
                      paymentMethod === 'NETBANK'
                        ? 'bg-[#00f2ff]/10 border-[#00f2ff] text-[#00f2ff]'
                        : 'bg-[#1c1b1c] border-[#27272a] text-[#849495] hover:text-white'
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
                  className="flex-1 py-2.5 bg-[#1c1b1c] border border-[#27272a] hover:border-red-500 hover:text-red-400 rounded text-xs font-bold uppercase font-headline transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#00f2ff] hover:bg-[#74f5ff] text-[#00363a] rounded text-xs font-bold uppercase font-headline transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#141416] border border-[#27272a] rounded p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsWithdrawModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-[#849495] hover:text-white rounded bg-[#1c1b1c] border border-[#27272a] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-headline text-lg font-extrabold text-white uppercase tracking-wider">
              Withdrawal Request
            </h3>
            <p className="text-[#849495] text-xs font-body">
              Request immediate bank payout settlement. Minimum amount ₹100.
            </p>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#849495] font-label-bold mb-1.5">
                  Withdrawal Amount (INR)
                </label>
                <input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="e.g. 1000"
                  required
                  className="w-full bg-[#1c1b1c] border border-[#27272a] rounded px-4 py-2.5 text-xs text-white focus:border-[#00f2ff] focus:outline-none font-body"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-[#849495] font-label-bold mb-1.5">
                  UPI ID (Virtual Payment Address)
                </label>
                <input
                  type="text"
                  value={upiIdInput}
                  onChange={(e) => setUpiIdInput(e.target.value)}
                  placeholder="username@okhdfcbank or 9876543210@ybl"
                  required
                  className="w-full bg-[#1c1b1c] border border-[#27272a] rounded px-4 py-2.5 text-xs text-white focus:border-[#00f2ff] focus:outline-none font-body"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#1c1b1c] border border-[#27272a] hover:border-red-500 hover:text-red-400 rounded text-xs font-bold uppercase font-headline transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#00f2ff] hover:bg-[#74f5ff] text-[#00363a] rounded text-xs font-bold uppercase font-headline transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] cursor-pointer"
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

