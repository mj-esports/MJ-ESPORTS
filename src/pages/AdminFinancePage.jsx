import { useTournaments } from '../contexts/TournamentContext'
import { useFinanceData } from '../hooks/useFinanceData'
import { FinanceSummaryCards } from '../components/finance/FinanceSummaryCards'
import { RevenueChart } from '../components/finance/RevenueChart'
import { TournamentRevenueTable } from '../components/finance/TournamentRevenueTable'
import { PaymentAnalytics } from '../components/finance/PaymentAnalytics'
import { RecentTransactions } from '../components/finance/RecentTransactions'
import { FinanceFilters } from '../components/finance/FinanceFilters'
import { FinanceEmptyState } from '../components/finance/FinanceEmptyState'
import { FinanceLoadingSkeleton } from '../components/finance/FinanceLoadingSkeleton'
import { exportToCSV, exportToExcel } from '../utils/financeCalculations'
import { DollarSign, RefreshCw, FileText, FileSpreadsheet, Printer, CreditCard } from 'lucide-react'

export default function AdminFinancePage() {
  const { tournaments } = useTournaments()
  const {
    filteredTransactions,
    summaryMetrics,
    tournamentRevenues,
    groupedRevenue,
    loading,
    error,
    filters,
    setFilters,
    refetch,
  } = useFinanceData(tournaments)

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return alert('No transaction records to export.')
    const headers = ['Transaction ID', 'Player Name', 'Player Email', 'Tournament', 'Game', 'Amount (INR)', 'Method', 'Status', 'Date']
    const rows = filteredTransactions.map((tx) => [
      tx.razorpayPaymentId,
      `"${tx.playerName}"`,
      `"${tx.playerEmail}"`,
      `"${tx.tournamentTitle}"`,
      `"${tx.game}"`,
      tx.amount,
      `"${tx.paymentMethod}"`,
      tx.paymentStatus,
      `"${new Date(tx.createdAt).toLocaleString()}"`,
    ])
    exportToCSV(`MJ_ESPORTS_Financial_Report_${Date.now()}`, headers, rows)
  }

  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) return alert('No transaction records to export.')
    const headers = ['Transaction ID', 'Player Name', 'Player Email', 'Tournament', 'Game', 'Amount (INR)', 'Method', 'Status', 'Date']
    const rows = filteredTransactions.map((tx) => [
      tx.razorpayPaymentId,
      tx.playerName,
      tx.playerEmail,
      tx.tournamentTitle,
      tx.game,
      tx.amount,
      tx.paymentMethod,
      tx.paymentStatus,
      new Date(tx.createdAt).toLocaleString(),
    ])
    exportToExcel(`MJ_ESPORTS_Financial_Report_${Date.now()}`, headers, rows)
  }

  const handleExportPDF = () => {
    window.print()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-[#00f2ff]" />
            <h1 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight">
              FINANCE DASHBOARD
            </h1>
          </div>
          <p className="text-xs text-[#8e9dae] mt-1 font-mono">
            Automated Razorpay revenue calculation & transaction auditing
          </p>
        </div>

        {/* Sync & Export Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={refetch}
            className="px-3 py-2 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] text-[#00f2ff] rounded text-xs font-bold uppercase transition-colors flex items-center gap-1.5 min-h-[38px]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] text-white hover:text-[#00f2ff] rounded text-xs font-bold uppercase transition-colors flex items-center gap-1.5 min-h-[38px]"
          >
            <FileText className="w-3.5 h-3.5 text-[#00f2ff]" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] text-white hover:text-[#00ff9d] rounded text-xs font-bold uppercase transition-colors flex items-center gap-1.5 min-h-[38px]"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#00ff9d]" />
            <span>Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3 py-2 bg-[#fe6b00] hover:bg-[#ff8533] text-slate-950 rounded text-xs font-extrabold uppercase transition-colors flex items-center gap-1.5 min-h-[38px] shadow-[0_0_12px_rgba(254,107,0,0.4)]"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {loading ? (
        <FinanceLoadingSkeleton />
      ) : error ? (
        <div className="p-4 bg-red-950/60 border border-[#ff3366] rounded-xl text-xs text-[#ff3366]">
          {error}
        </div>
      ) : (
        <>
          {/* Summary Metric Cards */}
          <FinanceSummaryCards metrics={summaryMetrics} />

          {/* Revenue Chart */}
          <RevenueChart groupedData={groupedRevenue} />

          {/* Tournament Revenue Table */}
          <TournamentRevenueTable tournaments={tournamentRevenues} />

          {/* Payment Analytics */}
          <PaymentAnalytics transactions={filteredTransactions} tournaments={tournamentRevenues} />

          {/* Recent Transactions & Filtering */}
          <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3a494b]/60 pb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#00f2ff]" />
                <h2 className="font-display-lg text-lg font-extrabold text-white uppercase tracking-wider">
                  RECENT TRANSACTIONS
                </h2>
              </div>
              <span className="text-xs text-[#8e9dae] font-mono">Showing {filteredTransactions.length} Verified Entries</span>
            </div>

            <FinanceFilters filters={filters} setFilters={setFilters} tournaments={tournaments} />

            <RecentTransactions transactions={filteredTransactions} loading={loading} />
          </div>
        </>
      )}

    </div>
  )
}
