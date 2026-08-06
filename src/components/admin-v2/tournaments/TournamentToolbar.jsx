import React from 'react'
import { Plus, Search, Filter, LayoutGrid, List } from 'lucide-react'

export default function TournamentToolbar({ viewMode = 'table', setViewMode }) {
  return (
    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
      {/* Search & Filter UI */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tournament title or game..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select className="w-full sm:w-auto bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer">
            <option value="All">All Statuses</option>
            <option value="Registration Open">Registration Open</option>
            <option value="Live Now">Live Now</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* View Toggle & Create Button UI */}
      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
        <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800">
          <button
            onClick={() => setViewMode('table')}
            title="Table View"
            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === 'table'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('cards')}
            title="Card Grid View"
            className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
              viewMode === 'cards'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>

        <button className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          <span>Create Tournament V2</span>
        </button>
      </div>
    </div>
  )
}
