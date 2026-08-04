import { useState, useMemo } from 'react'
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  Building2,
  Smartphone,
  TrendingUp,
  TrendingDown,
  Sparkles,
  ShieldCheck,
  Award,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

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

  // Initial Wallet State & Transactions Data
  const [walletData, setWalletData] = useState({
    balance: user?.user_metadata?.wallet_balance ?? 4850.0,
    totalWinnings: 12400.0,
    totalDeposits: 8000.0,
    totalEntryFees: 2350.0,
    pendingWithdrawals: 1500.0,
    monthlyEarnings: 6500.0,
    monthlySpending: 1250.0,
  })

  const [transactions, setTransactions] = useState([
    {
      id: 'TXN-984712',
      tournament: "Summer Championship '26 - Finals",
      type: 'Prize Winnings',
      category: 'PRIZE',
      amount: 5000.0,
      status: 'Successful',
      date: 'Aug 04, 2026',
      time: '16:45 PM',
    },
    {
      id: 'TXN-874109',
      tournament: 'BGMI Custom Pro League - Round 3',
      type: 'Entry Fee',
      category: 'ENTRY_FEE',
      amount: -250.0,
      status: 'Successful',
      date: 'Aug 03, 2026',
      time: '19:10 PM',
    },
    {
      id: 'TXN-764901',
      tournament: 'Wallet Top Up via UPI GPay',
      type: 'Deposit',
      category: 'DEPOSIT',
      amount: 2000.0,
      status: 'Successful',
      date: 'Aug 01, 2026',
      time: '11:20 AM',
    },
    {
      id: 'TXN-654812',
      tournament: 'Bank Payout Transfer (HDFC Bank)',
      type: 'Withdrawal',
      category: 'WITHDRAWAL',
      amount: -1500.0,
      status: 'Pending',
      date: 'Jul 30, 2026',
      time: '14:30 PM',
    },
    {
      id: 'TXN-543219',
      tournament: 'Free Fire Solo Showdown - Canceled Match',
      type: 'Refund',
      category: 'REFUND',
      amount: 150.0,
      status: 'Successful',
      date: 'Jul 28, 2026',
      time: '18:05 PM',
    },
  ])

  // Filter & Search Transaction Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Filter by Type
      if (activeFilter === 'DEPOSITS' && t.category !== 'DEPOSIT') return false
      if (activeFilter === 'WITHDRAWALS' && t.category !== 'WITHDRAWAL') return false
      if (activeFilter === 'ENTRY_FEES' && t.category !== 'ENTRY_FEE') return false
      if (activeFilter === 'PRIZE' && t.category !== 'PRIZE') return false
      if (activeFilter === 'REFUNDS' && t.category !== 'REFUND') return false

      // Search Query
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

  // Refresh Balance Trigger
  const handleRefreshBalance = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setIsRefreshing(false)
      showSuccess('Wallet balance synchronized with live bank gateway.', 'Refreshed')
    }, 800)
  }

  // Handle Add Money / Deposit
  const handleDepositSubmit = (e) => {
    e.preventDefault()
    const num = parseFloat(amountInput)
    if (isNaN(num) || num <= 0) {
      showError('Please enter a valid amount to deposit.', 'Invalid Amount')
      return
    }

    const newTxn = {
      id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      tournament: `Instant Add Money via ${paymentMethod}`,
      type: 'Deposit',
      category: 'DEPOSIT',
      amount: num,
      status: 'Successful',
      date: 'Just now',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setWalletData((prev) => ({
      ...prev,
      balance: prev.balance + num,
      totalDeposits: prev.totalDeposits + num,
    }))
    setTransactions((prev) => [newTxn, ...prev])
    showSuccess(`₹${num.toLocaleString()} successfully added to wallet!`, 'Deposit Successful')
    setIsDepositModalOpen(false)
    setAmountInput('')
  }

  // Handle Withdrawal Request
  const handleWithdrawSubmit = (e) => {
    e.preventDefault()
    const num = parseFloat(amountInput)
    if (isNaN(num) || num <= 0) {
      showError('Please enter a valid withdrawal amount.', 'Invalid Amount')
      return
    }
    if (num > walletData.balance) {
      showError('Insufficient wallet balance for this withdrawal.', 'Low Balance')
      return
    }

    const newTxn = {
      id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      tournament: `Bank Payout (${upiIdInput || 'UPI Transfer'})`,
      type: 'Withdrawal',
      category: 'WITHDRAWAL',
      amount: -num,
      status: 'Pending',
      date: 'Just now',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setWalletData((prev) => ({
      ...prev,
      balance: prev.balance - num,
      pendingWithdrawals: prev.pendingWithdrawals + num,
    }))
    setTransactions((prev) => [newTxn, ...prev])
    showSuccess(`Withdrawal request of ₹${num.toLocaleString()} submitted.`, 'Payout Pending')
    setIsWithdrawModalOpen(false)
    setAmountInput('')
    setUpiIdInput('')
  }

  return (
    <div className="bg-[#09090b] text-[#f8fafc] font-body min-h-screen pb-20 antialiased">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-10">

        {/* 1. WALLET HERO HEADER & QUICK ACTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Available Balance Hero Card (Spans 7 cols) */}
          <div className="lg:col-span-7 bg-[#18181b]/60 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-[#00f2ff]/30 relative overflow-hidden shadow-[0_0_35px_-10px_rgba(34,211,238,0.25)] flex flex-col justify-between group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00f2ff]/10 rounded-full blur-3xl pointer-events-none"></div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs font-headline font-bold text-[#00f2ff] uppercase tracking-wider bg-[#00f2ff]/10 px-3 py-1 rounded-full border border-[#00f2ff]/20">
                  <Wallet className="w-4 h-4" />
                  <span>Available Balance</span>
                </div>
                <button
                  onClick={handleRefreshBalance}
                  className={`p-2 rounded-lg text-[#a1a1aa] hover:text-[#00f2ff] hover:bg-[#27272a] transition-all ${
                    isRefreshing ? 'animate-spin text-[#00f2ff]' : ''
                  }`}
                  title="Refresh Balance"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-baseline gap-2 mb-6">
                <span className="font-headline text-4xl sm:text-6xl font-black text-white tracking-tight">
                  ₹{walletData.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-[#00ff9d] font-mono font-bold">INR Verified</span>
              </div>
            </div>

            {/* Sub-Metrics Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-6 border-t border-white/10 font-mono text-xs">
              <div className="bg-[#09090b]/60 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-[#a1a1aa] block uppercase">Total Winnings</span>
                <span className="font-bold text-[#fbbf24]">₹{walletData.totalWinnings.toLocaleString()}</span>
              </div>
              <div className="bg-[#09090b]/60 p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-[#a1a1aa] block uppercase">Total Deposits</span>
                <span className="font-bold text-white">₹{walletData.totalDeposits.toLocaleString()}</span>
              </div>
              <div className="bg-[#09090b]/60 p-3 rounded-xl border border-white/5 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-[#a1a1aa] block uppercase">Pending Payouts</span>
                <span className="font-bold text-[#fe6b00]">₹{walletData.pendingWithdrawals.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel (Spans 5 cols) */}
          <div className="lg:col-span-5 bg-[#18181b]/60 backdrop-blur-md rounded-2xl p-6 border border-[#27272a] flex flex-col justify-between space-y-4 shadow-xl">
            <h3 className="font-headline font-bold text-base text-white uppercase tracking-wide flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#00f2ff]" />
              <span>Quick Actions</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsDepositModalOpen(true)}
                className="p-4 rounded-xl bg-[#00f2ff] hover:bg-cyan-300 text-black font-extrabold text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all min-h-[90px]"
              >
                <PlusCircle className="w-6 h-6" />
                <span>Add Money</span>
              </button>

              <button
                onClick={() => setIsWithdrawModalOpen(true)}
                className="p-4 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-white font-extrabold text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2 border border-white/10 transition-all min-h-[90px]"
              >
                <ArrowUpRight className="w-6 h-6 text-[#fe6b00]" />
                <span>Withdraw</span>
              </button>
            </div>

            <div className="bg-[#09090b]/80 p-4 rounded-xl border border-white/5 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#00ff9d]" />
                <div>
                  <span className="text-white font-bold block">Instant Gateway</span>
                  <span className="text-[10px] text-[#a1a1aa] block">Razorpay & UPI 256-Bit SSL Encrypted</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* 2. WALLET STATISTICS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
          <div className="bg-[#18181b]/60 backdrop-blur-md p-4 rounded-xl border border-[#27272a] shadow-md">
            <span className="text-[10px] text-[#a1a1aa] uppercase block mb-1">Monthly Earnings</span>
            <span className="text-2xl font-black text-[#00ff9d]">₹{walletData.monthlyEarnings.toLocaleString()}</span>
          </div>

          <div className="bg-[#18181b]/60 backdrop-blur-md p-4 rounded-xl border border-[#27272a] shadow-md">
            <span className="text-[10px] text-[#a1a1aa] uppercase block mb-1">Monthly Fees</span>
            <span className="text-2xl font-black text-[#fe6b00]">₹{walletData.monthlySpending.toLocaleString()}</span>
          </div>

          <div className="bg-[#18181b]/60 backdrop-blur-md p-4 rounded-xl border border-[#27272a] shadow-md">
            <span className="text-[10px] text-[#a1a1aa] uppercase block mb-1">Tournament Prizes</span>
            <span className="text-2xl font-black text-[#fbbf24]">₹{walletData.totalWinnings.toLocaleString()}</span>
          </div>

          <div className="bg-[#18181b]/60 backdrop-blur-md p-4 rounded-xl border border-[#27272a] shadow-md">
            <span className="text-[10px] text-[#a1a1aa] uppercase block mb-1">Net Balance</span>
            <span className="text-2xl font-black text-[#00f2ff]">₹{walletData.balance.toLocaleString()}</span>
          </div>
        </div>

        {/* 3. TRANSACTION HISTORY & FILTERS */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="font-headline font-black text-2xl text-white uppercase tracking-tight">
              Transaction History
            </h3>

            {/* Search & Filter Controls */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search transaction ID..."
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-[#a1a1aa] focus:border-[#00f2ff] focus:outline-none transition-colors h-[38px]"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 font-mono text-xs">
                {[
                  { label: 'ALL', value: 'ALL' },
                  { label: 'DEPOSITS', value: 'DEPOSITS' },
                  { label: 'PRIZE', value: 'PRIZE' },
                  { label: 'FEES', value: 'ENTRY_FEES' },
                  { label: 'PAYOUTS', value: 'WITHDRAWALS' },
                ].map((tab) => (
                  <button
                    key={`filter-tab-${tab.value}`}
                    onClick={() => setActiveFilter(tab.value)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 ${
                      activeFilter === tab.value
                        ? 'bg-[#00f2ff] text-black shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                        : 'bg-[#18181b] text-[#a1a1aa] hover:text-white border border-[#27272a]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Transactions List Table */}
          <div className="bg-[#18181b]/60 backdrop-blur-md rounded-2xl border border-[#27272a] overflow-hidden shadow-2xl">
            {filteredTransactions.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#27272a] flex items-center justify-center mx-auto text-[#a1a1aa]">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h4 className="font-headline font-bold text-lg text-white">No Transactions Found</h4>
                <p className="text-xs text-[#a1a1aa] max-w-sm mx-auto">
                  No transaction records matched your search filter criteria. Try selecting "ALL" or adjusting your search keyword.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-[#18181b]/80 uppercase text-[#a1a1aa]">
                      <th className="py-4 px-6">Transaction ID</th>
                      <th className="py-4 px-6">Details / Event</th>
                      <th className="py-4 px-6">Type</th>
                      <th className="py-4 px-6 text-right">Amount</th>
                      <th className="py-4 px-6 text-center">Status</th>
                      <th className="py-4 px-6 text-right">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTransactions.map((t) => {
                      const isPositive = t.amount > 0
                      const isPending = t.status === 'Pending'

                      return (
                        <tr key={t.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6 font-bold text-[#00f2ff]">{t.id}</td>
                          <td className="py-4 px-6 font-headline font-bold text-white max-w-xs truncate">
                            {t.tournament}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold uppercase ${
                              t.category === 'PRIZE'
                                ? 'bg-[#fbbf24]/10 text-[#fbbf24] border border-[#fbbf24]/30'
                                : t.category === 'DEPOSIT'
                                ? 'bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/30'
                                : t.category === 'WITHDRAWAL'
                                ? 'bg-[#fe6b00]/10 text-[#fe6b00] border border-[#fe6b00]/30'
                                : 'bg-[#27272a] text-white border border-white/10'
                            }`}>
                              {t.type}
                            </span>
                          </td>
                          <td className={`py-4 px-6 text-right font-black text-sm ${
                            isPositive ? 'text-[#00ff9d]' : 'text-white'
                          }`}>
                            {isPositive ? `+₹${t.amount.toLocaleString()}` : `-₹${Math.abs(t.amount).toLocaleString()}`}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isPending
                                ? 'bg-[#fe6b00]/10 text-[#fe6b00] border border-[#fe6b00]/30'
                                : 'bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/30'
                            }`}>
                              {isPending ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                              <span>{t.status}</span>
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right text-[#a1a1aa]">
                            <div className="block">{t.date}</div>
                            <div className="text-[10px] text-[#71717a]">{t.time}</div>
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

      {/* ADD MONEY MODAL */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#18181b] border border-[#00f2ff]/40 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-headline text-lg font-black text-white uppercase flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#00f2ff]" />
                <span>Add Money to Wallet</span>
              </h3>
              <button onClick={() => setIsDepositModalOpen(false)} className="text-[#a1a1aa] hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="text-[#a1a1aa] uppercase font-bold block">Enter Deposit Amount (₹)</label>
                <input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="e.g. 500"
                  required
                  min="100"
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl p-3 text-sm text-white focus:border-[#00f2ff] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#a1a1aa] uppercase font-bold block">Select Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {['UPI (GPay / Paytm)', 'Razorpay Direct', 'NetBanking', 'Credit/Debit Card'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        paymentMethod === method
                          ? 'bg-[#00f2ff]/10 border-[#00f2ff] text-[#00f2ff] font-bold'
                          : 'bg-[#09090b] border-[#27272a] text-[#a1a1aa]'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 font-sans">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="px-4 py-2.5 bg-[#27272a] text-white rounded-xl text-xs uppercase font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#00f2ff] text-black font-extrabold rounded-xl text-xs uppercase hover:bg-cyan-300 transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                >
                  Proceed to Pay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAW MODAL */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#18181b] border border-[#fe6b00]/40 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-headline text-lg font-black text-white uppercase flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-[#fe6b00]" />
                <span>Withdraw Payout</span>
              </h3>
              <button onClick={() => setIsWithdrawModalOpen(false)} className="text-[#a1a1aa] hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="text-[#a1a1aa] uppercase font-bold block">Enter Withdrawal Amount (₹)</label>
                <input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="e.g. 1000"
                  required
                  min="200"
                  max={walletData.balance}
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl p-3 text-sm text-white focus:border-[#fe6b00] focus:outline-none"
                />
                <span className="text-[10px] text-[#a1a1aa]">Max withdrawable balance: ₹{walletData.balance.toLocaleString()}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#a1a1aa] uppercase font-bold block">UPI ID / VPA Address</label>
                <input
                  type="text"
                  value={upiIdInput}
                  onChange={(e) => setUidInput(e.target.value)}
                  placeholder="username@okicici or 9876543210@ybl"
                  required
                  className="w-full bg-[#09090b] border border-[#27272a] rounded-xl p-3 text-sm text-white focus:border-[#fe6b00] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 font-sans">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="px-4 py-2.5 bg-[#27272a] text-white rounded-xl text-xs uppercase font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#fe6b00] text-white font-extrabold rounded-xl text-xs uppercase hover:bg-orange-600 transition-all shadow-[0_0_15px_rgba(254,107,0,0.3)]"
                >
                  Request Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
