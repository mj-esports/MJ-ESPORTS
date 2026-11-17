import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet,
  ArrowUpRight,
  PlusCircle,
  RefreshCw,
  Search,
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
  fetchUserWithdrawals,
  generateTopupIdempotencyKey,
  getAuthoritativeWalletBalance,
  subscribeToWalletBalance,
  createWalletTopupOrder,
  verifyWalletTopup,
} from '../services/walletService'

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

  // Withdrawal Modal States
  const [withdrawalPayoutMethod, setWithdrawalPayoutMethod] = useState('UPI') // 'UPI' | 'BANK_TRANSFER'
  const [withdrawAmountInput, setWithdrawAmountInput] = useState('')
  const [upiIdInput, setUpiIdInput] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankAccountConfirm, setBankAccountConfirm] = useState('')
  const [bankIfsc, setBankIfsc] = useState('')
  const [bankAccountHolder, setBankAccountHolder] = useState('')
  const [bankName, setBankName] = useState('')
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false)
  const [withdrawalIdempotencyKey, setWithdrawalIdempotencyKey] = useState(null)

  // Loading & Submitting States
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isSubmittingTopup, setIsSubmittingTopup] = useState(false)
  const [topupStatus, setTopupStatus] = useState(null) // null | 'PROCESSING' | 'SUCCESS' | 'FAILED'
  const [topupIdempotencyKey, setTopupIdempotencyKey] = useState(null)
  const [walletError, setWalletError] = useState(null)
  const [famgatewaySession, setFamgatewaySession] = useState(null)
  const [isVerifyingSession, setIsVerifyingSession] = useState(false)
  const [showQrCode, setShowQrCode] = useState(false)
  const [isPollingExpired, setIsPollingExpired] = useState(false)
  const isPollingInProgressRef = useRef(false)
  const pollAttemptsRef = useRef(0)

  // Derived active polling state
  const isPollingActive = Boolean(famgatewaySession?.orderId && isDepositModalOpen && !isPollingExpired)

  // Authoritative State: Balances, Ledger & Withdrawals
  const [transactions, setTransactions] = useState([])
  const [userWithdrawals, setUserWithdrawals] = useState([])
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true)
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
      // Fetch authoritative wallet balance, immutable ledger entries, and withdrawal requests concurrently
      const [walletRes, ledgerData, withdrawalsRes] = await Promise.all([
        fetchUserWallet(),
        fetchWalletLedger({ limit: 100, userId: user.id }),
        fetchUserWithdrawals(user.id),
      ])

      if (walletRes?.success && walletRes.wallet) {
        setDbWalletBalance(Number(walletRes.wallet.balance || 0.0))
      }

      if (withdrawalsRes?.success && Array.isArray(withdrawalsRes.data)) {
        setUserWithdrawals(withdrawalsRes.data)
      } else {
        setUserWithdrawals([])
      }

      // Map immutable ledger rows to player-facing transaction records
      const mapped = (ledgerData || []).map((t) => {
        const isCredit = t.direction === 'CREDIT'
        const amt = isCredit ? Math.abs(Number(t.amount)) : -Math.abs(Number(t.amount))

        let categoryLabel
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
          tournament: t.description || 'Instant Wallet Top-up',
          description: t.description || 'Instant Wallet Top-up',
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
      setUserWithdrawals([])
    } finally {
      setIsRefreshing(false)
      setIsPageLoading(false)
      setLoadingWithdrawals(false)
    }
  }, [user])

  // 2. Fetch Authoritative Prize Earnings (strictly from wallet_ledger PRIZE_CREDIT + CREDIT)
  useEffect(() => {
    if (!user?.id) return

    let isMounted = true

    queueMicrotask(() => {
      if (!isMounted) return
      setLoadingPrizeEarnings(true)

      fetchAllUserPrizeCredits(user.id)
        .then((credits) => {
          if (!isMounted) return
          const total = (credits || []).reduce((acc, entry) => {
            if (entry.transaction_type === 'PRIZE_CREDIT' && entry.direction === 'CREDIT') {
              return acc + Number(entry.amount || 0)
            }
            return acc
          }, 0)
          setPrizeEarnings(total)
        })
        .catch((err) => {
          console.warn('[WalletPage] loadPrizeEarnings error:', err)
          if (isMounted) setPrizeEarnings(null)
        })
        .finally(() => {
          if (isMounted) setLoadingPrizeEarnings(false)
        })
    })

    return () => {
      isMounted = false
    }
  }, [user])

  // 3. Subscribe to authoritative wallet balance changes
  useEffect(() => {
    let isCancelled = false

    queueMicrotask(() => {
      if (!isCancelled) {
        syncWalletData()
      }
    })

    const unsubscribe = subscribeToWalletBalance((newBal) => {
      setDbWalletBalance(newBal)
    })
    return () => {
      isCancelled = true
      unsubscribe()
    }
  }, [syncWalletData])

  const handleRefreshBalance = () => {
    syncWalletData()
  }

  // 4. Handle Add Money (Online Top-Up)
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
      const orderRes = await createWalletTopupOrder(num, idempotencyKey)

      if (!orderRes?.success) {
        setIsSubmittingTopup(false)
        setTopupStatus(null)
        const msg = orderRes?.message || 'Online wallet top-up is temporarily disabled pending compliance review.'
        showError(msg, orderRes?.error_code === 'WALLET_TOPUP_DISABLED' ? 'Top-Up Temporarily Disabled' : 'Top-Up Failed')
        return
      }

      if (orderRes.order_id) {
        setFamgatewaySession({
          orderId: orderRes.order_id,
          amount: orderRes.amount,
          payableAmount: orderRes.payable_amount || orderRes.amount,
          upiIntent: orderRes.upi_intent,
          qrUrl: orderRes.qr_url,
          checkoutUrl: orderRes.checkout_url,
        })
        setTopupStatus('AWAITING_PAYMENT')
      }
    } catch (err) {
      console.error('[WalletPage] Deposit submission error:', err)
      showError(err.message || 'Unexpected error creating top-up order.', 'Deposit Error')
      setIsSubmittingTopup(false)
      setTopupStatus(null)
    }
  }

  // 4.1. Bounded Polling for active FamGateway wallet top-up verification (Phase 8J Remediated)
  useEffect(() => {
    if (!famgatewaySession?.orderId || !isDepositModalOpen) {
      pollAttemptsRef.current = 0
      isPollingInProgressRef.current = false
      return
    }

    let isMounted = true
    pollAttemptsRef.current = 0

    // Maximum allowed duration: 3 minutes (60 attempts at ~3s interval)
    const MAX_POLL_ATTEMPTS = 60
    let pollTimerId = null
    let currentInterval = 3000

    const executePoll = async () => {
      if (!isMounted || !isDepositModalOpen || !famgatewaySession?.orderId) return

      // Expiry check: Check provider expiry timestamp if available
      if (famgatewaySession?.expiresAt) {
        const expiryDate = new Date(famgatewaySession.expiresAt)
        if (!isNaN(expiryDate.getTime()) && Date.now() > expiryDate.getTime()) {
          setIsPollingExpired(true)
          showError('Payment session has expired. Please initiate a new top-up.', 'Session Expired')
          return
        }
      }

      // Max attempts check: Bounded duration cutoff
      if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
        setIsPollingExpired(true)
        return
      }

      // Concurrency guard: Prevent overlapping verification requests
      if (isPollingInProgressRef.current) {
        pollTimerId = setTimeout(executePoll, currentInterval)
        return
      }

      isPollingInProgressRef.current = true
      pollAttemptsRef.current += 1

      try {
        const verifyRes = await verifyWalletTopup({ orderId: famgatewaySession.orderId })
        if (!isMounted) return

        if (verifyRes?.success && verifyRes?.balance_after !== undefined) {
          showSuccess(`₹${famgatewaySession.amount} successfully credited to your wallet!`, 'Top-Up Successful')
          setFamgatewaySession(null)
          setIsDepositModalOpen(false)
          setTopupStatus(null)
          setIsSubmittingTopup(false)
          setAmountInput('')
          syncWalletData()
          return
        }

        // Backoff handling: If rate-limited (HTTP 429), back off to 6000ms
        if (verifyRes?.error_code === 'GATEWAY_RATE_LIMITED' || verifyRes?.status === 429) {
          currentInterval = 6000
        } else {
          currentInterval = 3000
        }
      } catch (err) {
        console.warn('[WalletPage Polling]:', err?.message)
      } finally {
        isPollingInProgressRef.current = false
        if (isMounted && isDepositModalOpen) {
          pollTimerId = setTimeout(executePoll, currentInterval)
        }
      }
    }

    pollTimerId = setTimeout(executePoll, 3000)

    return () => {
      isMounted = false
      if (pollTimerId) clearTimeout(pollTimerId)
      isPollingInProgressRef.current = false
    }
  }, [famgatewaySession?.orderId, famgatewaySession?.amount, famgatewaySession?.expiresAt, isDepositModalOpen, showError, showSuccess, syncWalletData])

  const handleManualVerifyTopup = async () => {
    if (!famgatewaySession?.orderId) return
    setIsVerifyingSession(true)
    try {
      const verifyRes = await verifyWalletTopup({ orderId: famgatewaySession.orderId })
      if (verifyRes?.success && verifyRes?.balance_after !== undefined) {
        showSuccess(`₹${famgatewaySession.amount} successfully credited to your wallet!`, 'Top-Up Successful')
        setFamgatewaySession(null)
        setIsDepositModalOpen(false)
        setTopupStatus(null)
        setIsSubmittingTopup(false)
        setAmountInput('')
        syncWalletData()
      } else {
        showError(verifyRes?.message || 'Payment not yet confirmed by bank. Please complete payment in your UPI app and retry.', 'Awaiting Confirmation')
      }
    } catch (err) {
      showError(err.message || 'Error checking payment status.', 'Verification Error')
    } finally {
      setIsVerifyingSession(false)
    }
  }

  // Helper functions for masking payout details securely
  const maskUpiId = (upi) => {
    if (!upi || typeof upi !== 'string') return '—'
    const parts = upi.split('@')
    if (parts.length !== 2) return upi
    const [handle, domain] = parts
    const visible = handle.slice(0, Math.min(2, handle.length))
    return `${visible}***@${domain}`
  }

  const maskAccountNumber = (acc) => {
    if (!acc || typeof acc !== 'string') return '—'
    const last4 = acc.slice(-4)
    return `••••••${last4}`
  }

  const formatPayoutSummary = (method, details) => {
    if (!details) return '—'
    if (typeof details === 'string') return details
    if (method === 'UPI' || details.vpa || details.upi_id) {
      return `UPI: ${maskUpiId(details.vpa || details.upi_id)}`
    }
    if (method === 'BANK_TRANSFER' || details.account_number) {
      const bank = details.bank_name ? `${details.bank_name} ` : ''
      return `${bank}(A/C: ${maskAccountNumber(details.account_number)})`
    }
    return JSON.stringify(details)
  }

  // 5. Handle Withdrawal Request via Secure Phase 10.1 RPC
  const handleWithdrawSubmit = async (e) => {
    e.preventDefault()

    // Whole-rupee validation
    const trimmedAmount = (withdrawAmountInput || '').toString().trim()
    const wholeRupeeRegex = /^\d+$/
    if (!trimmedAmount || !wholeRupeeRegex.test(trimmedAmount)) {
      showError('Please enter a valid whole rupee amount (no decimals or paise permitted).', 'Invalid Amount')
      return
    }

    const num = parseInt(trimmedAmount, 10)
    if (isNaN(num) || num <= 0) {
      showError('Please enter a valid withdrawal amount.', 'Invalid Amount')
      return
    }

    if (num < 100) {
      showError('Minimum withdrawal amount is ₹100.', 'Minimum Amount ₹100')
      return
    }

    if (num > authoritativeBalance) {
      showError(`Insufficient wallet balance. You have ₹${authoritativeBalance} available.`, 'Insufficient Balance')
      return
    }

    // Validate payout details based on chosen method
    let payoutDetails = {}
    if (withdrawalPayoutMethod === 'UPI') {
      const trimmedUpi = upiIdInput.trim()
      const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/
      if (!trimmedUpi || !upiRegex.test(trimmedUpi)) {
        showError('Please enter a valid UPI ID (e.g. username@okhdfcbank or 9876543210@ybl).', 'Invalid UPI ID')
        return
      }
      payoutDetails = { vpa: trimmedUpi }
    } else if (withdrawalPayoutMethod === 'BANK_TRANSFER') {
      const accNum = bankAccountNumber.trim()
      const accConfirm = bankAccountConfirm.trim()
      const ifsc = bankIfsc.trim().toUpperCase()
      const holder = bankAccountHolder.trim()
      const bank = bankName.trim()

      if (!accNum || accNum.length < 8 || accNum.length > 20 || !/^\d+$/.test(accNum)) {
        showError('Please enter a valid bank account number (8-20 digits).', 'Invalid Account Number')
        return
      }
      if (accNum !== accConfirm) {
        showError('Bank account numbers do not match. Please verify.', 'Account Mismatch')
        return
      }
      if (!ifsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
        showError('Please enter a valid 11-character Indian Bank IFSC code (e.g. HDFC0001234).', 'Invalid IFSC Code')
        return
      }
      if (!holder || holder.length < 2) {
        showError('Please enter the account holder name as registered with the bank.', 'Invalid Holder Name')
        return
      }
      if (!bank || bank.length < 2) {
        showError('Please enter the bank name.', 'Invalid Bank Name')
        return
      }
      payoutDetails = {
        account_number: accNum,
        ifsc_code: ifsc,
        account_holder_name: holder,
        bank_name: bank,
      }
    }

    const idempotencyKey = withdrawalIdempotencyKey || `with_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    if (!withdrawalIdempotencyKey) {
      setWithdrawalIdempotencyKey(idempotencyKey)
    }

    setIsSubmittingWithdrawal(true)

    try {
      if (user?.id) {
        const res = await requestWithdrawal({
          amount: num,
          payoutDetails,
          payoutMethod: withdrawalPayoutMethod,
          idempotencyKey,
        })
        if (res && res.success === false) {
          throw new Error(res.message || res.error || 'Withdrawal processing failed.')
        }
      }

      showSuccess(`Withdrawal request for ₹${num} submitted! Funds are locked pending admin review.`, 'Payout Request Submitted')
      setIsWithdrawModalOpen(false)
      setWithdrawAmountInput('')
      setUpiIdInput('')
      setBankAccountNumber('')
      setBankAccountConfirm('')
      setBankIfsc('')
      setBankAccountHolder('')
      setBankName('')
      setWithdrawalIdempotencyKey(null)
      await syncWalletData()
    } catch (err) {
      showError(err.message || 'Withdrawal Failed', 'Withdrawal Failed')
    } finally {
      setIsSubmittingWithdrawal(false)
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
    <div className="bg-[#000000] text-[#A1A1AA] font-body min-h-screen pb-28 sm:pb-32 antialiased text-xs overflow-x-hidden">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6 sm:space-y-8 font-mono">

        {/* ================================================== */}
        {/* 1. WALLET HEADER & BREADCRUMBS                     */}
        {/* ================================================== */}
        <section aria-label="Wallet Header" className="space-y-3">
          <div className="flex items-center justify-between">
            <Link
              to="/profile"
              className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#FFB900] transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Return to Profile</span>
            </Link>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10px] font-bold uppercase tracking-wider bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30">
                <span className="w-1.5 h-1.5 rounded-none bg-[#10B981] animate-pulse"></span>
                <span>WALLET STATUS: LIVE</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[10px] font-bold uppercase tracking-wider bg-[#18181B] text-[#FFB900] border border-[#FFB900]/20">
                <ShieldCheck className="w-3 h-3 text-[#FFB900]" />
                <span>SECURE WALLET</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[#27272A] pb-4">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight uppercase">
                WALLET & LEDGER
              </h1>
              <p className="text-xs text-[#A1A1AA] font-sans">
                Real-time competitive tournament finances & instant payouts
              </p>
            </div>

            <span className="self-start sm:self-auto px-2.5 py-1 rounded-none bg-[#18181B] border border-[#27272A] text-[10px] font-bold text-[#FF8C00] tracking-wider uppercase">
              FREE FIRE INDIA ONLY
            </span>
          </div>
        </section>

        {/* Global Error Banner */}
        {walletError && (
          <div className="p-4 rounded-none border border-red-900/50 bg-red-950/20 text-red-400 flex items-center justify-between gap-3 font-sans">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              <div>
                <p className="text-xs font-bold uppercase font-mono">{walletError}</p>
                <p className="text-[11px] text-red-300/80">Please try again later or refresh the balance.</p>
              </div>
            </div>
            <button
              onClick={handleRefreshBalance}
              className="px-3 py-1.5 rounded-none bg-red-900/40 hover:bg-red-900/60 text-xs font-mono font-bold text-white border border-red-700/50 cursor-pointer"
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
          <article className="md:col-span-7 bg-[#111215] border border-[#27272A] rounded-none p-5 sm:p-7 relative overflow-hidden  flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFB900]/5 rounded-none blur-3xl pointer-events-none -z-10"></div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#FFB900] uppercase tracking-wider bg-[#FFB900]/10 px-2.5 py-1 rounded-none border border-[#FFB900]/20">
                  <Wallet className="w-3.5 h-3.5 shrink-0" />
                  <span>AVAILABLE BALANCE</span>
                </div>

                <button
                  type="button"
                  onClick={handleRefreshBalance}
                  disabled={isRefreshing}
                  className="p-2 rounded-none bg-[#18181B] border border-[#27272A] text-[#A1A1AA] hover:text-[#FFB900] hover:border-[#FFB900]/40 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
                  title="Synchronize Wallet Balance"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#FFB900]' : ''}`} />
                </button>
              </div>

              <div className="space-y-1 my-2">
                {isPageLoading ? (
                  <div className="h-12 w-40 bg-[#18181B] animate-pulse rounded-none my-1"></div>
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
                <span className="text-[11px] text-[#A1A1AA] block uppercase font-sans tracking-wide">
                  INR Player Wallet • Ready for tournament entry
                </span>
              </div>
            </div>

            {/* Quick Balance Actions */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-6 pt-4 border-t border-[#27272A]">
              <button
                type="button"
                disabled
                title="Online wallet top-up is temporarily disabled while backend gateway upgrades are deployed."
                className="py-3 bg-[#18181B] text-[#71717A] border border-[#27272A] font-bold uppercase tracking-wider rounded-none text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed opacity-60 min-h-[44px]"
              >
                <PlusCircle className="w-4 h-4 shrink-0" />
                <span>ADD MONEY</span>
                <span className="text-[9px] uppercase tracking-wider text-[#A1A1AA] bg-[#27272A] px-1.5 py-0.5 rounded-none font-mono">PAUSED</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setWithdrawAmountInput('')
                  setUpiIdInput('')
                  setBankAccountNumber('')
                  setBankAccountConfirm('')
                  setBankIfsc('')
                  setBankAccountHolder('')
                  setBankName('')
                  setWithdrawalPayoutMethod('UPI')
                  setWithdrawalIdempotencyKey(null)
                  setIsWithdrawModalOpen(true)
                }}
                className="py-3 bg-[#18181B] hover:bg-[#18181B] text-white hover:text-[#FFB900] border border-[#27272A] hover:border-[#FFB900]/40 font-bold uppercase tracking-wider rounded-none text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                <ArrowUpRight className="w-4 h-4 shrink-0" />
                <span>WITHDRAW</span>
              </button>
            </div>
          </article>

          {/* Single Authoritative Prize Earnings Metric Card */}
          <article className="md:col-span-5 bg-[#111215] border border-[#27272A] rounded-none p-5 sm:p-7 relative overflow-hidden  flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#FFB900]/5 rounded-none blur-3xl pointer-events-none -z-10"></div>

            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#FFB900] uppercase tracking-wider bg-[#FFB900]/10 px-2.5 py-1 rounded-none border border-[#FFB900]/20 mb-4">
                <Trophy className="w-3.5 h-3.5 shrink-0" />
                <span>PRIZE EARNINGS</span>
              </div>

              <div className="space-y-1 my-2">
                {loadingPrizeEarnings ? (
                  <div className="h-10 w-32 bg-[#18181B] animate-pulse rounded-none my-1"></div>
                ) : (
                  <span className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-[#FFB900] block">
                    {prizeEarnings !== null && prizeEarnings > 0
                      ? `₹${Math.floor(prizeEarnings).toLocaleString('en-IN')}`
                      : '—'}
                  </span>
                )}
                <span className="text-[11px] text-[#A1A1AA] block uppercase font-sans tracking-wide">
                  Confirmed Free Fire India Tournament Winnings
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#27272A] mt-6">
              <div className="flex items-center justify-between text-[11px] text-[#A1A1AA] font-sans">
                <span>Direct Ledger Accounting</span>
                <span className="text-[#10B981] font-mono font-bold">100% Credited</span>
              </div>
            </div>
          </article>

        </section>

        {/* ================================================== */}
        {/* 2.5 WITHDRAWAL REQUESTS QUEUE / HISTORY            */}
        {/* ================================================== */}
        <section aria-label="Withdrawal Requests" className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-[#FF8C00]" />
                <span>WITHDRAWAL REQUESTS</span>
              </h2>
              <span className="px-2 py-0.5 rounded-none bg-[#18181B] border border-[#27272A] text-[10px] font-mono text-[#FF8C00]">
                {userWithdrawals.length} {userWithdrawals.length === 1 ? 'Request' : 'Requests'}
              </span>
            </div>

            <span className="text-[10px] text-[#A1A1AA] font-sans hidden sm:inline-block">
              Manual Admin Review & Direct Bank / UPI Disbursement
            </span>
          </div>

          {loadingWithdrawals ? (
            <div className="space-y-3">
              {[1, 2].map((n) => (
                <div key={n} className="h-20 bg-[#111215] border border-[#27272A] rounded-none animate-pulse"></div>
              ))}
            </div>
          ) : userWithdrawals.length === 0 ? (
            <div className="py-10 text-center border border-[#27272A] bg-[#111215] rounded-none p-6 space-y-2">
              <ArrowUpRight className="w-8 h-8 text-[#71717A] mx-auto" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                NO WITHDRAWAL REQUESTS YET
              </h3>
              <p className="text-[11px] text-[#A1A1AA] font-sans max-w-sm mx-auto">
                When you request a payout, its live review and disbursement status will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {userWithdrawals.map((w) => {
                const createdAt = w.created_at ? new Date(w.created_at) : new Date()
                const dateStr = createdAt.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
                const timeStr = createdAt.toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                })

                return (
                  <article
                    key={w.id}
                    className="p-4 sm:p-5 rounded-none bg-[#111215] border border-[#27272A] hover:border-[#FF8C00]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 "
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-none border border-[#FF8C00]/30 bg-[#FF8C00]/10 text-[#FF8C00] flex items-center justify-center shrink-0 mt-0.5">
                        <ArrowUpRight className="w-5 h-5" />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-none text-[10px] font-black uppercase tracking-wider border bg-[#FF8C00]/10 text-[#FF8C00] border-[#FF8C00]/30">
                            {w.payout_method === 'BANK_TRANSFER' ? 'BANK TRANSFER' : 'UPI TRANSFER'}
                          </span>

                          <span className="text-[10px] text-[#71717A] font-mono">
                            {dateStr} • {timeStr}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-white truncate max-w-md">
                          {formatPayoutSummary(w.payout_method, w.payout_details)}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-[#A1A1AA] font-mono flex-wrap">
                          <span>Ref: {w.id.substring(0, 8)}...</span>
                          {w.payment_reference && (
                            <>
                              <span>&bull;</span>
                              <span className="text-[#10B981] font-bold">UTR: {w.payment_reference}</span>
                            </>
                          )}
                          {w.rejection_reason && (
                            <>
                              <span>&bull;</span>
                              <span className="text-[#EF4444]">Reason: {w.rejection_reason}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#27272A] shrink-0">
                      <span className="text-sm sm:text-base font-black font-mono text-[#FF8C00]">
                        ₹{Math.floor(Number(w.amount || 0))}
                      </span>

                      <div className="mt-1">
                        {w.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[9.5px] font-bold text-[#FFB900] bg-[#FFB900]/10 border border-[#FFB900]/30 uppercase">
                            <Clock className="w-3 h-3" />
                            <span>PENDING REVIEW</span>
                          </span>
                        )}
                        {w.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[9.5px] font-bold text-[#FFB900] bg-[#FFB900]/10 border border-[#FFB900]/30 uppercase">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>APPROVED - PROCESSING</span>
                          </span>
                        )}
                        {w.status === 'PAID' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[9.5px] font-bold text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/30 uppercase">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>PAID</span>
                          </span>
                        )}
                        {w.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[9.5px] font-bold text-[#EF4444] bg-red-950/40 border border-red-900/50 uppercase">
                            <AlertCircle className="w-3 h-3" />
                            <span>REJECTED (REFUNDED)</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {/* ================================================== */}
        {/* 3. TRANSACTION HISTORY SECTION                     */}
        {/* ================================================== */}
        <section aria-label="Transaction History" className="space-y-4">

          {/* Section Controls: Title, Search, Filter Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#27272A] pb-4">
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                TRANSACTION HISTORY
              </h2>
              <span className="px-2 py-0.5 rounded-none bg-[#18181B] border border-[#27272A] text-[10px] font-mono text-[#FFB900]">
                {filteredTransactions.length} {filteredTransactions.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Filter Tabs: ALL, CREDITS (+), DEBITS (-) */}
              <div className="flex items-center p-1 bg-[#111215] border border-[#27272A] rounded-none text-[11px] font-mono font-bold">
                <button
                  type="button"
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-3 py-1.5 rounded-none uppercase transition-all cursor-pointer ${
                    activeFilter === 'ALL'
                      ? 'bg-[#FFB900] text-[#000000] '
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  ALL
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('CREDITS')}
                  className={`px-3 py-1.5 rounded-none uppercase transition-all cursor-pointer ${
                    activeFilter === 'CREDITS'
                      ? 'bg-[#10B981] text-[#000000] '
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  CREDITS (+)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('DEBITS')}
                  className={`px-3 py-1.5 rounded-none uppercase transition-all cursor-pointer ${
                    activeFilter === 'DEBITS'
                      ? 'bg-[#EF4444] text-[#000000] '
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  DEBITS (-)
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search statement..."
                  className="w-full sm:w-48 bg-[#111215] border border-[#27272A] rounded-none pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#71717A] focus:border-[#FFB900] focus:outline-none transition-colors h-[38px] font-sans"
                />
              </div>
            </div>
          </div>

          {/* Transactions List */}
          {isPageLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-20 bg-[#111215] border border-[#27272A] rounded-none animate-pulse"></div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            /* Empty State: No Transactions Yet */
            <div className="py-16 text-center border border-[#27272A] bg-[#111215] rounded-none p-6 space-y-3">
              <Wallet className="w-10 h-10 text-[#71717A] mx-auto" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                NO TRANSACTIONS YET
              </h3>
              <p className="text-xs text-[#A1A1AA] font-sans max-w-sm mx-auto">
                Add money or participate in a Free Fire India tournament to begin your wallet history.
              </p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            /* Filter/Search Empty State */
            <div className="py-14 text-center border border-[#27272A] bg-[#111215] rounded-none p-6 space-y-2.5">
              <AlertCircle className="w-8 h-8 text-[#71717A] mx-auto" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                NO MATCHING TRANSACTIONS
              </h3>
              <p className="text-xs text-[#A1A1AA] font-sans max-w-sm mx-auto">
                No transactions match the selected filter or search query.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => {
                const isCredit = tx.direction === 'CREDIT'
                const isPrize = tx.type === 'PRIZE_CREDIT'

                return (
                  <article
                    key={tx.id}
                    className="p-4 sm:p-5 rounded-none bg-[#111215] border border-[#27272A] hover:border-[#FFB900]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 "
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-none border flex items-center justify-center shrink-0 mt-0.5 ${
                          isCredit
                            ? isPrize
                              ? 'bg-[#FFB900]/10 text-[#FFB900] border-[#FFB900]/30'
                              : 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                            : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
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
                            className={`px-2 py-0.5 rounded-none text-[10px] font-black uppercase tracking-wider border ${
                              isCredit
                                ? isPrize
                                  ? 'bg-[#FFB900]/10 text-[#FFB900] border-[#FFB900]/30'
                                  : 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                                : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
                            }`}
                          >
                            {tx.category}
                          </span>

                          <span className="text-[10px] text-[#71717A] font-mono">
                            {tx.date} • {tx.time}
                          </span>
                        </div>

                        <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-md" title={tx.description}>
                          {tx.description}
                        </h3>

                        <div className="flex items-center gap-3 text-[10px] text-[#A1A1AA] font-mono">
                          <span>Ref: {tx.id.substring(0, 8)}...</span>
                          <span>&bull;</span>
                          <span>Bal: ₹{Math.floor(tx.balanceAfter)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#27272A]">
                      <span
                        className={`text-sm sm:text-base font-black font-mono ${
                          isCredit
                            ? isPrize
                              ? 'text-[#FFB900]'
                              : 'text-[#10B981]'
                            : 'text-[#EF4444]'
                        }`}
                      >
                        {isCredit ? '+' : '−'}₹{Math.abs(tx.amount)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-[#10B981] uppercase">
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
          <div className="w-full max-w-md bg-[#111215] border border-[#27272A] rounded-none p-6 space-y-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => {
                setIsDepositModalOpen(false)
                setTopupIdempotencyKey(null)
                setIsSubmittingTopup(false)
                setTopupStatus(null)
              }}
              disabled={isSubmittingTopup}
              className="absolute top-4 right-4 p-1.5 text-[#A1A1AA] hover:text-white rounded-none bg-[#18181B] border border-[#27272A] transition-colors disabled:opacity-40 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {famgatewaySession ? (
              /* Active FamGateway UPI Top-Up Session */
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#FFB900] uppercase tracking-wider">
                    FAMGATEWAY UPI CHECKOUT
                  </span>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">
                    COMPLETE UPI PAYMENT
                  </h3>
                  <p className="text-xs text-[#A1A1AA] font-sans">
                    Complete your payment of <strong className="text-white">₹{famgatewaySession.payableAmount || famgatewaySession.amount}</strong> via any UPI app.
                  </p>
                </div>

                <div className="p-3 bg-[#18181B] border border-[#27272A] space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[#A1A1AA]">
                    <span>Order Reference:</span>
                    <span className="font-mono text-white text-[11px]">{famgatewaySession.orderId}</span>
                  </div>
                  <div className="flex justify-between items-center text-[#A1A1AA]">
                    <span>Amount Payable:</span>
                    <span className="font-mono text-[#FFB900] font-bold text-sm">₹{famgatewaySession.payableAmount || famgatewaySession.amount}</span>
                  </div>
                </div>

                {/* Mobile Direct UPI Intent */}
                {famgatewaySession.upiIntent && (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined' && famgatewaySession.upiIntent) {
                        window.location.href = famgatewaySession.upiIntent
                      }
                    }}
                    className="w-full py-3 bg-[#FFB900] hover:bg-[#FFB900] text-[#000000] font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <Zap className="w-4 h-4 shrink-0" />
                    <span>PAY VIA UPI APP</span>
                  </button>
                )}

                {/* Dynamic QR Toggle */}
                {famgatewaySession.qrUrl && (
                  <div className="space-y-2 pt-1 border-t border-[#27272A]">
                    <button
                      type="button"
                      onClick={() => setShowQrCode(!showQrCode)}
                      className="w-full py-2 bg-[#18181B] border border-[#27272A] hover:border-[#FFB900]/40 text-[#A1A1AA] hover:text-white text-[11px] font-bold uppercase transition-all cursor-pointer"
                    >
                      {showQrCode ? 'Hide QR Code' : 'Show UPI QR Code'}
                    </button>
                    {showQrCode && (
                      <div className="flex flex-col items-center justify-center p-3 bg-white rounded-none">
                        <img
                          src={famgatewaySession.qrUrl}
                          alt="FamGateway UPI QR"
                          className="w-44 h-44 object-contain"
                        />
                        <span className="text-[10px] text-black font-mono font-bold mt-1">Scan with any UPI App</span>
                      </div>
                    )}
                  </div>
                )}

                {isPollingExpired ? (
                  <div className="p-2.5 rounded-none bg-red-950/30 border border-red-700/50 text-red-300 text-xs flex items-center gap-2 font-sans">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>Payment verification timed out. If money was debited, click "I Have Paid" below or contact support.</span>
                  </div>
                ) : isPollingActive ? (
                  <div className="p-2.5 rounded-none bg-[#FFB900]/10 border border-[#FFB900]/30 text-[#FFB900] text-xs flex items-center gap-2 font-sans">
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>Awaiting payment clearance... Polling bank network.</span>
                  </div>
                ) : null}

                <div className="flex gap-2 pt-2 border-t border-[#27272A]">
                  <button
                    type="button"
                    onClick={() => {
                      setFamgatewaySession(null)
                      setIsDepositModalOpen(false)
                      setIsSubmittingTopup(false)
                      setTopupStatus(null)
                    }}
                    className="flex-1 py-2 bg-[#18181B] border border-[#27272A] hover:border-red-500 hover:text-red-400 text-xs font-bold uppercase transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleManualVerifyTopup}
                    disabled={isVerifyingSession}
                    className="flex-1 py-2 bg-[#FFB900] text-black font-bold text-xs uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isVerifyingSession ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying</span>
                      </>
                    ) : (
                      'I Have Paid'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDepositSubmit} className="space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#FFB900] uppercase tracking-wider">
                    ONLINE WALLET TOP-UP
                  </span>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">
                    ADD MONEY
                  </h3>
                  <p className="text-xs text-[#A1A1AA] font-sans">
                    Top up your wallet balance instantly for tournament registrations. Allowed: ₹1 through ₹200 per transaction. Whole rupees only.
                  </p>
                </div>

                {/* Preset Buttons */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-[#A1A1AA]">
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
                        className={`py-2 rounded-none text-xs font-bold font-mono transition-all border cursor-pointer disabled:opacity-50 ${
                          amountInput === preset.toString()
                            ? 'bg-[#FFB900]/15 border-[#FFB900] text-[#FFB900]'
                            : 'bg-[#18181B] border-[#27272A] text-white hover:border-[#FFB900]/40'
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
                    <label className="uppercase font-bold text-[#A1A1AA]">
                      Top-Up Amount (INR)
                    </label>
                    <span className="text-[#FFB900] font-mono">
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
                      className="w-full bg-[#18181B] border border-[#27272A] rounded-none pl-8 pr-4 py-2.5 text-sm text-white focus:border-[#FFB900] focus:outline-none font-mono disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Payment Gateway Options */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-[#A1A1AA]">
                    Payment Gateway
                  </label>
                  <div className="p-2.5 bg-[#18181B] border border-[#27272A] text-xs flex items-center justify-between">
                    <span className="text-[#A1A1AA]">Provider:</span>
                    <span className="text-[#FFB900] font-bold uppercase">FamGateway UPI</span>
                  </div>
                </div>

                {/* Status Indicator during Payment */}
                {topupStatus === 'PROCESSING' && (
                  <div className="p-2.5 rounded-none bg-[#FFB900]/10 border border-[#FFB900]/30 text-[#FFB900] text-xs flex items-center gap-2 font-sans">
                    <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                    <span>INITIALIZING TOP-UP: Connecting to payment gateway...</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-3 border-t border-[#27272A]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDepositModalOpen(false)
                      setTopupIdempotencyKey(null)
                      setIsSubmittingTopup(false)
                      setTopupStatus(null)
                    }}
                    disabled={isSubmittingTopup}
                    className="flex-1 py-2.5 bg-[#18181B] border border-[#27272A] hover:border-red-500 hover:text-red-400 rounded-none text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingTopup || !amountInput}
                    className="flex-1 py-2.5 bg-[#FFB900] hover:bg-[#FFB900] text-[#000000] rounded-none text-xs font-black uppercase transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmittingTopup ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>PROCESSING</span>
                      </>
                    ) : (
                      `PROCEED (₹${amountInput || 0})`
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* 5. WITHDRAW FUNDS MODAL                            */}
      {/* ================================================== */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-mono">
          <div className="w-full max-w-lg bg-[#111215] border border-[#27272A] rounded-none p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                if (!isSubmittingWithdrawal) {
                  setIsWithdrawModalOpen(false)
                }
              }}
              disabled={isSubmittingWithdrawal}
              className="absolute top-4 right-4 p-1.5 text-[#A1A1AA] hover:text-white rounded-none bg-[#18181B] border border-[#27272A] transition-colors cursor-pointer disabled:opacity-40"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#FF8C00] uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#FF8C00]" />
                <span>COMPETITIVE PAYOUT DISBURSEMENT</span>
              </span>
              <h3 className="text-lg font-black text-white uppercase tracking-wider">
                REQUEST WITHDRAWAL
              </h3>
              <p className="text-xs text-[#A1A1AA] font-sans">
                Transfer your tournament winnings and balance to your verified bank or UPI account. Available balance: <strong className="text-[#10B981] font-mono">₹{authoritativeBalance}</strong>.
              </p>
            </div>

            {/* Payout Method Selector */}
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold text-[#A1A1AA]">
                Select Disbursement Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWithdrawalPayoutMethod('UPI')}
                  disabled={isSubmittingWithdrawal}
                  className={`py-2.5 px-3 rounded-none border text-xs font-bold font-mono uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    withdrawalPayoutMethod === 'UPI'
                      ? 'bg-[#FFB900]/15 border-[#FFB900] text-[#FFB900] '
                      : 'bg-[#18181B] border-[#27272A] text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>UPI VPA (Instant)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWithdrawalPayoutMethod('BANK_TRANSFER')}
                  disabled={isSubmittingWithdrawal}
                  className={`py-2.5 px-3 rounded-none border text-xs font-bold font-mono uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    withdrawalPayoutMethod === 'BANK_TRANSFER'
                      ? 'bg-[#FFB900]/15 border-[#FFB900] text-[#FFB900] '
                      : 'bg-[#18181B] border-[#27272A] text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Bank Account</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              {/* Amount Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px]">
                  <label className="uppercase font-bold text-[#A1A1AA]">
                    Withdrawal Amount (Whole INR)
                  </label>
                  <span className="text-[#FF8C00] font-mono">
                    Min: ₹100 • Max: ₹{authoritativeBalance}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="100"
                    max={authoritativeBalance}
                    step="1"
                    value={withdrawAmountInput}
                    disabled={isSubmittingWithdrawal}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '')
                      setWithdrawAmountInput(val)
                    }}
                    placeholder="Enter whole rupee amount (min 100)"
                    required
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-none pl-8 pr-4 py-2.5 text-sm text-white focus:border-[#FFB900] focus:outline-none font-mono disabled:opacity-50"
                  />
                </div>
              </div>

              {/* UPI Fields */}
              {withdrawalPayoutMethod === 'UPI' && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-[#A1A1AA]">
                    UPI ID / Virtual Payment Address (VPA)
                  </label>
                  <input
                    type="text"
                    value={upiIdInput}
                    disabled={isSubmittingWithdrawal}
                    onChange={(e) => setUpiIdInput(e.target.value)}
                    placeholder="e.g. username@okhdfcbank or 9876543210@ybl"
                    required
                    className="w-full bg-[#18181B] border border-[#27272A] rounded-none px-4 py-2.5 text-xs text-white focus:border-[#FFB900] focus:outline-none font-mono disabled:opacity-50"
                  />
                  <p className="text-[10px] text-[#71717A] font-sans">
                    Must be registered with BHIM, Google Pay, PhonePe, Paytm, or your banking app.
                  </p>
                </div>
              )}

              {/* Bank Transfer Fields */}
              {withdrawalPayoutMethod === 'BANK_TRANSFER' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-[#A1A1AA]">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        disabled={isSubmittingWithdrawal}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. HDFC Bank, SBI"
                        required
                        className="w-full bg-[#18181B] border border-[#27272A] rounded-none px-3 py-2 text-xs text-white focus:border-[#FFB900] focus:outline-none font-mono disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-[#A1A1AA]">
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        value={bankAccountHolder}
                        disabled={isSubmittingWithdrawal}
                        onChange={(e) => setBankAccountHolder(e.target.value)}
                        placeholder="As on bank passbook"
                        required
                        className="w-full bg-[#18181B] border border-[#27272A] rounded-none px-3 py-2 text-xs text-white focus:border-[#FFB900] focus:outline-none font-mono disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-[#A1A1AA]">
                        Account Number
                      </label>
                      <input
                        type="password"
                        value={bankAccountNumber}
                        disabled={isSubmittingWithdrawal}
                        onChange={(e) => setBankAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Enter account number"
                        required
                        className="w-full bg-[#18181B] border border-[#27272A] rounded-none px-3 py-2 text-xs text-white focus:border-[#FFB900] focus:outline-none font-mono disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] uppercase font-bold text-[#A1A1AA]">
                        Confirm Account Number
                      </label>
                      <input
                        type="text"
                        value={bankAccountConfirm}
                        disabled={isSubmittingWithdrawal}
                        onChange={(e) => setBankAccountConfirm(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Re-enter account number"
                        required
                        className="w-full bg-[#18181B] border border-[#27272A] rounded-none px-3 py-2 text-xs text-white focus:border-[#FFB900] focus:outline-none font-mono disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase font-bold text-[#A1A1AA]">
                      Bank IFSC Code
                    </label>
                    <input
                      type="text"
                      maxLength={11}
                      value={bankIfsc}
                      disabled={isSubmittingWithdrawal}
                      onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                      placeholder="e.g. HDFC0001234, SBIN0004567"
                      required
                      className="w-full bg-[#18181B] border border-[#27272A] rounded-none px-3 py-2 text-xs text-white focus:border-[#FFB900] focus:outline-none font-mono uppercase disabled:opacity-50"
                    />
                  </div>
                </div>
              )}

              {/* Zero-Trust Security Note */}
              <div className="p-3 rounded-none bg-[#18181B] border border-[#27272A] space-y-1 text-[11px] font-sans text-[#A1A1AA]">
                <div className="flex items-center gap-1.5 text-[#FFB900] font-mono font-bold text-[10px] uppercase">
                  <Lock className="w-3 h-3 text-[#FFB900]" />
                  <span>Zero-Trust Payout Security</span>
                </div>
                <p>
                  MJ ESPORTS will <strong>NEVER</strong> ask for your ATM PIN, UPI PIN, passwords, or OTP. Payouts are manually approved and disbursed directly to your designated account.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  disabled={isSubmittingWithdrawal}
                  className="flex-1 py-2.5 bg-[#18181B] border border-[#27272A] hover:border-red-500 hover:text-red-400 rounded-none text-xs font-bold uppercase transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWithdrawal || !withdrawAmountInput || parseInt(withdrawAmountInput, 10) < 100 || parseInt(withdrawAmountInput, 10) > authoritativeBalance}
                  className="flex-1 py-2.5 bg-[#FF8C00] hover:bg-[#FF8C00] text-white rounded-none text-xs font-black uppercase transition-all  cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmittingWithdrawal ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>SUBMITTING</span>
                    </>
                  ) : (
                    `WITHDRAW ₹${withdrawAmountInput || 0}`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
