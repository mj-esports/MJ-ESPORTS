import { useState, useMemo, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet,
  ArrowUpRight,
  PlusCircle,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  X,
  ShieldCheck,
  Trophy,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  Zap,
  Lock
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import {
  fetchUserWallet,
  fetchWalletLedger,
  fetchAllUserPrizeCredits,
  requestWithdrawal,
  createWalletTopupOrder,
  verifyWalletTopup,
  generateTopupIdempotencyKey,
  getAuthoritativeWalletBalance,
  subscribeToWalletBalance,
} from '../services/walletService'
import { loadRazorpayScript } from '../services/tournamentPaymentService'

export default function WalletPage() {
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()

  // Navigation & Filter States
  const [activeFilter, setActiveFilter] = useState('ALL') // 'ALL' | 'CREDITS' | 'DEBITS'
  const [searchQuery, setSearchQuery] = useState('')

  // Modal States
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false)
  const [amountInput, setAmountInput] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('UPI')
  const [upiIdInput, setUpiIdInput] = useState('')

  // Loading & Submitting States
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isSubmittingTopup, setIsSubmittingTopup] = useState(false)
  const [topupStatus, setTopupStatus] = useState(null) // null | 'PROCESSING' | 'SUCCESS' | 'FAILED'
  const [topupIdempotencyKey, setTopupIdempotencyKey] = useState(null)
  const [walletError, setWalletError] = useState(null)

  // Authoritative State: Balances & Ledger
  const [transactions, setTransactions] = useState([])
  const [dbWalletBalance, setDbWalletBalance] = useState(() => getAuthoritativeWalletBalance())
  const [prizeEarnings, setPrizeEarnings] = useState(null)
  const [loadingPrizeEarnings, setLoadingPrizeEarnings] = useState(true)

  // Authoritative balance from Phase 9.1 wallets table via pub-sub bus
  const userWalletBalance = dbWalletBalance !== null ? dbWalletBalance : (getAuthoritativeWalletBalance() ?? 0.0)
  const authoritativeBalance = Math.floor(Number(userWalletBalance || 0))

  // Phase 9.4/9.5A: Top-up bounds: min ₹1, max ₹200 per transaction
  // Note: The wallet has NO lifetime balance ceiling, but per-transaction top-up is capped at ₹200.
  // Retain compatibility constants for edge validation:
  const maxAllowedTopup = Math.max(0, 200 - authoritativeBalance)

  // 1. Authoritative Data Synchronization
  const syncWalletData = useCallback(async () => {
    if (!user?.id) return
    setIsRefreshing(true)
    setWalletError(null)

    try {
      // Fetch authoritative wallet balance and immutable ledger entries concurrently
      const [walletRes, ledgerData] = await Promise.all([
        fetchUserWallet(),
        fetchWalletLedger({ limit: 100, userId: user.id }),
      ])

      if (walletRes?.success && walletRes.wallet) {
        setDbWalletBalance(Number(walletRes.wallet.balance || 0.0))
      }

      // Map immutable ledger rows to player-facing transaction records
      const mapped = (ledgerData || []).map((t) => {
        const isCredit = t.direction === 'CREDIT'
        const amt = isCredit ? Math.abs(Number(t.amount)) : -Math.abs(Number(t.amount))

        let categoryLabel = 'TRANSACTION'
        if (t.transaction_type === 'DEPOSIT') {
          categoryLabel = 'MONEY ADDED'
        } else if (t.transaction_type === 'PRIZE_CREDIT') {
          categoryLabel = 'PRIZE WON'
        } else if (t.transaction_type === 'REFUND') {
          categoryLabel = 'TOURNAMENT REFUND'
        } else if (t.transaction_type === 'ENTRY_FEE_DEBIT') {
          categoryLabel = 'TOURNAMENT ENTRY'
        } else if (t.transaction_type === 'WITHDRAWAL') {
          categoryLabel = 'WITHDRAWAL'
        } else {
          categoryLabel = t.transaction_type || 'TRANSACTION'
        }

        const createdAt = t.created_at ? new Date(t.created_at) : new Date()

        return {
          id: t.id,
          tournament: t.description || 'Instant Wallet Top-up via Razorpay',
          description: t.description || 'Instant Wallet Top-up via Razorpay',
          type: t.transaction_type,
          direction: t.direction,
          category: categoryLabel,
          amount: amt,
          balanceBefore: Number(t.balance_before != null ? t.balance_before : 0.0),
          balanceAfter: Number(t.balance_after != null ? t.balance_after : 0.0),
          status: 'Completed',
          date: createdAt.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          time: createdAt.toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
          }),
        }
      })
      setTransactions(mapped)
    } catch (err) {
      console.warn('[WalletPage] syncWalletData error:', err)
      setWalletError('WALLET TEMPORARILY UNAVAILABLE')
      setTransactions([])
    } finally {
      setIsRefreshing(false)
      setIsPageLoading(false)
    }
  }, [user?.id])

  // 2. Fetch Authoritative Prize Earnings (strictly from wallet_ledger PRIZE_CREDIT + CREDIT)
  useEffect(() => {
    if (!user?.id) {
      setPrizeEarnings(null)
      setLoadingPrizeEarnings(false)
      return
    }

    let isMounted = true
    setLoadingPrizeEarnings(true)

    async function loadPrizeEarnings() {
      try {
        const credits = await fetchAllUserPrizeCredits(user.id)
        if (isMounted) {
          const total = (credits || []).reduce((acc, entry) => {
            if (entry.transaction_type === 'PRIZE_CREDIT' && entry.direction === 'CREDIT') {
              return acc + Number(entry.amount || 0)
            }
            return acc
          }, 0)
          setPrizeEarnings(total)
        }
      } catch (err) {
        console.warn('[WalletPage] loadPrizeEarnings error:', err)
        if (isMounted) setPrizeEarnings(null)
      } finally {
        if (isMounted) setLoadingPrizeEarnings(false)
      }
    }

    loadPrizeEarnings()
    return () => {
      isMounted = false
    }
  }, [user?.id])

  // 3. Subscribe to authoritative wallet balance changes
  useEffect(() => {
    syncWalletData()
    const unsubscribe = subscribeToWalletBalance((newBal) => {
      setDbWalletBalance(newBal)
    })
    return unsubscribe
  }, [syncWalletData])

  const handleRefreshBalance = () => {
    syncWalletData()
  }

  // 4. Handle Add Money via Razorpay Checkout
  const handleDepositSubmit = async (e) => {
    e.preventDefault()

    // Strict Whole-Rupee and per-transaction validation
    const trimmedAmount = (amountInput || '').toString().trim()
    const wholeRupeeRegex = /^\d+$/
    if (!trimmedAmount || !wholeRupeeRegex.test(trimmedAmount)) {
      showError('Please enter a valid whole rupee amount (no decimals or paise permitted).', 'Invalid Amount')
      return
    }

    const num = parseInt(trimmedAmount, 10)
    // Bounds: 1 <= num <= 200 per transaction
    if (isNaN(num) || num < 1 || num > 200) {
      showError('Deposit amount must be a whole rupee amount between ₹1 and ₹200.', 'Invalid Amount')
      return
    }

    // Retain compatibility guard
    if ((authoritativeBalance + num) > 200) {
      showError(
        `Top-up rejected: wallet balance cannot exceed ₹200. Current balance: ₹${authoritativeBalance}. Maximum allowed top-up: ₹${maxAllowedTopup}.`,
        'Limit Exceeded'
      )
      return
    }

    // Client Idempotency Key
    const idempotencyKey = topupIdempotencyKey || generateTopupIdempotencyKey()
    if (!topupIdempotencyKey) {
      setTopupIdempotencyKey(idempotencyKey)
    }

    setIsSubmittingTopup(true)
    setTopupStatus('PROCESSING')

    try {
      // Load Razorpay checkout script
      const isScriptLoaded = await loadRazorpayScript()
      if (!isScriptLoaded || typeof window === 'undefined' || !window.Razorpay) {
        throw new Error('Unable to load payment gateway. Please check your network connection.')
      }

      // Create authoritative server-side Razorpay order
      const orderRes = await createWalletTopupOrder(num, idempotencyKey)
      if (!orderRes || !orderRes.success || !orderRes.order_id) {
        throw new Error(orderRes?.message || orderRes?.error || 'Failed to initialize top-up order.')
      }

      // Open Razorpay Checkout modal
      const options = {
        key: orderRes.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || '',
        amount: orderRes.amount,
        currency: orderRes.currency || 'INR',
        name: 'MJ ESPORTS',
        description: `Wallet Add Funds ₹${num}`,
        order_id: orderRes.order_id,
        handler: async (response) => {
          try {
            setIsSubmittingTopup(true)
            setTopupStatus('PROCESSING')

            const verifyRes = await verifyWalletTopup({
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            })

            if (verifyRes && verifyRes.success) {
              setTopupStatus('SUCCESS')
              showSuccess(`₹${num} credited to your wallet!`, 'Deposit Successful')
              setIsDepositModalOpen(false)
              setAmountInput('')
              setTopupIdempotencyKey(null)
              await syncWalletData()
            } else {
              setTopupStatus('FAILED')
              showError(verifyRes?.error || verifyRes?.message || 'Payment verification failed.', 'Verification Error')
            }
          } catch (verifyErr) {
            setTopupStatus('FAILED')
            showError(verifyErr.message || 'Payment verification failed.', 'Verification Error')
          } finally {
            setIsSubmittingTopup(false)
          }
        },
        modal: {
          ondismiss: () => {
            setIsSubmittingTopup(false)
            setTopupStatus(null)
          },
        },
        prefill: {
          name: user?.user_metadata?.full_name || user?.user_metadata?.username || 'MJ Esports Player',
          email: user?.email || '',
        },
        theme: {
          color: '#00f2ff',
        },
      }

      const rzpInstance = new window.Razorpay(options)
      rzpInstance.on('payment.failed', (resp) => {
        console.error('[Razorpay Payment Failed]:', resp.error)
        setTopupStatus('FAILED')
        showError(resp.error?.description || 'Payment was declined.', 'Payment Failed')
        setIsSubmittingTopup(false)
      })
      rzpInstance.open()
    } catch (err) {
      console.error('[Deposit Error]:', err)
      setTopupStatus('FAILED')
      showError(err.message || 'Deposit Failed', 'Deposit Failed')
      setIsSubmittingTopup(false)
    }
  }

  // 5. Handle Withdrawal Request via Secure RPC
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

  // 6. Filter & Search Transaction Logic (read-only)
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (activeFilter === 'CREDITS' && t.direction !== 'CREDIT') return false
      if (activeFilter === 'DEBITS' && t.direction !== 'DEBIT') return false

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        return (
          t.id.toLowerCase().includes(query) ||
          (t.tournament && t.tournament.toLowerCase().includes(query)) ||
          (t.description && t.description.toLowerCase().includes(query)) ||
          (t.category && t.category.toLowerCase().includes(query)) ||
          t.type.toLowerCase().includes(query) ||
          (t.direction && t.direction.toLowerCase().includes(query))
        )
      }
      return true
    })
  }, [transactions, activeFilter, searchQuery])

  return (
    <div className="bg-[#08080a] text-[#b9cacb] font-body min-h-screen pb-28 sm:pb-32 antialiased text-xs overflow-x-hidden">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6 sm:space-y-8 font-mono">

        {/* ================================================== */}
        {/* 1. WALLET HEADER & BREADCRUMBS                     */}
        {/* ================================================== */}
        <section aria-label="Wallet Header" className="space-y-3">
          <div className="flex items-center justify-between">
            <Link
              to="/profile"
              className="inline-flex items-center gap-1.5 text-xs text-[#8e95a5] hover:text-[#00f2ff] transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Return to Profile</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff9d] animate-pulse"></span>
                <span>WALLET STATUS: LIVE</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#141620] text-[#00f2ff] border border-[#00f2ff]/20">
                <ShieldCheck className="w-3 h-3 text-[#00f2ff]" />
                <span>SECURE WALLET</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#1f2230] pb-4">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight uppercase">
                WALLET & LEDGER
              </h1>
              <p className="text-xs text-[#8e95a5] font-sans">
                Real-time competitive tournament finances & instant payouts
              </p>
            </div>

            <span className="self-start sm:self-auto px-2.5 py-1 rounded bg-[#141620] border border-[#222638] text-[10px] font-bold text-[#fe6b00] tracking-wider uppercase">
              FREE FIRE MAX ONLY
            </span>
          </div>
        </section>

        {/* Global Error Banner */}
        {walletError && (
          <div className="p-4 rounded-xl border border-red-900/50 bg-red-950/20 text-red-400 flex items-center justify-between gap-3 font-sans">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              <div>
                <p className="text-xs font-bold uppercase font-mono">{walletError}</p>
                <p className="text-[11px] text-red-300/80">Please try again later or refresh the balance.</p>
              </div>
            </div>
            <button
              onClick={handleRefreshBalance}
              className="px-3 py-1.5 rounded bg-red-900/40 hover:bg-red-900/60 text-xs font-mono font-bold text-white border border-red-700/50 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* ================================================== */}
        {/* 2. AVAILABLE BALANCE & PRIZE OVERVIEW CARDS        */}
        {/* ================================================== */}
        <section aria-label="Available Balance Overview" className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">

          {/* Primary Balance Card */}
          <article className="md:col-span-7 bg-[#0d0e15] border border-[#1f2230] rounded-2xl p-5 sm:p-7 relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.35)] flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00f2ff]/5 rounded-full blur-3xl pointer-events-none -z-10"></div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#00f2ff] uppercase tracking-wider bg-[#00f2ff]/10 px-2.5 py-1 rounded-lg border border-[#00f2ff]/20">
                  <Wallet className="w-3.5 h-3.5 shrink-0" />
                  <span>AVAILABLE BALANCE</span>
                </div>

                <button
                  type="button"
                  onClick={handleRefreshBalance}
                  disabled={isRefreshing}
                  className="p-2 rounded-lg bg-[#141620] border border-[#222638] text-[#8e95a5] hover:text-[#00f2ff] hover:border-[#00f2ff]/40 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
                  title="Synchronize Wallet Balance"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#00f2ff]' : ''}`} />
                </button>
              </div>

              <div className="space-y-1 my-2">
                {isPageLoading ? (
                  <div className="h-12 w-40 bg-[#141620] animate-pulse rounded-lg my-1"></div>
                ) : walletError ? (
                  <span className="text-xl sm:text-2xl font-bold text-red-400 block tracking-tight">
                    BALANCE UNAVAILABLE
                  </span>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white block">
                      ₹{authoritativeBalance}
                    </span>
                  </div>
                )}
                <span className="text-[11px] text-[#8e95a5] block uppercase font-sans tracking-wide">
                  INR Player Wallet • Ready for tournament entry
                </span>
              </div>
            </div>

            {/* Quick Balance Actions */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-6 pt-4 border-t border-[#1f2230]">
              <button
                type="button"
                onClick={() => {
                  setAmountInput('')
                  setIsDepositModalOpen(true)
                }}
                className="py-3 bg-[#00f2ff] hover:bg-[#74f5ff] text-[#08080a] font-black uppercase tracking-wider rounded-xl text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(0,242,255,0.25)] flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>ADD MONEY</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAmountInput('')
                  setIsWithdrawModalOpen(true)
                }}
                className="py-3 bg-[#141620] hover:bg-[#1a1d29] text-white hover:text-[#00f2ff] border border-[#222638] hover:border-[#00f2ff]/40 font-bold uppercase tracking-wider rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                <ArrowUpRight className="w-4 h-4 shrink-0" />
                <span>WITHDRAW</span>
              </button>
            </div>
          </article>

          {/* Single Authoritative Prize Earnings Metric Card */}
          <article className="md:col-span-5 bg-[#0d0e15] border border-[#1f2230] rounded-2xl p-5 sm:p-7 relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.35)] flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#fbbf24]/5 rounded-full blur-3xl pointer-events-none -z-10"></div>

            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#fbbf24] uppercase tracking-wider bg-[#fbbf24]/10 px-2.5 py-1 rounded-lg border border-[#fbbf24]/20 mb-4">
                <Trophy className="w-3.5 h-3.5 shrink-0" />
                <span>PRIZE EARNINGS</span>
              </div>

              <div className="space-y-1 my-2">
                {loadingPrizeEarnings ? (
                  <div className="h-10 w-32 bg-[#141620] animate-pulse rounded-lg my-1"></div>
                ) : (
                  <span className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-[#fbbf24] block">
                    {prizeEarnings !== null && prizeEarnings > 0
                      ? `₹${Math.floor(prizeEarnings).toLocaleString('en-IN')}`
                      : '—'}
                  </span>
                )}
                <span className="text-[11px] text-[#8e95a5] block uppercase font-sans tracking-wide">
                  Confirmed Free Fire MAX Tournament Winnings
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#1f2230] mt-6">
              <div className="flex items-center justify-between text-[11px] text-[#717a8e] font-sans">
                <span>Direct Ledger Accounting</span>
                <span className="text-[#00ff9d] font-mono font-bold">100% Credited</span>
              </div>
            </div>
          </article>

        </section>

        {/* ================================================== */}
        {/* 3. TRANSACTION HISTORY SECTION                     */}
        {/* ================================================== */}
        <section aria-label="Transaction History" className="space-y-4">

          {/* Section Controls: Title, Search, Filter Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#1f2230] pb-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                TRANSACTION HISTORY
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#141620] border border-[#222638] text-[10px] font-mono text-[#00f2ff]">
                {filteredTransactions.length} {filteredTransactions.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Filter Tabs: ALL, CREDITS (+), DEBITS (-) */}
              <div className="flex items-center p-1 bg-[#0d0e15] border border-[#1f2230] rounded-xl text-[11px] font-mono font-bold">
                <button
                  type="button"
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg uppercase transition-all cursor-pointer ${
                    activeFilter === 'ALL'
                      ? 'bg-[#00f2ff] text-[#08080a] shadow-[0_0_10px_rgba(0,242,255,0.3)]'
                      : 'text-[#8e95a5] hover:text-white'
                  }`}
                >
                  ALL
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('CREDITS')}
                  className={`px-3 py-1.5 rounded-lg uppercase transition-all cursor-pointer ${
                    activeFilter === 'CREDITS'
                      ? 'bg-[#00ff9d] text-[#08080a] shadow-[0_0_10px_rgba(0,255,157,0.3)]'
                      : 'text-[#8e95a5] hover:text-white'
                  }`}
                >
                  CREDITS (+)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('DEBITS')}
                  className={`px-3 py-1.5 rounded-lg uppercase transition-all cursor-pointer ${
                    activeFilter === 'DEBITS'
                      ? 'bg-[#f87171] text-[#08080a] shadow-[0_0_10px_rgba(248,113,113,0.3)]'
                      : 'text-[#8e95a5] hover:text-white'
                  }`}
                >
                  DEBITS (-)
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#525866] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search statement..."
                  className="w-full sm:w-48 bg-[#0d0e15] border border-[#1f2230] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#525866] focus:border-[#00f2ff] focus:outline-none transition-colors h-[38px] font-sans"
                />
              </div>
            </div>
          </div>

          {/* Transactions List */}
          {isPageLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-20 bg-[#0d0e15] border border-[#1f2230] rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            /* Empty State: No Transactions Yet */
            <div className="py-16 text-center border border-[#1f2230] bg-[#0d0e15] rounded-2xl p-6 space-y-3">
              <Wallet className="w-10 h-10 text-[#525866] mx-auto" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                NO TRANSACTIONS YET
              </h3>
              <p className="text-xs text-[#8e95a5] font-sans max-w-sm mx-auto">
                Add money or participate in a Free Fire MAX tournament to begin your wallet history.
              </p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            /* Filter/Search Empty State */
            <div className="py-14 text-center border border-[#1f2230] bg-[#0d0e15] rounded-2xl p-6 space-y-2.5">
              <AlertCircle className="w-8 h-8 text-[#525866] mx-auto" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                NO MATCHING TRANSACTIONS
              </h3>
              <p className="text-xs text-[#8e95a5] font-sans max-w-sm mx-auto">
                No transactions match the selected filter or search query.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => {
                const isCredit = tx.direction === 'CREDIT'
                const isPrize = tx.type === 'PRIZE_CREDIT'
                const isRefund = tx.type === 'REFUND'

                return (
                  <article
                    key={tx.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[#0d0e15] border border-[#1f2230] hover:border-[#00f2ff]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_2px_15px_rgba(0,0,0,0.25)]"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
                          isCredit
                            ? isPrize
                              ? 'bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/30'
                              : 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/30'
                            : 'bg-[#f87171]/10 text-[#f87171] border-[#f87171]/30'
                        }`}
                      >
                        {isCredit ? (
                          isPrize ? <Trophy className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                              isCredit
                                ? isPrize
                                  ? 'bg-[#fbbf24]/10 text-[#fbbf24] border-[#fbbf24]/30'
                                  : 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/30'
                                : 'bg-[#f87171]/10 text-[#f87171] border-[#f87171]/30'
                            }`}
                          >
                            {tx.category}
                          </span>

                          <span className="text-[10px] text-[#525866] font-mono">
                            {tx.date} • {tx.time}
                          </span>
                        </div>

                        <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-md" title={tx.description}>
                          {tx.description}
                        </h3>

                        <div className="flex items-center gap-3 text-[10px] text-[#717a8e] font-mono">
                          <span>Ref: {tx.id.substring(0, 8)}...</span>
                          <span>&bull;</span>
                          <span>Bal: ₹{Math.floor(tx.balanceAfter)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#1f2230]">
                      <span
                        className={`text-sm sm:text-base font-black font-mono ${
                          isCredit
                            ? isPrize
                              ? 'text-[#fbbf24]'
                              : 'text-[#00ff9d]'
                            : 'text-[#f87171]'
                        }`}
                      >
                        {isCredit ? '+' : '−'}₹{Math.abs(tx.amount)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-[#00ff9d] uppercase">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>COMPLETED</span>
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

        </section>

      </main>

      {/* ================================================== */}
      {/* 4. ADD MONEY (DEPOSIT) MODAL                       */}
      {/* ================================================== */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono">
          <div className="w-full max-w-md bg-[#0d0e15] border border-[#1f2230] rounded-2xl p-6 space-y-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => {
                setIsDepositModalOpen(false)
                setTopupIdempotencyKey(null)
                setIsSubmittingTopup(false)
                setTopupStatus(null)
              }}
              disabled={isSubmittingTopup}
              className="absolute top-4 right-4 p-1.5 text-[#8e95a5] hover:text-white rounded-lg bg-[#141620] border border-[#222638] transition-colors disabled:opacity-40 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#00f2ff] uppercase tracking-wider">
                RAZORPAY INSTANT CHECKOUT
              </span>
              <h3 className="text-lg font-black text-white uppercase tracking-wider">
                ADD MONEY
              </h3>
              <p className="text-xs text-[#8e95a5] font-sans">
                Top up your wallet balance instantly for tournament registrations. Allowed: ₹1 through ₹200 per transaction. Whole rupees only.
              </p>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              {/* Preset Buttons */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold text-[#8e95a5]">
                  Quick Presets
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[50, 100, 200].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={isSubmittingTopup}
                      onClick={() => {
                        setAmountInput(preset.toString())
                        setTopupIdempotencyKey(null)
                      }}
                      className={`py-2 rounded-xl text-xs font-bold font-mono transition-all border cursor-pointer disabled:opacity-50 ${
                        amountInput === preset.toString()
                          ? 'bg-[#00f2ff]/15 border-[#00f2ff] text-[#00f2ff]'
                          : 'bg-[#141620] border-[#222638] text-white hover:border-[#00f2ff]/40'
                      }`}
                    >
                      +₹{preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px]">
                  <label className="uppercase font-bold text-[#8e95a5]">
                    Top-Up Amount (INR)
                  </label>
                  <span className="text-[#00f2ff] font-mono">
                    Limit: ₹1 - ₹200
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    step="1"
                    value={amountInput}
                    disabled={isSubmittingTopup}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '')
                      setAmountInput(val)
                      setTopupIdempotencyKey(null)
                    }}
                    placeholder="Enter amount (1-200)"
                    required
                    className="w-full bg-[#141620] border border-[#222638] rounded-xl pl-8 pr-4 py-2.5 text-sm text-white focus:border-[#00f2ff] focus:outline-none font-mono disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Payment Gateway Options */}
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold text-[#8e95a5]">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['UPI', 'CARD', 'NETBANK'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      disabled={isSubmittingTopup}
                      className={`py-2 text-[10px] font-bold uppercase rounded-xl border transition-all cursor-pointer disabled:opacity-50 ${
                        paymentMethod === method
                          ? 'bg-[#00f2ff]/10 border-[#00f2ff] text-[#00f2ff]'
                          : 'bg-[#141620] border-[#222638] text-[#8e95a5] hover:text-white'
                      }`}
                    >
                      {method === 'UPI' ? 'UPI / QR' : method === 'CARD' ? 'Card' : 'NetBanking'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Indicator during Payment */}
              {topupStatus === 'PROCESSING' && (
                <div className="p-2.5 rounded-lg bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] text-xs flex items-center gap-2 font-sans">
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>PAYMENT PROCESSING: Authoritative ledger verification in progress...</span>
                </div>
              )}

              {topupStatus === 'FAILED' && (
                <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-900/40 text-red-400 text-xs flex items-center gap-2 font-sans">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>PAYMENT FAILED: Transaction was not credited.</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-3 border-t border-[#1f2230]">
                <button
                  type="button"
                  onClick={() => {
                    setIsDepositModalOpen(false)
                    setTopupIdempotencyKey(null)
                    setIsSubmittingTopup(false)
                    setTopupStatus(null)
                  }}
                  disabled={isSubmittingTopup}
                  className="flex-1 py-2.5 bg-[#141620] border border-[#222638] hover:border-red-500 hover:text-red-400 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTopup || !amountInput}
                  className="flex-1 py-2.5 bg-[#00f2ff] hover:bg-[#74f5ff] text-[#08080a] rounded-xl text-xs font-black uppercase transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingTopup ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>PROCESSING</span>
                    </>
                  ) : (
                    `PAY ₹${amountInput || 0}`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* 5. WITHDRAW FUNDS MODAL                            */}
      {/* ================================================== */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono">
          <div className="w-full max-w-md bg-[#0d0e15] border border-[#1f2230] rounded-2xl p-6 space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsWithdrawModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-[#8e95a5] hover:text-white rounded-lg bg-[#141620] border border-[#222638] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#fe6b00] uppercase tracking-wider">
                COMPETITIVE PAYOUT
              </span>
              <h3 className="text-lg font-black text-white uppercase tracking-wider">
                WITHDRAW FUNDS
              </h3>
              <p className="text-xs text-[#8e95a5] font-sans">
                Request a direct bank or UPI transfer. Minimum amount ₹100.
              </p>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold text-[#8e95a5]">
                  Withdrawal Amount (INR)
                </label>
                <input
                  type="number"
                  min="100"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="e.g. 100"
                  required
                  className="w-full bg-[#141620] border border-[#222638] rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#00f2ff] focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold text-[#8e95a5]">
                  UPI ID (Virtual Payment Address)
                </label>
                <input
                  type="text"
                  value={upiIdInput}
                  onChange={(e) => setUpiIdInput(e.target.value)}
                  placeholder="username@okhdfcbank or 9876543210@ybl"
                  required
                  className="w-full bg-[#141620] border border-[#222638] rounded-xl px-4 py-2.5 text-xs text-white focus:border-[#00f2ff] focus:outline-none font-mono"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-[#1f2230]">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-2.5 bg-[#141620] border border-[#222638] hover:border-red-500 hover:text-red-400 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#00f2ff] hover:bg-[#74f5ff] text-[#08080a] rounded-xl text-xs font-black uppercase transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] cursor-pointer"
                >
                  REQUEST PAYOUT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
