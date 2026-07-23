import { useState } from 'react'
import { Trophy, Plus, Edit3, Copy, Archive, Trash2, Calendar, Gamepad2, Users, CheckCircle2, Lock, Unlock, X } from 'lucide-react'
import { SUPPORTED_GAMES } from '../../data/mockData'
import FormInput from '../common/FormInput'
import AuthAlert from '../common/AuthAlert'

export default function TournamentCenterView({
  tournaments,
  createTournament,
  editTournament,
  deleteTournament,
  updateTournamentStatus,
}) {
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [form, setForm] = useState({
    title: '',
    game: 'Free Fire',
    format: 'Squad Battle Royale',
    prizePool: '₹1,00,000',
    entryFee: 'Free',
    maxTeams: 32,
    startDate: '2026-08-10',
    startTime: '06:00 PM IST',
    description: '',
    status: 'Registration Open',
  })
  const [alert, setAlert] = useState(null)

  const handleOpenCreateModal = () => {
    setEditingId(null)
    setForm({
      title: '',
      game: 'Free Fire',
      format: 'Squad Battle Royale',
      prizePool: '₹1,00,000',
      entryFee: 'Free',
      maxTeams: 32,
      startDate: '2026-08-10',
      startTime: '06:00 PM IST',
      description: '',
      status: 'Registration Open',
    })
    setShowModal(true)
  }

  const handleOpenEditModal = (t) => {
    setEditingId(t.id)
    setForm({
      title: t.title,
      game: t.game || 'Free Fire',
      format: t.format || 'Squad Battle Royale',
      prizePool: t.prizePool || '₹1,00,000',
      entryFee: t.entryFee || 'Free',
      maxTeams: t.maxTeams || 32,
      startDate: t.startDate || '2026-08-10',
      startTime: t.startTime || '06:00 PM IST',
      description: t.description || '',
      status: t.status || 'Registration Open',
    })
    setShowModal(true)
  }

  const handleDuplicate = async (t) => {
    try {
      await createTournament({
        ...t,
        title: `${t.title} (Copy)`,
        registeredTeams: 0,
        teamsList: [],
      })
      setAlert({ type: 'success', message: `Tournament "${t.title}" duplicated successfully!` })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to duplicate tournament.' })
    }
  }

  const handleToggleRegistration = async (t) => {
    try {
      const nextStatus = t.status === 'Registration Open' ? 'Registration Closed' : 'Registration Open'
      await updateTournamentStatus(t.id, nextStatus)
      setAlert({ type: 'success', message: `Registration status updated to ${nextStatus} for ${t.title}` })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to update status.' })
    }
  }

  const handleDelete = async (tId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return
    try {
      await deleteTournament(tId)
      setAlert({ type: 'success', message: `Tournament "${title}" deleted successfully.` })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to delete tournament.' })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return

    try {
      if (editingId) {
        await editTournament(editingId, {
          ...form,
          maxTeams: parseInt(form.maxTeams, 10) || 32,
        })
        setAlert({ type: 'success', message: 'Tournament updated successfully!' })
      } else {
        await createTournament({
          ...form,
          maxTeams: parseInt(form.maxTeams, 10) || 32,
          organizer: 'MJ ESPORTS Official',
        })
        setAlert({ type: 'success', message: 'New tournament created!' })
      }

      setShowModal(false)
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to save tournament.' })
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-purple-400" />
            <span>TOURNAMENT CENTER</span>
          </h2>
          <p className="text-xs text-slate-400">
            Create, configure, duplicate, and manage all competitive esports tournaments.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 text-slate-950 font-extrabold text-xs rounded-xl hover:brightness-110 shadow-lg flex items-center justify-center gap-2 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Create Tournament</span>
        </button>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* Tournament Cards Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.map((t) => (
          <div key={`tc-card-${t.id}`} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-950 text-cyan-300 border border-cyan-500/30">
                  {t.game}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                  t.status === 'Registration Open'
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : t.status === 'Live Now'
                    ? 'bg-red-950 text-red-400 border-red-800'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}>
                  {t.status}
                </span>
              </div>

              <h3 className="font-extrabold text-white text-base">{t.title}</h3>
              <p className="text-xs text-slate-400">{t.format} &bull; Prize: <span className="text-emerald-400 font-bold">{t.prizePool}</span></p>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] font-bold block uppercase">Booked Slots</span>
                  <span className="text-purple-300 font-bold">{t.registeredTeams} / {t.maxTeams} Teams</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] font-bold block uppercase">Start Date</span>
                  <span className="text-slate-200 font-bold">{t.startDate}</span>
                </div>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleOpenEditModal(t)}
                  className="py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl font-bold flex items-center justify-center gap-1.5 min-h-[38px]"
                >
                  <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => handleDuplicate(t)}
                  className="py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 rounded-xl font-bold flex items-center justify-center gap-1.5 min-h-[38px]"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Duplicate</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => handleToggleRegistration(t)}
                  className="py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-300 rounded-xl font-bold flex items-center justify-center gap-1.5 min-h-[38px]"
                >
                  {t.status === 'Registration Open' ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{t.status === 'Registration Open' ? 'Close Reg' : 'Open Reg'}</span>
                </button>

                <button
                  onClick={() => handleDelete(t.id, t.title)}
                  className="py-2 px-3 bg-slate-950 hover:bg-red-950 border border-slate-800 hover:border-red-800 text-red-400 rounded-xl font-bold flex items-center justify-center gap-1.5 min-h-[38px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Create Tournament Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white">{editingId ? 'Edit Tournament' : 'Create Tournament'}</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <FormInput label="Title" name="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Game</label>
                  <select
                    value={form.game}
                    onChange={(e) => setForm({ ...form, game: e.target.value })}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    {SUPPORTED_GAMES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <FormInput label="Format" name="format" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} required />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <FormInput label="Prize Pool" name="prizePool" value={form.prizePool} onChange={(e) => setForm({ ...form, prizePool: e.target.value })} required />
                <FormInput label="Entry Fee" name="entryFee" value={form.entryFee} onChange={(e) => setForm({ ...form, entryFee: e.target.value })} required />
                <FormInput label="Max Teams" name="maxTeams" type="number" value={form.maxTeams} onChange={(e) => setForm({ ...form, maxTeams: e.target.value })} required />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl min-h-[44px]">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl min-h-[44px]">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
