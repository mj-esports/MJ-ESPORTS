import { useState, useEffect, useMemo } from 'react'
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
  AlertCircle,
  AlertTriangle,
  Clock,
  CreditCard,
  ChevronRight
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import AuthAlert from '../common/AuthAlert'
import { useToast } from '../../contexts/ToastContext'

export default function RegistrationQueueView({ tournaments = [], updateRegistrationStatus }) {
  const { showSuccess, showError } = useToast()
  const [activeQueueTab, setActiveQueueTab] = useState('ALL') // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTournamentFilter, setSelectedTournamentFilter] = useState('ALL')
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [alert, setAlert] = useState(null)
  const [liveRegistrations, setLiveRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)

  // Fetch registrations from Supabase or fallback
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
          setLiveRegistrations([])
        } else if (data && data.length > 0) {
          const mapped = data.map((r) => {
            const tourn = tournaments.find((t) => String(t.id) === String(r.tournament_id))
            return {
              id: r.id,
              tournamentId: r.tournament_id,
              tournamentTitle: r.tournament_title || tourn?.title || 'Esports Championship',
              tournamentGame: tourn?.game || 'Free Fire MAX',
              teamName: r.team_name,
              name: r.team_name,
              captainName: r.captain_name,
              captain: r.captain_name,
              email: r.email,
              freeFireUid: r.free_fire_uid || r.in_game_uid || 'N/A',
              whatsappNumber: r.whatsapp_number || r.phone || 'N/A',
              format: r.format || 'Squad',
              teammates: r.teammates || [],
              teammateUids: r.teammate_uids || [],
              paymentStatus: r.payment_status || (r.status === 'Approved' ? 'Paid' : 'Pending'),
              status: r.status || 'Approved',
              createdAt: r.created_at || r.registered_at,
              registeredAt: r.registered_at || r.created_at ? new Date(r.registered_at || r.created_at).toLocaleDateString() : 'Today',
              referenceId: r.reference_id || `REG-${String(r.id || '').substring(0, 6).toUpperCase() || '7741'}`,
            }
          })
          setLiveRegistrations(mapped)
        } else {
          setLiveRegistrations([])
        }
      } else {
        setLiveRegistrations([])
      }
    } catch (err) {
      console.error('[Fetch Registrations Error]:', err)
      setLiveRegistrations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRegistrations()
  }, [tournaments])

  const counts = useMemo(() => {
    return {
      ALL: liveRegistrations.length,
      PENDING: liveRegistrations.filter((r) => r.status === 'Pending' || r.status === 'Under Review').length,
      APPROVED: liveRegistrations.filter((r) => r.status === 'Approved' || r.status === 'Confirmed').length,
      REJECTED: liveRegistrations.filter((r) => r.status === 'Rejected').length,
    }
  }, [liveRegistrations])

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
      showSuccess(`Registration slot updated to "${nextStatus}".`, 'Queue Updated')
      if (selectedDetail && selectedDetail.id === regId) {
        setSelectedDetail((prev) => ({ ...prev, status: nextStatus }))
      }
    } catch (err) {
      showError(err, 'Queue Update Error')
    } finally {
      setUpdatingId(null)
      setRejectTarget(null)
    }
  }

  const exportCSV = () => {
    if (liveRegistrations.length === 0) return
    const headers = ['Ref ID', 'Tournament', 'Team Name', 'Captain', 'Email', 'In-Game UID', 'Status', 'Registered At']
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
  const filteredRegistrations = useMemo(() => {
    return liveRegistrations.filter((r) => {
      const matchesSearch =
        !searchQuery.trim() ||
        r.teamName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.captainName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.freeFireUid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.referenceId?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesTourn =
        selectedTournamentFilter === 'ALL' || String(r.tournamentId) === String(selectedTournamentFilter)

      const matchesTab =
        activeQueueTab === 'ALL' ||
        (activeQueueTab === 'PENDING' && (r.status === 'Pending' || r.status === 'Under Review')) ||
        (activeQueueTab === 'APPROVED' && (r.status === 'Approved' || r.status === 'Confirmed')) ||
        (activeQueueTab === 'REJECTED' && r.status === 'Rejected')

      return matchesSearch && matchesTourn && matchesTab
    })
  }, [liveRegistrations, searchQuery, selectedTournamentFilter, activeQueueTab])

  return (
    <div className="space-y-5 font-body antialiased">
      
      {/* 1. QUEUE HEADER & ROSTER EXPORT */}
      <div className="bg-[#141416] border border-[#27272a] rounded p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline text-lg sm:text-xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#00f2ff]" />
            <span>Registration Queue Moderation</span>
          </h2>
          <p className="text-xs text-[#849495] font-body mt-0.5">
            Review incoming squad registrations, verify in-game character UIDs, and approve slots.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRegistrations}
            disabled={loading}
            className="p-2 bg-[#1c1b1c] hover:bg-[#27272a] border border-[#27272a] text-[#849495] hover:text-[#00f2ff] rounded transition-all cursor-pointer disabled:opacity-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Sync Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={exportCSV}
            disabled={liveRegistrations.length === 0}
            className="px-3.5 py-2 bg-[#1c1b1c] hover:bg-[#27272a] border border-[#27272a] hover:border-[#00f2ff]/40 text-white rounded text-xs font-headline font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-[#00f2ff]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* 2. FILTER TABS WITH REAL LIVE COUNTS */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-[#27272a] pb-2 overflow-x-auto text-xs font-headline font-bold">
          {[
            { id: 'ALL', label: 'All Registrations', count: counts.ALL },
            { id: 'PENDING', label: 'Pending', count: counts.PENDING },
            { id: 'APPROVED', label: 'Approved', count: counts.APPROVED },
            { id: 'REJECTED', label: 'Rejected', count: counts.REJECTED },
          ].map((tab) => (
            <button
              key={`q-tab-${tab.id}`}
              onClick={() => setActiveQueueTab(tab.id)}
              className={`px-3.5 py-2 rounded text-xs uppercase transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeQueueTab === tab.id
                  ? 'bg-[#00f2ff] text-[#00363a] font-extrabold shadow-sm'
                  : 'text-[#849495] hover:text-white bg-[#141416] hover:bg-[#1c1b1c] border border-[#27272a]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                activeQueueTab === tab.id ? 'bg-[#00363a]/20 text-[#00363a]' : 'bg-[#1c1b1c] text-white'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Tournament Selector Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#141416] border border-[#27272a] rounded p-3 shadow-xl">
          <div className="relative">
            <Search className="w-4 h-4 text-[#849495] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team name, captain, UID, or email..."
              className="w-full pl-9 pr-3 py-2 bg-[#1c1b1c] border border-[#27272a] rounded text-xs text-white placeholder-[#849495] focus:outline-none focus:border-[#00f2ff]"
            />
          </div>

          <div>
            <select
              value={selectedTournamentFilter}
              onChange={(e) => setSelectedTournamentFilter(e.target.value)}
              className="w-full p-2 bg-[#1c1b1c] border border-[#27272a] rounded text-xs text-white focus:outline-none focus:border-[#00f2ff] font-headline font-bold cursor-pointer"
            >
              <option value="ALL">All Tournaments</option>
              {tournaments.map((t) => (
                <option key={`q-tourn-${t.id}`} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. REGISTRATIONS TABLE (DESKTOP >= 1024px) */}
      <div className="bg-[#141416] border border-[#27272a] rounded overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-[#849495] space-y-2">
            <div className="w-6 h-6 border-2 border-[#00f2ff] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <span className="text-xs">Synchronizing queue...</span>
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="p-12 text-center text-[#849495] font-body space-y-2">
            <ClipboardList className="w-8 h-8 text-[#849495] mx-auto opacity-40" />
            <p className="text-sm font-bold text-white font-headline uppercase">No Registrations Found</p>
            <p className="text-xs text-[#849495]">No squad registrations match the current filter parameters.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#1c1b1c] border-b border-[#27272a] text-[#849495] text-[10px] font-headline uppercase font-bold tracking-wider">
                    <th className="py-3 px-4">Ref ID</th>
                    <th className="py-3 px-4">Tournament</th>
                    <th className="py-3 px-4">Team Name</th>
                    <th className="py-3 px-4">Captain</th>
                    <th className="py-3 px-4">In-Game UID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272a]">
                  {filteredRegistrations.map((r) => {
                    const isPending = r.status === 'Pending' || r.status === 'Under Review'
                    const isApproved = r.status === 'Approved' || r.status === 'Confirmed'
                    const isRejected = r.status === 'Rejected'

                    return (
                      <tr key={`q-row-${r.id}`} className="hover:bg-[#1c1b1c]/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#00f2ff]">{r.referenceId}</td>
                        <td className="py-3 px-4 font-headline font-bold text-white max-w-[200px] truncate" title={r.tournamentTitle}>
                          {r.tournamentTitle}
                        </td>
                        <td className="py-3 px-4 font-headline font-bold text-white">{r.teamName}</td>
                        <td className="py-3 px-4 text-[#849495]">{r.captainName}</td>
                        <td className="py-3 px-4 font-mono text-[#00f2ff]">{r.freeFireUid}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-0.5 rounded text-[9px] font-headline font-bold uppercase border ${
                            isApproved
                              ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/40'
                              : isPending
                              ? 'bg-[#ff5e07]/10 text-[#ff5e07] border-[#ff5e07]/40'
                              : 'bg-red-950/40 text-red-400 border-red-800'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedDetail(r)}
                              className="px-2.5 py-1 bg-[#1c1b1c] hover:bg-[#27272a] text-[#00f2ff] border border-[#27272a] rounded text-[10px] font-headline font-bold uppercase transition-colors cursor-pointer"
                              title="View Registration Details"
                            >
                              View
                            </button>

                            {isPending && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(r.id, r.tournamentId, 'Approved')}
                                  disabled={updatingId === r.id}
                                  className="px-2.5 py-1 bg-[#10b981]/15 hover:bg-[#10b981]/30 text-[#10b981] border border-[#10b981]/40 rounded text-[10px] font-headline font-bold uppercase transition-colors cursor-pointer disabled:opacity-50"
                                  title="Approve Slot"
                                >
                                  {updatingId === r.id ? '...' : 'Approve'}
                                </button>

                                <button
                                  onClick={() => setRejectTarget(r)}
                                  disabled={updatingId === r.id}
                                  className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-800/60 rounded text-[10px] font-headline font-bold uppercase transition-colors cursor-pointer disabled:opacity-50"
                                  title="Reject Slot"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards (< 1024px) */}
            <div className="lg:hidden divide-y divide-[#27272a]">
              {filteredRegistrations.map((r) => {
                const isPending = r.status === 'Pending' || r.status === 'Under Review'
                const isApproved = r.status === 'Approved' || r.status === 'Confirmed'

                return (
                  <div key={`m-q-${r.id}`} className="p-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[#00f2ff] font-bold">{r.referenceId}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-headline font-bold uppercase border ${
                        isApproved
                          ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/40'
                          : isPending
                          ? 'bg-[#ff5e07]/10 text-[#ff5e07] border-[#ff5e07]/40'
                          : 'bg-red-950 text-red-400 border-red-800'
                      }`}>
                        {r.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-headline font-bold text-white text-sm">{r.teamName}</h4>
                      <p className="text-[10px] text-[#849495]">{r.tournamentTitle}</p>
                    </div>

                    <div className="bg-[#1c1b1c] p-2.5 rounded border border-[#27272a] space-y-1 font-body text-[11px]">
                      <p>Captain: <span className="text-white font-bold">{r.captainName}</span></p>
                      <p>UID: <span className="text-[#00f2ff] font-mono">{r.freeFireUid}</span></p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setSelectedDetail(r)}
                        className="flex-1 py-1.5 bg-[#1c1b1c] hover:bg-[#27272a] text-[#00f2ff] border border-[#27272a] rounded font-headline font-bold uppercase text-[10px] cursor-pointer"
                      >
                        View Details
                      </button>
                      {isPending && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(r.id, r.tournamentId, 'Approved')}
                            className="flex-1 py-1.5 bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40 rounded font-headline font-bold uppercase text-[10px] cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectTarget(r)}
                            className="flex-1 py-1.5 bg-red-950/40 text-red-400 border border-red-800 rounded font-headline font-bold uppercase text-[10px] cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* 4. REGISTRATION DETAIL RIGHT-SIDE DRAWER (DESKTOP & MOBILE) */}
      {selectedDetail && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end animate-fadeIn"
          onClick={() => setSelectedDetail(null)}
        >
          <div
            className="w-full max-w-md bg-[#141416] border-l border-[#27272a] h-full p-6 space-y-5 overflow-y-auto shadow-2xl flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-[#00f2ff] block">{selectedDetail.referenceId}</span>
                  <h3 className="font-headline text-lg font-extrabold text-white uppercase">{selectedDetail.teamName}</h3>
                </div>
                <button
                  onClick={() => setSelectedDetail(null)}
                  className="p-1.5 rounded bg-[#1c1b1c] border border-[#27272a] text-[#849495] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 bg-[#1c1b1c] rounded border border-[#27272a] space-y-2.5 text-xs font-body">
                <div className="flex justify-between py-1 border-b border-[#27272a]">
                  <span className="text-[#849495]">Tournament</span>
                  <span className="font-bold text-white font-headline">{selectedDetail.tournamentTitle}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#27272a]">
                  <span className="text-[#849495]">Captain</span>
                  <span className="font-bold text-white">{selectedDetail.captainName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#27272a]">
                  <span className="text-[#849495]">Captain UID</span>
                  <span className="font-mono font-bold text-[#00f2ff]">{selectedDetail.freeFireUid}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#27272a]">
                  <span className="text-[#849495]">Email</span>
                  <span className="text-[#b9cacb]">{selectedDetail.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#27272a]">
                  <span className="text-[#849495]">WhatsApp Contact</span>
                  <span className="font-mono text-[#10b981]">{selectedDetail.whatsappNumber}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#27272a]">
                  <span className="text-[#849495]">Payment Status</span>
                  <span className="font-bold text-[#10b981] uppercase">{selectedDetail.paymentStatus}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#849495]">Submission Date</span>
                  <span className="text-[#b9cacb]">{selectedDetail.registeredAt}</span>
                </div>
              </div>

              {selectedDetail.teammateUids && selectedDetail.teammateUids.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-headline font-bold text-[#849495] uppercase block">
                    Teammate In-Game UIDs
                  </span>
                  <div className="space-y-1.5">
                    {selectedDetail.teammateUids.map((uid, idx) => (
                      <div key={`tm-uid-${idx}`} className="p-2.5 bg-[#1c1b1c] rounded border border-[#27272a] flex justify-between font-body text-xs">
                        <span className="text-[#849495]">Roster Slot {idx + 2}</span>
                        <span className="text-[#00f2ff] font-mono font-bold">{uid}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-[#27272a] flex gap-2">
              <button
                onClick={() => setSelectedDetail(null)}
                className="flex-1 py-2 text-xs font-headline font-bold bg-[#1c1b1c] text-[#849495] hover:text-white border border-[#27272a] rounded uppercase cursor-pointer"
              >
                Close Drawer
              </button>
              {selectedDetail.status !== 'Approved' && (
                <button
                  onClick={() => handleUpdateStatus(selectedDetail.id, selectedDetail.tournamentId, 'Approved')}
                  className="flex-1 py-2 text-xs font-headline font-bold bg-[#10b981] hover:bg-[#10b981]/90 text-black rounded uppercase cursor-pointer shadow-sm"
                >
                  Approve Slot
                </button>
              )}
              {selectedDetail.status !== 'Rejected' && (
                <button
                  onClick={() => setRejectTarget(selectedDetail)}
                  className="px-3 py-2 text-xs font-headline font-bold bg-red-950/50 hover:bg-red-900/60 text-red-400 border border-red-800/60 rounded uppercase cursor-pointer"
                >
                  Reject
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. REJECTION CONFIRMATION MODAL */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141416] border border-[#27272a] rounded p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-9 h-9 rounded bg-red-950/60 border border-red-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-headline font-extrabold text-sm uppercase text-white">
                  Reject Registration Slot
                </h3>
                <p className="text-xs text-[#849495] font-body">This will vacate the reserved team slot.</p>
              </div>
            </div>

            <p className="text-xs text-[#b9cacb] font-body">
              Are you sure you want to reject squad registration{' '}
              <span className="font-bold text-white font-headline">"{rejectTarget.teamName}"</span> (Ref: {rejectTarget.referenceId})?
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setRejectTarget(null)}
                className="flex-1 py-2 bg-[#1c1b1c] hover:bg-[#27272a] text-[#849495] hover:text-white border border-[#27272a] rounded text-xs font-headline font-bold uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStatus(rejectTarget.id, rejectTarget.tournamentId, 'Rejected')}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-headline font-bold uppercase transition-colors cursor-pointer shadow-lg shadow-red-600/30"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
