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

export default function RegistrationQueueView({ tournaments = [], updateRegistrationStatus }) {
  const [activeQueueTab, setActiveQueueTab] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTournamentFilter, setSelectedTournamentFilter] = useState('ALL')
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [alert, setAlert] = useState(null)
  const [liveRegistrations, setLiveRegistrations] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch registrations from Supabase or fallback to context
  const fetchRegistrations = async () => {
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('tournament_registrations')
          .select('*')
          .order('registered_at', { ascending: false })

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
              teammateUids: r.teammate_uids || (r.teammates ? r.teammates.map((t) => t.uid) : []),
              status: r.status || 'Approved',
              registeredAt: r.registered_at ? new Date(r.registered_at).toLocaleString() : 'Recent',
              referenceId: r.id ? `REG-${String(r.id).slice(0, 8).toUpperCase()}` : 'REG-MJ-LOCAL',
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
      console.error('[Registrations Error]:', err)
      fallbackToContextData()
    } finally {
      setLoading(false)
    }
  }

  const fallbackToContextData = () => {
    const all = tournaments.flatMap((t) =>
      (t.teamsList || []).map((team) => ({
        id: team.id || team.email || team.name,
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
        referenceId: team.refId || 'REG-MJ-OFFICIAL',
      }))
    )
    setLiveRegistrations(all)
  }

  useEffect(() => {
    fetchRegistrations()
  }, [tournaments])

  // Filtered registrations
  const filteredRegistrations = liveRegistrations.filter((reg) => {
    const matchesTab = activeQueueTab === 'All' || reg.status === activeQueueTab
    const matchesTournament =
      selectedTournamentFilter === 'ALL' || String(reg.tournamentId) === String(selectedTournamentFilter)
    
    const query = searchQuery.toLowerCase()
    const matchesSearch =
      !query ||
      reg.teamName?.toLowerCase().includes(query) ||
      reg.captainName?.toLowerCase().includes(query) ||
      reg.email?.toLowerCase().includes(query) ||
      String(reg.freeFireUid).includes(query) ||
      reg.referenceId?.toLowerCase().includes(query)

    return matchesTab && matchesTournament && matchesSearch
  })

  // Approve action
  const handleApprove = async (reg) => {
    try {
      if (updateRegistrationStatus) {
        await updateRegistrationStatus(reg.tournamentId, reg.id, 'Approved')
      }
      setLiveRegistrations((prev) =>
        prev.map((r) => (r.id === reg.id ? { ...r, status: 'Approved' } : r))
      )
      setAlert({ type: 'success', message: `Registration for team "${reg.teamName}" APPROVED successfully!` })
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to approve registration.' })
    }
  }

  // Reject action
  const handleReject = async (reg) => {
    try {
      if (updateRegistrationStatus) {
        await updateRegistrationStatus(reg.tournamentId, reg.id, 'Rejected')
      }
      setLiveRegistrations((prev) =>
        prev.map((r) => (r.id === reg.id ? { ...r, status: 'Rejected' } : r))
      )
      setAlert({ type: 'success', message: `Registration for team "${reg.teamName}" REJECTED.` })
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to reject registration.' })
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    if (filteredRegistrations.length === 0) {
      setAlert({ type: 'error', message: 'No registration records available to export.' })
      return
    }

    const headers = ['Ref ID', 'Team Name', 'Captain Name', 'Game UID', 'Format', 'Tournament', 'Email', 'WhatsApp', 'Status', 'Registered At']
    const rows = filteredRegistrations.map((r) => [
      `"${r.referenceId || r.id || ''}"`,
      `"${r.teamName || r.name || ''}"`,
      `"${r.captainName || r.captain || ''}"`,
      `"${r.freeFireUid || ''}"`,
      `"${r.format || 'Squad'}"`,
      `"${r.tournamentTitle || ''}"`,
      `"${r.email || ''}"`,
      `"${r.whatsappNumber || ''}"`,
      `"${r.status || 'Approved'}"`,
      `"${r.registeredAt || ''}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `MJ_ESPORTS_Registrations_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setAlert({ type: 'success', message: `Exported ${filteredRegistrations.length} registration records to CSV!` })
  }

  return (
    <div className="space-y-6">
      
      {/* Header Controls & Export CSV Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-amber-400" />
            <span>REGISTRATION MANAGEMENT</span>
          </h2>
          <p className="text-xs text-slate-400">
            Audit submitted squad applications, inspect player UIDs & contact info, approve/reject bookings, and export reports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRegistrations}
            disabled={loading}
            className="px-3.5 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-400 rounded-xl text-xs font-bold transition-all flex items-center gap-2 min-h-[44px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 font-extrabold text-xs rounded-xl hover:brightness-110 shadow-lg flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* FILTER CONTROLS: Search & Tournament Dropdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team name, captain, email, or Game UID..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <select
            value={selectedTournamentFilter}
            onChange={(e) => setSelectedTournamentFilter(e.target.value)}
            className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Tournaments</option>
            {tournaments.map((t) => (
              <option key={`t-filter-${t.id}`} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* STATUS QUEUE TABS BAR */}
      <div className="flex border-b border-slate-800 overflow-x-auto text-xs font-bold uppercase tracking-wider no-scrollbar gap-2 pb-2">
        {['All', 'Approved', 'Pending', 'Rejected', 'Cancelled', 'Checked-in'].map((tab) => {
          const count = tab === 'All'
            ? liveRegistrations.length
            : liveRegistrations.filter((r) => r.status === tab).length

          return (
            <button
              key={`qtab-${tab}`}
              onClick={() => setActiveQueueTab(tab)}
              className={`px-4 py-2 rounded-xl border transition-colors shrink-0 flex items-center gap-2 min-h-[38px] ${
                activeQueueTab === tab
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <span>{tab}</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] bg-slate-950 font-extrabold text-cyan-300">
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* REGISTRATION CARDS GRID */}
      {loading ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3 shadow-xl">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <span className="text-xs text-slate-400 font-bold block">Loading registrations...</span>
        </div>
      ) : filteredRegistrations.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3 shadow-xl text-slate-500 text-xs">
          <ClipboardList className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white uppercase">No Registrations Found</h3>
          <p className="text-xs text-slate-400">No squad bookings match the selected status or search filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRegistrations.map((reg, idx) => (
            <div
              key={`reg-card-${reg.id || idx}`}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase text-purple-300 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800 truncate">
                    {reg.tournamentTitle}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                    reg.status === 'Approved'
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : reg.status === 'Rejected'
                      ? 'bg-red-950 text-red-400 border-red-800'
                      : 'bg-yellow-950 text-yellow-400 border-yellow-800'
                  }`}>
                    {reg.status}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-cyan-300 text-base truncate">{reg.teamName}</h3>
                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {reg.format || 'Squad'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">Captain: <span className="font-bold text-white">{reg.captainName}</span></p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Captain Game UID:</span>
                    <span className="font-mono font-bold text-cyan-400">{reg.freeFireUid || '518920412'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Contact Email:</span>
                    <span className="font-semibold text-slate-300 truncate max-w-[150px]">{reg.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Registered:</span>
                    <span className="text-slate-500">{reg.registeredAt}</span>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS: Approve, Reject, Details */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-xs">
                <button
                  onClick={() => handleApprove(reg)}
                  disabled={reg.status === 'Approved'}
                  className="py-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded-xl font-bold flex items-center justify-center gap-1 min-h-[38px] disabled:opacity-40"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </button>

                <button
                  onClick={() => handleReject(reg)}
                  disabled={reg.status === 'Rejected'}
                  className="py-2 bg-slate-950 hover:bg-red-950 border border-slate-800 hover:border-red-800 text-red-400 rounded-xl font-bold flex items-center justify-center gap-1 min-h-[38px] disabled:opacity-40"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>

                <button
                  onClick={() => setSelectedDetail(reg)}
                  className="py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-purple-300 rounded-xl font-bold flex items-center justify-center gap-1 min-h-[38px]"
                >
                  <Eye className="w-3.5 h-3.5 text-purple-400" />
                  <span>Details</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PLAYER & TEAM DETAILS MODAL DIALOG */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setSelectedDetail(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-purple-400 uppercase tracking-widest block">REGISTRATION DETAILS</span>
              <h3 className="text-xl font-extrabold text-white">{selectedDetail.teamName}</h3>
              <p className="text-xs text-slate-400">Ref ID: <span className="font-mono text-cyan-400 font-bold">{selectedDetail.referenceId}</span></p>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              
              {/* Competition Metadata */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tournament Info</h4>
                <p className="flex justify-between">
                  <span className="text-slate-400">Tournament:</span>
                  <strong className="text-white">{selectedDetail.tournamentTitle}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Game Format:</span>
                  <strong className="text-purple-300">{selectedDetail.format || 'Squad'}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <strong className={`px-2 py-0.5 rounded text-[9px] uppercase border ${
                    selectedDetail.status === 'Approved'
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : 'bg-yellow-950 text-yellow-400 border-yellow-800'
                  }`}>
                    {selectedDetail.status}
                  </strong>
                </p>
              </div>

              {/* Captain & Player Info */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Captain & Contact Details</h4>
                <p className="flex justify-between">
                  <span className="text-slate-400">Captain Name:</span>
                  <strong className="text-white">{selectedDetail.captainName}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Captain Game UID:</span>
                  <strong className="font-mono text-cyan-400">{selectedDetail.freeFireUid || 'N/A'}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Contact Email:</span>
                  <strong className="text-slate-200">{selectedDetail.email || 'N/A'}</strong>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">WhatsApp / Phone:</span>
                  <strong className="text-slate-200">{selectedDetail.whatsappNumber || '+91 9876543210'}</strong>
                </p>
              </div>

              {/* Teammate Game UIDs */}
              {selectedDetail.teammateUids && selectedDetail.teammateUids.length > 0 && (
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Teammate Game UIDs</h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    {selectedDetail.teammateUids.map((uid, i) => (
                      <div key={`tm-uid-${i}`} className="flex justify-between items-center p-2 bg-slate-900 rounded-lg text-slate-300">
                        <span className="text-[11px] font-semibold text-slate-400">Teammate #{i + 1} UID:</span>
                        <span className="font-mono text-xs font-bold text-cyan-400">{uid}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            <button
              onClick={() => setSelectedDetail(null)}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl min-h-[44px] shadow-lg transition-colors"
            >
              Close Window
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
