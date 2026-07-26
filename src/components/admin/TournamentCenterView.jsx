import { useState } from 'react'
import {
  Trophy,
  Plus,
  Edit3,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  Flame,
  Gamepad2,
  X,
  FileText
} from 'lucide-react'
import { SUPPORTED_GAMES } from '../../data/mockData'
import FormInput from '../common/FormInput'
import AuthAlert from '../common/AuthAlert'

export default function TournamentCenterView({
  tournaments = [],
  createTournament,
  editTournament,
  deleteTournament,
  updateTournamentStatus,
}) {
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [gameFilter, setGameFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [isSaving, setIsSaving] = useState(false)

  const [form, setForm] = useState({
    title: '',
    bannerUrl: '',
    game: 'Free Fire',
    format: 'Squad Battle Royale',
    prizePool: '₹1,00,000',
    entryFee: 'Free',
    maxTeams: 32,
    startDate: new Date().toISOString().split('T')[0],
    startTime: '06:00 PM IST',
    rulesText: '1. No hacking or third-party emulator cheats allowed.\n2. All team captains must check-in 15 mins prior.\n3. Room ID & Password will be published 10 mins before match start.',
    description: 'Official MJ ESPORTS tournament showdown.',
    status: 'Registration Open',
  })

  const [alert, setAlert] = useState(null)

  const handleOpenCreateModal = () => {
    setEditingId(null)
    setForm({
      title: '',
      bannerUrl: '',
      game: 'Free Fire',
      format: 'Squad Battle Royale',
      prizePool: '₹1,00,000',
      entryFee: 'Free',
      maxTeams: 32,
      startDate: new Date().toISOString().split('T')[0],
      startTime: '06:00 PM IST',
      rulesText: '1. No hacking or third-party emulator cheats allowed.\n2. All team captains must check-in 15 mins prior.\n3. Room ID & Password will be published 10 mins before match start.',
      description: '',
      status: 'Registration Open',
    })
    setShowModal(true)
  }

  const handleOpenEditModal = (t) => {
    setEditingId(t.id)
    const existingRules = Array.isArray(t.rules)
      ? t.rules.join('\n')
      : typeof t.rules === 'string'
      ? t.rules
      : ''

    setForm({
      title: t.title || '',
      bannerUrl: t.bannerUrl || t.banner_url || '',
      game: t.game || 'Free Fire',
      format: t.format || 'Squad Battle Royale',
      prizePool: t.prizePool || t.prize_pool || '₹1,00,000',
      entryFee: t.entryFee || t.entry_fee || 'Free',
      maxTeams: t.maxTeams || t.max_teams || 32,
      startDate: t.startDate || t.start_date || new Date().toISOString().split('T')[0],
      startTime: t.startTime || t.start_time || '06:00 PM IST',
      rulesText: existingRules,
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
      setAlert({ type: 'success', message: `Registration status updated to "${nextStatus}" for ${t.title}` })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to update status.' })
    }
  }

  const handleTogglePublish = async (t) => {
    try {
      const nextStatus = t.status === 'Registration Closed' || t.status === 'Draft' ? 'Registration Open' : 'Registration Closed'
      await updateTournamentStatus(t.id, nextStatus)
      setAlert({ type: 'success', message: `Tournament status updated to "${nextStatus}" for ${t.title}` })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to update publish state.' })
    }
  }

  const handleDelete = async (tId, title) => {
    if (!window.confirm(`Are you sure you want to delete tournament "${title}"?`)) return
    try {
      await deleteTournament(tId)
      setAlert({ type: 'success', message: `Tournament "${title}" deleted successfully.` })
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to delete tournament.' })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setAlert({ type: 'error', message: 'Tournament Name is required.' })
      return
    }

    setIsSaving(true)
    const rulesArray = form.rulesText
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r.length > 0)

    const payload = {
      title: form.title.trim(),
      game: form.game,
      format: form.format.trim(),
      prizePool: form.prizePool.trim(),
      entryFee: form.entryFee.trim(),
      maxTeams: parseInt(form.maxTeams, 10) || 32,
      startDate: form.startDate,
      startTime: form.startTime.trim(),
      rules: rulesArray,
      description: form.description.trim(),
      status: form.status,
    }

    try {
      if (editingId) {
        await editTournament(editingId, payload)
        setAlert({ type: 'success', message: 'Tournament configuration updated successfully!' })
      } else {
        await createTournament({
          ...payload,
          organizer: 'MJ ESPORTS Official',
        })
        setAlert({ type: 'success', message: 'New tournament created successfully!' })
      }
      setShowModal(false)
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to save tournament.' })
    } finally {
      setIsSaving(false)
    }
  }

  // Filter tournaments list
  const filteredTournaments = tournaments.filter((t) => {
    const matchesSearch = t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.game?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesGame = gameFilter === 'ALL' || t.game?.toLowerCase() === gameFilter.toLowerCase()
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter

    return matchesSearch && matchesGame && matchesStatus
  })

  return (
    <div className="space-y-6">
      
      {/* Header Controls & Create Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-purple-400" />
            <span>TOURNAMENT MANAGEMENT</span>
          </h2>
          <p className="text-xs text-slate-400">
            Configure competitions, slots, entry fees, prize pools, and status controls.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 text-slate-950 font-extrabold text-xs rounded-xl hover:brightness-110 shadow-lg flex items-center justify-center gap-2 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Tournament</span>
        </button>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* FILTER BAR: Search, Game Filter, Status Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tournament name..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div>
          <select
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value)}
            className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">All Games</option>
            {SUPPORTED_GAMES.map((g) => (
              <option key={`game-f-${g}`} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Registration Open">Registration Open</option>
            <option value="Live Now">Live Now</option>
            <option value="Registration Closed">Registration Closed</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* TOURNAMENT CARDS GRID */}
      {filteredTournaments.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
          <Trophy className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white uppercase">No Tournaments Found</h3>
          <p className="text-xs text-slate-400">No competitions match your selected search or filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((t) => (
            <div key={`tc-card-${t.id}`} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-950 text-cyan-300 border border-cyan-500/30">
                    {t.game}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                    t.status === 'Registration Open'
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : t.status === 'Live Now'
                      ? 'bg-red-950 text-red-400 border-red-800 animate-pulse'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}>
                    {t.status}
                  </span>
                </div>

                <h3 className="font-extrabold text-white text-base">{t.title}</h3>
                <p className="text-xs text-slate-400">{t.format} &bull; Entry: <span className="text-purple-300 font-bold">{t.entryFee || 'Free'}</span> &bull; Prize: <span className="text-emerald-400 font-bold">{t.prizePool}</span></p>

                {/* Slots & Progress Bar */}
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 font-semibold">Slot Progress</span>
                    <span className="font-bold text-cyan-300">{t.registeredTeams} / {t.maxTeams} Teams</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full"
                      style={{ width: `${Math.min(100, ((t.registeredTeams || 0) / (t.maxTeams || 32)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-0.5">
                    <span>Date: {t.startDate}</span>
                    <span>Time: {t.startTime}</span>
                  </div>
                </div>
              </div>

              {/* ACTION CONTROL BUTTONS */}
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
      )}

      {/* EDIT / CREATE TOURNAMENT MODAL DIALOG */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            {/* Close Modal Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-purple-400 uppercase tracking-widest block">
                {editingId ? 'EDIT CONFIGURATION' : 'NEW COMPETITION'}
              </span>
              <h3 className="text-xl font-extrabold text-white uppercase tracking-tight">
                {editingId ? 'Edit Tournament' : 'Create Tournament'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Name (Title) */}
              <FormInput
                label="Tournament Name"
                name="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Free Fire India Championship 2026"
                required
                icon={Trophy}
              />

              {/* Game & Match Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Game</label>
                  <select
                    value={form.game}
                    onChange={(e) => setForm({ ...form, game: e.target.value })}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 min-h-[44px]"
                  >
                    {SUPPORTED_GAMES.map((g) => (
                      <option key={`m-game-${g}`} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <FormInput
                  label="Match Type (Format)"
                  name="format"
                  value={form.format}
                  onChange={(e) => setForm({ ...form, format: e.target.value })}
                  placeholder="e.g. Squad Battle Royale"
                  required
                />
              </div>

              {/* Entry Fee, Prize Pool, Slots */}
              <div className="grid grid-cols-3 gap-3">
                <FormInput
                  label="Entry Fee"
                  name="entryFee"
                  value={form.entryFee}
                  onChange={(e) => setForm({ ...form, entryFee: e.target.value })}
                  placeholder="Free / ₹50"
                  required
                />

                <FormInput
                  label="Prize Pool"
                  name="prizePool"
                  value={form.prizePool}
                  onChange={(e) => setForm({ ...form, prizePool: e.target.value })}
                  placeholder="₹1,00,000"
                  required
                />

                <FormInput
                  label="Slots (Max Teams)"
                  name="maxTeams"
                  type="number"
                  value={form.maxTeams}
                  onChange={(e) => setForm({ ...form, maxTeams: e.target.value })}
                  required
                />
              </div>

              {/* Start Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Start Date"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                  icon={Calendar}
                />

                <FormInput
                  label="Start Time"
                  name="startTime"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  placeholder="06:00 PM IST"
                  required
                  icon={Clock}
                />
              </div>

              {/* Status Select */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Tournament Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 min-h-[44px]"
                >
                  <option value="Registration Open">Registration Open</option>
                  <option value="Live Now">Live Now</option>
                  <option value="Registration Closed">Registration Closed</option>
                  <option value="Completed">Completed</option>
                  <option value="Bracket Locked">Bracket Locked</option>
                </select>
              </div>

              {/* Rules (Multiline) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Tournament Rules (One per line)</label>
                <textarea
                  value={form.rulesText}
                  onChange={(e) => setForm({ ...form, rulesText: e.target.value })}
                  rows={3}
                  placeholder="1. Rule one...\n2. Rule two..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSaving}
                  className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors min-h-[44px] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3.5 bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 text-slate-950 font-bold text-xs rounded-xl hover:brightness-110 shadow-lg transition-all min-h-[44px] disabled:opacity-50"
                >
                  {isSaving ? 'Saving to Database...' : editingId ? 'Update Tournament' : 'Create Tournament'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}
