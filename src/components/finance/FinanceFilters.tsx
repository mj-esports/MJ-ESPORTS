import React from 'react'
import { Search } from 'lucide-react'
import { FinanceFiltersState } from '../../hooks/useFinanceData'

interface FinanceFiltersProps {
  filters: FinanceFiltersState
  setFilters: React.Dispatch<React.SetStateAction<FinanceFiltersState>>
  tournaments: any[]
}

export const FinanceFilters: React.FC<FinanceFiltersProps> = ({ filters, setFilters, tournaments }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {/* Search Bar */}
      <div className="relative lg:col-span-2">
        <Search className="w-4 h-4 text-[#8e9dae] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
          placeholder="Search by Payment ID, Player, Email..."
          className="w-full pl-9 pr-3 py-2 bg-[#07090c] border border-[#3a494b] rounded text-xs text-white placeholder-[#8e9dae] focus:outline-none focus:border-[#00f2ff]"
        />
      </div>

      {/* Date Range Filter */}
      <select
        value={filters.dateRange}
        onChange={(e) => setFilters((prev) => ({ ...prev, dateRange: e.target.value as any }))}
        className="bg-[#07090c] border border-[#3a494b] text-white text-xs py-2 px-3 rounded focus:outline-none focus:border-[#00f2ff] font-mono uppercase"
      >
        <option value="ALL">ALL DATES</option>
        <option value="TODAY">TODAY ONLY</option>
        <option value="WEEK">LAST 7 DAYS</option>
        <option value="MONTH">LAST 30 DAYS</option>
      </select>

      {/* Game Filter */}
      <select
        value={filters.game}
        onChange={(e) => setFilters((prev) => ({ ...prev, game: e.target.value as any }))}
        className="bg-[#07090c] border border-[#3a494b] text-white text-xs py-2 px-3 rounded focus:outline-none focus:border-[#00f2ff] font-mono uppercase"
      >
        <option value="ALL">ALL GAMES</option>
        <option value="Free Fire">FREE FIRE MAX</option>
        <option value="BGMI">BGMI MOBILE</option>
      </select>

      {/* Payment Status Filter */}
      <select
        value={filters.status}
        onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as any }))}
        className="bg-[#07090c] border border-[#3a494b] text-white text-xs py-2 px-3 rounded focus:outline-none focus:border-[#00f2ff] font-mono uppercase"
      >
        <option value="ALL">ALL STATUSES</option>
        <option value="SUCCESS">SUCCESS</option>
        <option value="PENDING">PENDING</option>
        <option value="FAILED">FAILED</option>
        <option value="REFUNDED">REFUNDED</option>
      </select>
    </div>
  )
}
