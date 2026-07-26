import React from 'react'

export const FinanceLoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={`skel-card-${i}`} className="h-28 bg-[#151a21] border border-[#3a494b]/40 rounded-xl" />
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="h-60 bg-[#151a21] border border-[#3a494b]/40 rounded-xl" />

      {/* Table Skeleton */}
      <div className="h-72 bg-[#151a21] border border-[#3a494b]/40 rounded-xl" />
    </div>
  )
}
