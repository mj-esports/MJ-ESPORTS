import React from 'react'

export default function LoadingState({ count = 3, viewMode = 'table' }) {
  if (viewMode === 'cards') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-slate-800 rounded" />
              <div className="h-5 w-16 bg-slate-800 rounded-full" />
            </div>
            <div className="h-5 w-3/4 bg-slate-800 rounded" />
            <div className="h-3 w-1/2 bg-slate-800/60 rounded" />

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
              <div className="h-4 w-16 bg-slate-800 rounded" />
              <div className="h-4 w-16 bg-slate-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden animate-pulse">
      <div className="p-4 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
        <div className="h-4 w-32 bg-slate-800 rounded" />
        <div className="h-4 w-20 bg-slate-800 rounded" />
      </div>
      <div className="divide-y divide-slate-800/60 p-4 space-y-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-1/3 bg-slate-800 rounded" />
              <div className="h-3 w-1/4 bg-slate-800/60 rounded" />
            </div>
            <div className="h-6 w-20 bg-slate-800 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
