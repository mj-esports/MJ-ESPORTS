import React from 'react'
import { Trophy } from 'lucide-react'
import TournamentList from './tournaments/TournamentList'

export default function TournamentMenu() {
  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-wide flex items-center gap-2">
          <Trophy className="w-5 h-5 text-cyan-400" />
          Tournament Management V2
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure esports leagues, monitor team registrations, and control match schedules.
        </p>
      </div>

      {/* Reusable Tournament Module List */}
      <TournamentList />
    </div>
  )
}
