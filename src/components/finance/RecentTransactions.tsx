import React, { useState, useMemo } from 'react'
import { CreditCard, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react'
import { TransactionRecord } from '../../utils/financeCalculations'
import { FinanceEmptyState } from './FinanceEmptyState'

interface RecentTransactionsProps {
  transactions: TransactionRecord[]
  loading?: boolean
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions, loading }) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<'createdAt' | 'amount'>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const pageSize = 8

  // Sorted Transactions
  const sorted = useMemo(() => {
    return [...transactions].sort((a, b) => {
      if (sortField === 'amount') {
        return sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount
      } else {
        const dA = new Date(a.createdAt).getTime()
        const dB = new Date(b.createdAt).getTime()
        return sortDir === 'asc' ? dA - dB : dB - dA
      }
    })
  }, [transactions, sortField, sortDir])

  const totalPages = Math.ceil(sorted.length / pageSize) || 1
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, currentPage, pageSize])

  const toggleSort = (field: 'createdAt' | 'amount') => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={`skel-tx-${i}`} className="h-10 bg-[#07090c] border border-[#3a494b]/40 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return <FinanceEmptyState message="No financial data available yet." />
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#07090c] border-b border-[#3a494b]/60 font-mono text-[#8e9dae] uppercase tracking-wider">
              <th className="p-3 pl-4">Transaction ID</th>
              <th className="p-3">Player Handle / Email</th>
              <th className="p-3">Tournament</th>
              <th
                className="p-3 text-center cursor-pointer hover:text-white transition-colors"
                onClick={() => toggleSort('amount')}
              >
                <div className="inline-flex items-center gap-1">
                  <span>Amount</span>
                  <ArrowUpDown className="w-3 h-3 text-[#00f2ff]" />
                </div>
              </th>
              <th className="p-3">Method</th>
              <th className="p-3 text-center">Status</th>
              <th
                className="p-3 text-right pr-4 cursor-pointer hover:text-white transition-colors"
                onClick={() => toggleSort('createdAt')}
              >
                <div className="inline-flex items-center gap-1 justify-end">
                  <span>Payment Date</span>
                  <ArrowUpDown className="w-3 h-3 text-[#00f2ff]" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3a494b]/40 font-mono">
            {paginated.map((tx) => (
              <tr key={`tx-item-${tx.id}`} className="hover:bg-[#1d232c] transition-colors">
                <td className="p-3 pl-4 font-bold text-[#00f2ff]">
                  {tx.razorpayPaymentId}
                </td>
                <td className="p-3 font-sans">
                  <span className="font-bold text-white block">{tx.playerName}</span>
                  <span className="text-[10px] text-[#8e9dae]">{tx.playerEmail}</span>
                </td>
                <td className="p-3 font-sans font-medium text-[#e1e2e7] max-w-[160px] truncate">
                  {tx.tournamentTitle}
                </td>
                <td className="p-3 text-center font-extrabold text-[#00ff9d]">
                  ₹{tx.amount}
                </td>
                <td className="p-3 font-sans text-[#8e9dae]">{tx.paymentMethod}</td>
                <td className="p-3 text-center">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      tx.paymentStatus === 'SUCCESS'
                        ? 'bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/40'
                        : tx.paymentStatus === 'PENDING'
                        ? 'bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/40'
                        : tx.paymentStatus === 'FAILED'
                        ? 'bg-red-950/60 text-[#ff3366] border border-[#ff3366]/40'
                        : 'bg-[#fe6b00]/10 text-[#fe6b00] border border-[#fe6b00]/40'
                    }`}
                  >
                    {tx.paymentStatus}
                  </span>
                </td>
                <td className="p-3 text-right pr-4 text-[11px] text-[#8e9dae]">
                  {new Date(tx.createdAt).toLocaleDateString()}{' '}
                  {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-[#3a494b]/60 text-xs">
          <span className="text-[#8e9dae] font-mono">
            Page {currentPage} of {totalPages} ({sorted.length} Entries)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-white disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-white disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
