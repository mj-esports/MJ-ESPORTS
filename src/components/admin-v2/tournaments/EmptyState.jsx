import React from 'react'
import { Trophy, RefreshCw, Plus } from 'lucide-react'

export default function EmptyState({
  title = 'No Tournaments Found',
  description = 'There are no esports tournaments matching your current search query or filter selection.',
  onReset,
  onCreate
}) {
  return (
    <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col items-center justify-center max-w-md mx-auto my-8 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-500/5">
        <Trophy className="w-8 h-8 animate-pulse" />
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-white tracking-wide">{title}</h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        {onReset && (
          <button
            onClick={onReset}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            Reset Filters
          </button>
        )}

        {onCreate && (
          <button
            onClick={onCreate}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create Tournament
          </button>
        )}
      </div>
    </div>
  )
}
