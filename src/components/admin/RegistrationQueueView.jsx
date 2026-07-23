import { useState } from 'react'
import { ClipboardList, CheckCircle2, XCircle, Search, ShieldCheck, User, Mail, Phone, Eye, X } from 'lucide-react'
import AuthAlert from '../common/AuthAlert'

export default function RegistrationQueueView({ tournaments, updateRegistrationStatus }) {
  const [activeQueueTab, setActiveQueueTab] = useState('Approved') // 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Checked-in'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [alert, setAlert] = useState(null)

  const allRegistrations = tournaments.flatMap((t) =>
    (t.teamsList || []).map((team) => ({
      ...team,
      tournamentId: t.id,
      tournamentTitle: t.title,
      tournamentGame: t.game,
      status: team.status || 'Approved',
      verificationStatus: team.verificationStatus || 'Verified Device',
      registeredAt: team.registeredAt || '2026-07-21 14:30',
    }))
  )

  const filteredRegistrations = allRegistrations.filter((reg) => {
    const matchesTab = activeQueueTab === 'All' || reg.status === activeQueueTab
    const matchesSearch =
      (reg.name && reg.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (reg.captain && reg.captain.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (reg.freeFireUid && reg.freeFireUid.includes(searchQuery))
    return matchesTab && matchesSearch
  })

  const handleApprove = (reg) => {
    updateRegistrationStatus(reg.tournamentId, reg.id || reg.email || reg.name, 'Approved')
    setAlert({ type: 'success', message: `Registration for team "${reg.name}" approved!` })
  }

  const handleReject = (reg) => {
    updateRegistrationStatus(reg.tournamentId, reg.id || reg.email || reg.name, 'Rejected')
    setAlert({ type: 'success', message: `Registration for team "${reg.name}" rejected.` })
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-yellow-400" />
            <span>REGISTRATION QUEUE & AUDIT</span>
          </h2>
          <p className="text-xs text-slate-400">
            Review submitted squad slot applications, verify player UIDs, and approve/reject bookings.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search squad, captain, or UID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* Queue Tabs Bar */}
      <div className="flex border-b border-slate-800 overflow-x-auto text-xs font-bold uppercase tracking-wider no-scrollbar gap-2 pb-2">
        {['Pending', 'Approved', 'Rejected', 'Cancelled', 'Checked-in'].map((tab) => {
          const count = allRegistrations.filter((r) => r.status === tab).length
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
              <span className="px-2 py-0.5 rounded-full text-[9px] bg-slate-950 font-extrabold">
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Squad Registration Cards Stack */}
      {filteredRegistrations.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-500 text-xs">
          No squad registrations found in the "{activeQueueTab}" queue.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRegistrations.map((reg, idx) => (
            <div key={`reg-card-${idx}`} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase text-purple-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 truncate">
                    {reg.tournamentTitle}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
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
                  <h3 className="font-extrabold text-cyan-300 text-base">{reg.name}</h3>
                  <p className="text-xs text-slate-300">Captain: <span className="font-bold text-white">{reg.captain}</span></p>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Game UID:</span>
                    <span className="font-bold text-white">{reg.freeFireUid || '518920412'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Verification:</span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      {reg.verificationStatus}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Time:</span>
                    <span className="text-slate-400">{reg.registeredAt}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs">
                <button
                  onClick={() => handleApprove(reg)}
                  className="py-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded-xl font-bold flex items-center justify-center gap-1 min-h-[38px]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </button>

                <button
                  onClick={() => handleReject(reg)}
                  className="py-2 bg-slate-950 hover:bg-red-950 border border-slate-800 hover:border-red-800 text-red-400 rounded-xl font-bold flex items-center justify-center gap-1 min-h-[38px]"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>

                <button
                  onClick={() => setSelectedDetail(reg)}
                  className="py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl font-bold flex items-center justify-center gap-1 min-h-[38px]"
                >
                  <Eye className="w-3.5 h-3.5 text-purple-400" />
                  <span>Details</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Team Details Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button onClick={() => setSelectedDetail(null)} className="absolute top-5 right-5 p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white">Squad Details: {selectedDetail.name}</h3>

            <div className="space-y-2 text-xs text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <p><span className="text-slate-500 font-bold">Tournament:</span> {selectedDetail.tournamentTitle}</p>
              <p><span className="text-slate-500 font-bold">Captain Name:</span> {selectedDetail.captain}</p>
              <p><span className="text-slate-500 font-bold">Email:</span> {selectedDetail.email || 'N/A'}</p>
              <p><span className="text-slate-500 font-bold">Character UID:</span> {selectedDetail.freeFireUid || 'N/A'}</p>
              <p><span className="text-slate-500 font-bold">WhatsApp:</span> {selectedDetail.whatsappNumber || '+91 9876543210'}</p>
            </div>

            <button onClick={() => setSelectedDetail(null)} className="w-full py-3 bg-purple-600 text-white font-bold text-xs rounded-xl min-h-[44px]">
              Close Details
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
