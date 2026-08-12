import { useState } from 'react'
import {
  Inbox,
  Play,
  Eye,
  Search
} from 'lucide-react'

export default function ResultSubmissionInbox({ submissions = [], onProcessOcr, onInspectSubmission, processingId, loading }) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSubmissions = submissions.filter((s) => {
    const q = searchQuery.toLowerCase()
    const submitter = (s.submitted_by_username || s.submitted_by_email || s.submittedBy || '').toLowerCase()
    const tournament = (s.tournament_id || s.tournamentTitle || '').toLowerCase()
    const ign = (s.claimed_game_ign || s.ocr_game_ign || s.gameIgn || '').toLowerCase()
    const id = (s.id || '').toLowerCase()
    return tournament.includes(q) || submitter.includes(q) || ign.includes(q) || id.includes(q)
  })

  return (
    <div className="space-y-4 font-mono">

      {/* Header Banner */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 shadow-xl flex items-center justify-between">
        <div>
          <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <Inbox className="w-4 h-4 text-[#00f2ff]" />
            <span>RESULT SUBMISSION INBOX</span>
          </h3>
          <p className="text-xs text-[#8e9dae] mt-0.5">
            Active stream of player scorecard uploads awaiting OCR extraction & admin verification.
          </p>
        </div>
        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 uppercase">
          {submissions.length} SUBMISSION(S)
        </span>
      </div>

      {/* Search Input */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 shadow-xl">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#8e9dae] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Tournament, Submitter, or IGN..."
            className="w-full bg-[#07090c] border border-[#3a494b] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:border-[#00f2ff] focus:outline-none"
          />
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#07090c] border-b border-[#3a494b]/60 text-[#8e9dae] uppercase text-[10px]">
              <tr>
                <th className="p-3">SUBMISSION ID</th>
                <th className="p-3">TOURNAMENT ARENA</th>
                <th className="p-3">SUBMITTED BY</th>
                <th className="p-3">SUBMITTED AT</th>
                <th className="p-3">STATUS</th>
                <th className="p-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3a494b]/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#8e9dae]">
                    Loading scorecards from database...
                  </td>
                </tr>
              ) : filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#8e9dae]">
                    No result submissions currently in inbox queue.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((s) => {
                  const status = s.verification_status || s.status || 'PENDING_OCR'
                  const statusColor =
                    status === 'VERIFIED' || status === 'PUBLISHED'
                      ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/30'
                      : status === 'OCR_COMPLETE' || status === 'REVIEW_REQUIRED'
                      ? 'bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/30'
                      : status === 'REJECTED'
                      ? 'bg-red-950 text-red-400 border-red-500/40'
                      : 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/30'

                  return (
                    <tr key={s.id} className="hover:bg-[#07090c]/50 transition-colors">
                      <td className="p-3 font-bold text-white text-[11px]">
                        {s.id}
                      </td>

                      <td className="p-3">
                        <span className="font-bold text-white block">{s.tournament_id || s.tournamentTitle}</span>
                        <span className="text-[10px] text-[#00f2ff]">{s.game || 'Free Fire MAX'}</span>
                      </td>

                      <td className="p-3">
                        <span className="font-bold text-white block">{s.submitted_by_username || s.submittedBy || 'Player'}</span>
                        <span className="text-[10px] text-[#8e9dae]">{s.submitted_by_email || s.email}</span>
                      </td>

                      <td className="p-3 text-[#8e9dae]">
                        {s.created_at ? new Date(s.created_at).toLocaleString() : s.submittedAt || 'Recent'}
                      </td>

                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${statusColor}`}>
                          {status}
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {(status === 'PENDING_OCR' || status === 'SUBMITTED' || s.ocr_status !== 'OCR_COMPLETE') && (
                            <button
                              onClick={() => onProcessOcr(s)}
                              disabled={processingId === s.id}
                              className="px-2.5 py-1 bg-[#00f2ff]/10 hover:bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff]/30 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1"
                            >
                              <Play className="w-3 h-3" />
                              <span>{processingId === s.id ? 'PROCESSING...' : 'RUN OCR'}</span>
                            </button>
                          )}

                          <button
                            onClick={() => onInspectSubmission(s)}
                            className="px-2.5 py-1 bg-[#07090c] hover:bg-[#1d232c] text-white border border-[#3a494b] rounded text-[10px] font-bold uppercase transition-all flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3 text-[#00f2ff]" />
                            <span>INSPECT</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
