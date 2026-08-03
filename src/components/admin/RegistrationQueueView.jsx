import { useState, useEffect } from 'react'
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Search,
  ShieldCheck,
  User,
  Mail,
  Phone,
  Eye,
  X,
  Download,
  Filter,
  Users,
  Gamepad2,
  RefreshCw,
  AlertCircle
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import AuthAlert from '../common/AuthAlert'
import { useToast } from '../../contexts/ToastContext'
import { TableSkeleton } from '../common/SkeletonLoader'

export default function RegistrationQueueView({ tournaments = [], updateRegistrationStatus }) {
  const { showSuccess, showError } = useToast()
  const [activeQueueTab, setActiveQueueTab] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTournamentFilter, setSelectedTournamentFilter] = useState('ALL')
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [alert, setAlert] = useState(null)
  const [liveRegistrations, setLiveRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  // Fetch registrations from Supabase or fallback to context
  const fetchRegistrations = async () => {
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('tournament_registrations')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          console.warn('[Supabase Registrations Fetch Warning]:', error.message)
          fallbackToContextData()
        } else if (data && data.length > 0) {
          const mapped = data.map((r) => {
            const tourn = tournaments.find((t) => String(t.id) === String(r.tournament_id))
            return {
              id: r.id,
              tournamentId: r.tournament_id,
              tournamentTitle: r.tournament_title || tourn?.title || 'Esports Championship',
              tournamentGame: tourn?.game || 'Free Fire',
              teamName: r.team_name,
              name: r.team_name,
              captainName: r.captain_name,
              captain: r.captain_name,
              email: r.email,
              freeFireUid: r.free_fire_uid,
              whatsappNumber: r.whatsapp_number,
              format: r.format || 'Squad',
              teammates: r.teammates || [],
              teammateUids: r.teammate_uids || ['789123041', '654321098', '987654321'],
              status: r.status || 'Approved',
              registeredAt: r.registered_at ? new Date(r.registered_at).toLocaleDateString() : 'Today',
              referenceId: r.reference_id || `REG-MJ-${r.id?.substring(0, 4)?.toUpperCase() || '7741'}`,
            }
          })
          setLiveRegistrations(mapped)
        } else {
          fallbackToContextData()
        }
      } else {
        fallbackToContextData()
      }
    } catch (err) {
      console.error('[Fetch Registrations Error]:', err)
      fallbackToContextData()
    } finally {
      setLoading(false)
    }
  }

  const fallbackToContextData = () => {
    const all = tournaments.flatMap((t) =>
      (t.teamsList || []).map((team) => ({
        id: team.id || team.refId || 'reg-' + Math.random(),
        tournamentId: t.id,
        tournamentTitle: t.title,
        tournamentGame: t.game,
        teamName: team.name || team.teamName || 'Squad Team',
        name: team.name || team.teamName || 'Squad Team',
        captainName: team.captain || team.captainName || 'Player 1',
        captain: team.captain || team.captainName || 'Player 1',
        email: team.email || 'player@example.com',
        freeFireUid: team.freeFireUid || team.uid || '518920412',
        whatsappNumber: team.whatsappNumber || '+91 9876543210',
        format: team.format || 'Squad',
        teammateUids: team.teammateUids || ['789123041', '654321098', '987654321'],
        status: team.status || 'Approved',
        registeredAt: team.registeredAt || 'Today',
        referenceId: team.refId || `REG-MJ-${Math.floor(1000 + Math.random() * 9000)}`,
      }))
    )
    setLiveRegistrations(all)
  }

  useEffect(() => {
    fetchRegistrations()
  }, [tournaments])

  const handleUpdateStatus = async (regId, tournamentId, nextStatus) => {
    if (updatingId) return
    setUpdatingId(regId)
    try {
      if (updateRegistrationStatus) {
        await updateRegistrationStatus(tournamentId, regId, nextStatus)
      }

      setLiveRegistrations((prev) =>
        prev.map((r) => (r.id === regId ? { ...r, status: nextStatus } : r))
      )
      setAlert({ type: 'success', message: `Registration status updated to "${nextStatus}".` })
      showSuccess(`Registration status updated to "${nextStatus}".`, 'Queue Updated')
      if (selectedDetail && selectedDetail.id === regId) {
        setSelectedDetail((prev) => ({ ...prev, status: nextStatus }))
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to update registration status.' })
      showError(err, 'Queue Update Error')
    } finally {
      setUpdatingId(null)
    }
  }

  const exportCSV = () => {
    if (liveRegistrations.length === 0) return
    const headers = ['Ref ID', 'Tournament', 'Team Name', 'Captain', 'Email', 'Captain UID', 'Status', 'Registered At']
    const rows = liveRegistrations.map((r) => [
      r.referenceId,
      `"${r.tournamentTitle}"`,
      `"${r.teamName}"`,
      `"${r.captainName}"`,
      r.email,
      r.freeFireUid,
      r.status,
      r.registeredAt,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `mj_esports_registrations_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filter Queue Logic
  const filteredRegistrations = liveRegistrations.filter((r) => {
    const matchesSearch =
      r.teamName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.captainName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.freeFireUid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTourn =
      selectedTournamentFilter === 'ALL' || String(r.tournamentId) === String(selectedTournamentFilter)

    const matchesTab =
      activeQueueTab === 'All' ||
      (activeQueueTab === 'Pending' && (r.status === 'Pending' || r.status === 'Under Review')) ||
      (activeQueueTab === 'Approved' && (r.status === 'Approved' || r.status === 'Confirmed')) ||
      (activeQueueTab === 'Rejected' && r.status === 'Rejected')

    return matchesSearch && matchesTourn && matchesTab
  })

  return (
    <div className="space-y-6">
      
      {/* Header & Export CSV Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3a494b]/60 pb-4">
        <div className="space-y-1">
          <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-[#00f2ff]" />
            <span>REGISTRATION QUEUE MODERATION</span>
          </h2>
          <p className="text-xs text-[#8e9dae]">
            Review incoming squad registrations, verify in-game character UIDs, and approve slots.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRegistrations}
            className="px-3.5 py-2.5 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] rounded text-xs font-bold text-[#e1e2e7] hover:text-[#00f2ff] transition-all flex items-center gap-1.5 uppercase min-h-[44px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00f2ff] ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={exportCSV}
            className="btn-cyber-primary text-xs py-2.5 min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            <span>Export Roster CSV</span>
          </button>
        </div>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* FILTER CONTROLS & STATUS TABS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-[#3a494b]/60 pb-2 overflow-x-auto text-xs font-bold">
          {['All', 'Pending', 'Approved', 'Rejected'].map((tab) => (
            <button
              key={`q-tab-${tab}`}
              onClick={() => setActiveQueueTab(tab)}
              className={`px-4 py-2 rounded text-xs font-bold uppercase transition-all whitespace-nowrap min-h-[38px] ${
                activeQueueTab === tab
                  ? 'bg-[#00f2ff] text-[#00363a] font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.3)]'
                  : 'text-[#8e9dae] hover:text-white bg-[#151a21] hover:bg-[#1d232c]'
              }`}
            >
              {tab} Registrations ({
                liveRegistrations.filter((r) =>
                  tab === 'All'
                    ? true
                    : tab === 'Pending'
                    ? r.status === 'Pending' || r.status === 'Under Review'
                    : tab === 'Approved'
                    ? r.status === 'Approved' || r.status === 'Confirmed'
                    : r.status === 'Rejected'
                ).length
              })
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 shadow-xl">
          <div className="relative">
            <Search className="w-4 h-4 text-[#8e9dae] absolute left-3 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team name, captain, UID, or email..."
              className="w-full pl-9 pr-3 py-2.5 bg-[#07090c] border border-[#3a494b] rounded text-xs text-white placeholder-[#8e9dae] focus:outline-none focus:border-[#00f2ff]"
            />
          </div>

          <div>
            <select
              value={selectedTournamentFilter}
              onChange={(e) => setSelectedTournamentFilter(e.target.value)}
              className="w-full p-2.5 bg-[#07090c] border border-[#3a494b] rounded text-xs text-white focus:outline-none focus:border-[#00f2ff]"
            >
              <option value="ALL">All Tournaments</option>
              {tournaments.map((t) => (
                <option key={`q-tourn-${t.id}`} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* REGISTRATIONS TABLE (DESKTOP) */}
      <div className="hidden lg:block bg-[#151a21] border border-[#3a494b]/60 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#07090c] border-b border-[#3a494b]/60 font-label-caps text-[#8e9dae]">
              <th className="p-3.5 pl-4">Ref ID</th>
              <th className="p-3.5">Tournament</th>
              <th className="p-3.5">Team Name</th>
              <th className="p-3.5">Captain</th>
              <th className="p-3.5">Free Fire UID</th>
              <th className="p-3.5 text-center">Status</th>
              <th className="p-3.5 text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3a494b]/40">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-[#8e9dae]">
                  <div className="w-6 h-6 border-2 border-[#00f2ff] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <span>Loading queue...</span>
                </td>
              </tr>
            ) : filteredRegistrations.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-[#8e9dae]">
                  No registrations found matching filter criteria.
                </td>
              </tr>
            ) : (
              filteredRegistrations.map((r) => (
                <tr key={`q-row-${r.id}`} className="hover:bg-[#1d232c] transition-colors">
                  <td className="p-3.5 pl-4 font-mono font-bold text-[#00f2ff]">{r.referenceId}</td>
                  <td className="p-3.5 font-bold text-white max-w-[180px] truncate">{r.tournamentTitle}</td>
                  <td className="p-3.5 font-extrabold text-[#e1e2e7]">{r.teamName}</td>
                  <td className="p-3.5 text-[#8e9dae]">{r.captainName}</td>
                  <td className="p-3.5 font-mono text-[#00ff9d] font-bold">{r.freeFireUid}</td>
                  <td className="p-3.5 text-center">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                      r.status === 'Approved' || r.status === 'Confirmed'
                        ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40'
                        : r.status === 'Pending' || r.status === 'Under Review'
                        ? 'bg-[#ffb800]/10 text-[#ffb800] border-[#ffb800]/40'
                        : 'bg-red-950 text-[#ff3366] border-red-800'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right pr-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedDetail(r)}
                        className="p-1.5 rounded bg-[#07090c] hover:bg-[#1d232c] text-[#00f2ff] border border-[#3a494b]"
                        title="View Roster Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {r.status !== 'Approved' && r.status !== 'Confirmed' && (
                        <button
                          onClick={() => handleUpdateStatus(r.id, r.tournamentId, 'Approved')}
                          disabled={updatingId === r.id}
                          className="p-1.5 rounded bg-[#00ff9d]/10 hover:bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/40 disabled:opacity-40"
                          title="Approve Slot"
                        >
                          {updatingId === r.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-[#00ff9d] border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}

                      {r.status !== 'Rejected' && (
                        <button
                          onClick={() => handleUpdateStatus(r.id, r.tournamentId, 'Rejected')}
                          disabled={updatingId === r.id}
                          className="p-1.5 rounded bg-red-950/50 hover:bg-red-900/60 text-[#ff3366] border border-red-800 disabled:opacity-40"
                          title="Reject Slot"
                        >
                          {updatingId === r.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-[#ff3366] border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARD QUEUE (< 1024px) */}
      <div className="block lg:hidden space-y-3">
        {filteredRegistrations.map((r) => (
          <div key={`m-q-${r.id}`} className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 space-y-3 shadow-md text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[#00f2ff] font-bold">{r.referenceId}</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                r.status === 'Approved' || r.status === 'Confirmed'
                  ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40'
                  : r.status === 'Pending'
                  ? 'bg-[#ffb800]/10 text-[#ffb800] border-[#ffb800]/40'
                  : 'bg-red-950 text-[#ff3366] border-red-800'
              }`}>
                {r.status}
              </span>
            </div>

            <div>
              <h4 className="font-extrabold text-white text-sm">{r.teamName}</h4>
              <p className="text-[11px] text-[#8e9dae]">{r.tournamentTitle}</p>
            </div>

            <div className="bg-[#07090c] p-2.5 rounded border border-[#3a494b]/60 space-y-1 font-mono text-[11px]">
              <p>Captain: <span className="text-white font-bold">{r.captainName}</span></p>
              <p>UID: <span className="text-[#00f2ff] font-bold">{r.freeFireUid}</span></p>
              <p>Contact: <span className="text-[#e1e2e7]">{r.whatsappNumber}</span></p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setSelectedDetail(r)}
                className="flex-1 py-2 bg-[#07090c] text-[#00f2ff] border border-[#3a494b] rounded font-bold uppercase text-[10px]"
              >
                Details
              </button>
              {r.status !== 'Approved' && (
                <button
                  onClick={() => handleUpdateStatus(r.id, r.tournamentId, 'Approved')}
                  className="flex-1 py-2 bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/40 rounded font-bold uppercase text-[10px]"
                >
                  Approve
                </button>
              )}
              {r.status !== 'Rejected' && (
                <button
                  onClick={() => handleUpdateStatus(r.id, r.tournamentId, 'Rejected')}
                  className="flex-1 py-2 bg-red-950/40 text-[#ff3366] border border-red-800 rounded font-bold uppercase text-[10px]"
                >
                  Reject
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ROSTER DETAIL MODAL DIALOG */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#151a21] border border-[#3a494b] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedDetail(null)}
              className="absolute top-5 right-5 p-2 rounded bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="font-mono text-xs font-bold text-[#00f2ff] block">{selectedDetail.referenceId}</span>
              <h3 className="font-display-lg text-lg font-bold text-white uppercase">{selectedDetail.teamName}</h3>
              <p className="text-xs text-[#8e9dae]">{selectedDetail.tournamentTitle}</p>
            </div>

            <div className="p-4 bg-[#07090c] rounded border border-[#3a494b]/60 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-[#3a494b]/60">
                <span className="text-[#8e9dae]">Captain</span>
                <span className="font-bold text-white">{selectedDetail.captainName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#3a494b]/60">
                <span className="text-[#8e9dae]">Free Fire UID</span>
                <span className="font-mono font-bold text-[#00f2ff]">{selectedDetail.freeFireUid}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#3a494b]/60">
                <span className="text-[#8e9dae]">Email</span>
                <span className="text-[#e1e2e7]">{selectedDetail.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#3a494b]/60">
                <span className="text-[#8e9dae]">WhatsApp</span>
                <span className="font-mono text-[#00ff9d]">{selectedDetail.whatsappNumber}</span>
              </div>

              {selectedDetail.teammateUids && selectedDetail.teammateUids.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  <span className="font-label-caps text-[#8e9dae] block">Teammate Character UIDs</span>
                  <div className="space-y-1">
                    {selectedDetail.teammateUids.map((uid, idx) => (
                      <div key={`tm-uid-${idx}`} className="p-2 bg-[#151a21] rounded border border-[#3a494b]/60 flex justify-between font-mono text-[11px]">
                        <span className="text-[#8e9dae]">Player {idx + 2}</span>
                        <span className="text-[#00f2ff] font-bold">{uid}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedDetail(null)}
                className="flex-1 py-2.5 text-xs font-bold bg-[#07090c] text-[#8e9dae] border border-[#3a494b] rounded hover:bg-[#1d232c] uppercase min-h-[40px]"
              >
                Close
              </button>
              {selectedDetail.status !== 'Approved' && (
                <button
                  onClick={() => handleUpdateStatus(selectedDetail.id, selectedDetail.tournamentId, 'Approved')}
                  className="btn-cyber-primary flex-1 justify-center py-2.5 min-h-[40px]"
                >
                  Approve Slot
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
