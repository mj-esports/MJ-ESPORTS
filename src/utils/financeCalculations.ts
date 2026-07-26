export interface TransactionRecord {
  id: string
  razorpayPaymentId: string
  playerName: string
  playerEmail: string
  tournamentId: string
  tournamentTitle: string
  game: string
  amount: number
  paymentMethod: string
  paymentStatus: 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED'
  refundStatus: string
  createdAt: string
}

export interface TournamentRevenueRecord {
  id: string
  title: string
  game: string
  entryFee: number
  maxSlots: number
  registeredPlayers: number
  remainingSlots: number
  fillPercentage: number
  successfulPayments: number
  pendingPayments: number
  collectedAmount: number
  prizePool: number
  gatewayCharges: number
  estimatedProfit: number
  status: string
}

export interface FinanceSummaryMetrics {
  totalRevenue: number
  todayRevenue: number
  weeklyRevenue: number
  monthlyRevenue: number
  successfulCount: number
  pendingCount: number
  failedCount: number
  refundedCount: number
  totalRegistrations: number
  avgEntryFee: number
}

export interface RevenueGroupedData {
  daily: { date: string; amount: number }[]
  weekly: { week: string; amount: number }[]
  monthly: { month: string; amount: number }[]
  yearly: { year: string; amount: number }[]
}

/**
 * Compute Executive Financial Metrics
 */
export function calculateFinanceMetrics(
  transactions: TransactionRecord[],
  tournaments: any[]
): FinanceSummaryMetrics {
  const now = new Date()
  const todayStr = now.toDateString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  let totalRevenue = 0
  let todayRevenue = 0
  let weeklyRevenue = 0
  let monthlyRevenue = 0

  let successfulCount = 0
  let pendingCount = 0
  let failedCount = 0
  let refundedCount = 0

  transactions.forEach((tx) => {
    const txDate = new Date(tx.createdAt)
    const isSuccess = tx.paymentStatus === 'SUCCESS'

    if (isSuccess) {
      totalRevenue += tx.amount
      successfulCount += 1

      if (txDate.toDateString() === todayStr) todayRevenue += tx.amount
      if (txDate >= sevenDaysAgo) weeklyRevenue += tx.amount
      if (txDate >= thirtyDaysAgo) monthlyRevenue += tx.amount
    } else if (tx.paymentStatus === 'PENDING') {
      pendingCount += 1
    } else if (tx.paymentStatus === 'FAILED') {
      failedCount += 1
    } else if (tx.paymentStatus === 'REFUNDED') {
      refundedCount += 1
    }
  })

  const totalRegistrations = transactions.length
  let feeSum = 0
  tournaments.forEach((t) => {
    const fee = parseInt((t.entryFee || t.entry_fee || '0').replace(/[^0-9]/g, ''), 10) || 0
    feeSum += fee
  })
  const avgEntryFee = tournaments.length > 0 ? Math.round(feeSum / tournaments.length) : 0

  return {
    totalRevenue,
    todayRevenue,
    weeklyRevenue,
    monthlyRevenue,
    successfulCount,
    pendingCount,
    failedCount,
    refundedCount,
    totalRegistrations,
    avgEntryFee,
  }
}

/**
 * Compute Tournament Revenue List
 */
export function calculateTournamentRevenues(
  tournaments: any[],
  transactions: TransactionRecord[]
): TournamentRevenueRecord[] {
  return tournaments.map((t) => {
    const entryFee = parseInt((t.entryFee || t.entry_fee || '0').replace(/[^0-9]/g, ''), 10) || 0
    const maxSlots = Number(t.maxTeams || t.max_teams || 32)
    const prizePool = parseInt((t.prizePool || t.prize_pool || '0').replace(/[^0-9]/g, ''), 10) || 0

    const tTxs = transactions.filter((tx) => tx.tournamentId === t.id)
    const registeredPlayers = tTxs.length
    const successfulPayments = tTxs.filter((tx) => tx.paymentStatus === 'SUCCESS').length
    const pendingPayments = tTxs.filter((tx) => tx.paymentStatus === 'PENDING').length

    const remainingSlots = Math.max(0, maxSlots - registeredPlayers)
    const fillPercentage = maxSlots > 0 ? Math.min(100, Math.round((registeredPlayers / maxSlots) * 100)) : 0

    // Collected Amount = Entry Fee * Successful Paid Registrations
    const collectedAmount = entryFee * successfulPayments
    // 2% Gateway Charge
    const gatewayCharges = Math.round(collectedAmount * 0.02)
    // Estimated Platform Profit = Collected Amount - Prize Pool - Gateway Charges
    const estimatedProfit = collectedAmount - prizePool - gatewayCharges

    return {
      id: t.id,
      title: t.title || 'Tournament',
      game: (t.game || 'Free Fire MAX').includes('Free Fire') ? 'Free Fire MAX' : 'BGMI Mobile',
      entryFee,
      maxSlots,
      registeredPlayers,
      remainingSlots,
      fillPercentage,
      successfulPayments,
      pendingPayments,
      collectedAmount,
      prizePool,
      gatewayCharges,
      estimatedProfit,
      status: t.status || 'Upcoming',
    }
  })
}

/**
 * Group Revenue by Time Periods (Daily, Weekly, Monthly, Yearly)
 */
export function groupRevenueByPeriod(transactions: TransactionRecord[]): RevenueGroupedData {
  const successful = transactions.filter((t) => t.paymentStatus === 'SUCCESS')

  const dailyMap: Record<string, number> = {}
  const weeklyMap: Record<string, number> = {}
  const monthlyMap: Record<string, number> = {}
  const yearlyMap: Record<string, number> = {}

  successful.forEach((tx) => {
    const dateObj = new Date(tx.createdAt)
    const dayKey = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const monthKey = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    const yearKey = dateObj.getFullYear().toString()
    const weekKey = `W${Math.ceil(dateObj.getDate() / 7)} ${dateObj.toLocaleDateString('en-US', { month: 'short' })}`

    dailyMap[dayKey] = (dailyMap[dayKey] || 0) + tx.amount
    weeklyMap[weekKey] = (weeklyMap[weekKey] || 0) + tx.amount
    monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + tx.amount
    yearlyMap[yearKey] = (yearlyMap[yearKey] || 0) + tx.amount
  })

  const toArr = (map: Record<string, number>, labelKey: string) =>
    Object.entries(map).map(([k, v]) => ({ [labelKey]: k, amount: v } as any))

  return {
    daily: toArr(dailyMap, 'date'),
    weekly: toArr(weeklyMap, 'week'),
    monthly: toArr(monthlyMap, 'month'),
    yearly: toArr(yearlyMap, 'year'),
  }
}

/**
 * Export Utility Functions
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportToExcel(filename: string, headers: string[], rows: (string | number)[][]) {
  const tsvContent = 'data:application/vnd.ms-excel;charset=utf-8,' + [headers.join('\t'), ...rows.map((e) => e.join('\t'))].join('\n')
  const encodedUri = encodeURI(tsvContent)
  const link = document.createElement('a')
  link.setAttribute('href', encodedUri)
  link.setAttribute('download', `${filename}.xls`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
