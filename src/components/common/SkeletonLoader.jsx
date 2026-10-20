import React from 'react'

export const CardSkeleton = ({ count = 3, height = 'h-64' }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={`card-skel-${i}`}
        className={`${height} bg-[#111318] border border-[#2A2A30] rounded-none p-5 space-y-4 shadow-lg`}
      >
        <div className="flex justify-between items-center">
          <div className="h-6 bg-[#1B1B1F] rounded-none w-1/2" />
          <div className="h-5 bg-[#1B1B1F] rounded-none w-20" />
        </div>
        <div className="h-4 bg-[#1B1B1F] rounded-none w-3/4" />
        <div className="h-24 bg-[#1B1B1F] rounded-none w-full mt-4" />
        <div className="flex justify-between pt-2">
          <div className="h-4 bg-[#1B1B1F] rounded-none w-1/3" />
          <div className="h-8 bg-[#1B1B1F] rounded-none w-28" />
        </div>
      </div>
    ))}
  </div>
)

export const TableSkeleton = ({ rows = 5, cols = 5 }) => (
  <div className="space-y-3 animate-pulse bg-[#111318] border border-[#2A2A30] rounded-none p-5 shadow-lg">
    <div className="h-10 bg-[#1B1B1F] border border-[#2A2A30] rounded-none w-full" />
    {Array.from({ length: rows }).map((_, i) => (
      <div key={`table-skel-row-${i}`} className="h-12 bg-[#1B1B1F] border border-[#2A2A30]/50 rounded-none w-full" />
    ))}
  </div>
)

export const ProfileSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-44 bg-[#111318] border border-[#2A2A30] rounded-none p-6 flex flex-col justify-between" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="h-28 bg-[#111318] border border-[#2A2A30] rounded-none" />
      <div className="h-28 bg-[#111318] border border-[#2A2A30] rounded-none" />
      <div className="h-28 bg-[#111318] border border-[#2A2A30] rounded-none" />
    </div>
  </div>
)

export const MetricsSkeleton = ({ count = 7 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 animate-pulse">
    {Array.from({ length: count }).map((_, i) => (
      <div key={`metrics-skel-${i}`} className="h-24 bg-[#111318] border border-[#2A2A30] rounded-none p-4 space-y-3">
        <div className="h-3 bg-[#1B1B1F] rounded-none w-2/3" />
        <div className="h-6 bg-[#1B1B1F] rounded-none w-1/2" />
      </div>
    ))}
  </div>
)

export const DetailSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-64 bg-[#111318] border border-[#2A2A30] rounded-none p-8 space-y-4" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 h-96 bg-[#111318] border border-[#2A2A30] rounded-none p-6" />
      <div className="h-96 bg-[#111318] border border-[#2A2A30] rounded-none p-6" />
    </div>
  </div>
)

export default function SkeletonLoader({ type = 'card', count = 3 }) {
  if (type === 'table') return <TableSkeleton rows={count} />
  if (type === 'profile') return <ProfileSkeleton />
  if (type === 'metrics') return <MetricsSkeleton count={count} />
  if (type === 'detail') return <DetailSkeleton />
  return <CardSkeleton count={count} />
}
