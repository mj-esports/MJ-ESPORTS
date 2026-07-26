import React from 'react'

export const CardSkeleton = ({ count = 3, height = 'h-64' }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={`card-skel-${i}`}
        className={`${height} bg-[#151a21] border border-[#3a494b]/40 rounded-xl p-5 space-y-4 shadow-xl`}
      >
        <div className="h-6 bg-[#07090c] rounded w-3/4" />
        <div className="h-4 bg-[#07090c] rounded w-1/2" />
        <div className="h-20 bg-[#07090c] rounded w-full mt-4" />
      </div>
    ))}
  </div>
)

export const TableSkeleton = ({ rows = 5, cols = 5 }) => (
  <div className="space-y-3 animate-pulse bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 shadow-xl">
    <div className="h-8 bg-[#07090c] border border-[#3a494b]/40 rounded w-full" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={`table-skel-row-${i}`} className="h-10 bg-[#07090c] border border-[#3a494b]/30 rounded w-full" />
    ))}
  </div>
)

export const ProfileSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-40 bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-6" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="h-24 bg-[#151a21] border border-[#3a494b]/60 rounded-xl" />
      <div className="h-24 bg-[#151a21] border border-[#3a494b]/60 rounded-xl" />
      <div className="h-24 bg-[#151a21] border border-[#3a494b]/60 rounded-xl" />
    </div>
  </div>
)

export default function SkeletonLoader({ type = 'card', count = 3 }) {
  if (type === 'table') return <TableSkeleton rows={count} />
  if (type === 'profile') return <ProfileSkeleton />
  return <CardSkeleton count={count} />
}
