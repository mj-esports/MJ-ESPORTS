import { useState, useMemo } from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Search,
  Filter,
  Gamepad2
} from 'lucide-react'

export default function TournamentEligibilityAuditor({ users = [], tournaments = [] }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTourneyId, setSelectedTourneyId] = useState(tournaments[0]?.id || 'ALL')

  // Calculate audit results for each player
  const auditedPlayers = useMemo(() => {
    return users.map((u) => {
      const isIdentityVerified =
        u.verificationStatus === 'Verified' ||
        u.verificationStatus === 'VERIFIED'

      const hasValidUid = Boolean(u.gameUid && u.gameUid !== 'N/A')
      const isRegistered = (u.registrationHistory || []).length > 0
      const isTeamValid = Boolean(u.username || u.gameIgn)

      const isFullyEligible = isIdentityVerified && hasValidUid && isRegistered

      return {
        ...u,
        isIdentityVerified,
        hasValidUid,
        isRegistered,
        isTeamValid,
        isFullyEligible,
      }
    })
  }, [users])

  const filteredAuditedPlayers = useMemo(() => {
    return auditedPlayers.filter((p) => {
      const q = searchQuery.toLowerCase()
      return (
        (p.username || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.gameUid || '').toLowerCase().includes(q)
      )
    })
  }, [auditedPlayers, searchQuery])

  return (
    <div className="space-y-4 font-mono">

      {/* Header */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 shadow-xl flex items-center justify-between">
        <div>
          <h3 className="font-headline text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00f2ff]" />
            <span>TOURNAMENT ELIGIBILITY AUDITOR</span>
          </h3>
          <p className="text-xs text-[#8e9dae] mt-0.5">
            Automated compliance check for Verified Game Identity and Tournament Registrations.
          </p>
        </div>
        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 uppercase">
          READ-ONLY AUDIT
        </span>
      </div>

      {/* Search Bar */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 shadow-xl">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#8e9dae] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Audit Player Username or Game UID..."
            className="w-full bg-[#07090c] border border-[#3a494b] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:border-[#00f2ff] focus:outline-none"
          />
        </div>
      </div>

      {/* Audit Results Table */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#07090c] border-b border-[#3a494b]/60 text-[#8e9dae] uppercase text-[10px]">
              <tr>
                <th className="p-3">PLAYER IDENTITY</th>
                <th className="p-3">GAME UID</th>
                <th className="p-3">1. IDENTITY VERIFIED</th>
                <th className="p-3">2. REGISTERED</th>
                <th className="p-3">3. ROSTER VALID</th>
                <th className="p-3 text-right">OVERALL ELIGIBILITY</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3a494b]/40">
              {filteredAuditedPlayers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#8e9dae]">
                    No player records found for eligibility audit.
                  </td>
                </tr>
              ) : (
                filteredAuditedPlayers.map((p) => (
                  <tr key={p.id} className="hover:bg-[#07090c]/50 transition-colors">
                    <td className="p-3">
                      <span className="font-bold text-white block">{p.username}</span>
                      <span className="text-[10px] text-[#8e9dae] block">{p.email}</span>
                    </td>

                    <td className="p-3 font-bold text-[#00f2ff]">
                      {p.gameUid || 'N/A'}
                    </td>

                    <td className="p-3">
                      {p.isIdentityVerified ? (
                        <span className="text-[#00ff9d] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED
                        </span>
                      ) : (
                        <span className="text-red-400 font-bold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> PENDING
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      {p.isRegistered ? (
                        <span className="text-[#00ff9d] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> YES
                        </span>
                      ) : (
                        <span className="text-[#8e9dae] flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> NO
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      {p.isTeamValid ? (
                        <span className="text-[#00ff9d] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> VALID
                        </span>
                      ) : (
                        <span className="text-red-400 font-bold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> INVALID
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-right">
                      {p.isFullyEligible ? (
                        <span className="px-2.5 py-1 bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/40 rounded font-bold text-[10px] uppercase">
                          ELIGIBLE ✓
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-red-950 text-red-400 border border-red-500/40 rounded font-bold text-[10px] uppercase">
                          NOT ELIGIBLE ✕
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
