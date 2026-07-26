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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3a494b]/60 pb-4">
        <div className="space-y-1">
          <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#fe6b00]" />
            <span>TOURNAMENT MANAGEMENT</span>
          </h2>
          <p className="text-xs text-[#8e9dae]">
            Configure competitions, slots, entry fees, prize pools, and status controls.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="btn-cyber-primary"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Tournament</span>
        </button>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* FILTER BAR: Search, Game Filter, Status Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 shadow-xl">
        <div className="relative">
          <Search className="w-4 h-4 text-[#8e9dae] absolute left-3 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tournament name..."
            className="w-full pl-9 pr-3 py-2.5 bg-[#07090c] border border-[#3a494b] rounded text-xs text-white placeholder-[#8e9dae] focus:outline-none focus:border-[#00f2ff]"
          />
        </div>

        <div>
          <select
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value)}
            className="w-full p-2.5 bg-[#07090c] border border-[#3a494b] rounded text-xs text-white focus:outline-none focus:border-[#00f2ff]"
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
            className="w-full p-2.5 bg-[#07090c] border border-[#3a494b] rounded text-xs text-white focus:outline-none focus:border-[#00f2ff]"
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
        <div className="p-12 text-center bg-[#151a21] border border-[#3a494b]/60 rounded-xl space-y-3 shadow-xl">
          <Trophy className="w-10 h-10 text-[#8e9dae] mx-auto" />
          <h3 className="font-display-lg text-sm font-bold text-white uppercase">No Tournaments Found</h3>
          <p className="text-xs text-[#8e9dae]">No competitions match your selected search or filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((t) => (
            <div key={`tc-card-${t.id}`} className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-4 shadow-xl flex flex-col justify-between hover:border-[#00f2ff] transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#07090c] text-[#00f2ff] border border-[#00f2ff]/30">
                    {t.game}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                    t.status === 'Registration Open'
                      ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40'
                      : t.status === 'Live Now'
                      ? 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40 animate-pulse'
                      : 'bg-[#07090c] text-[#8e9dae] border-[#3a494b]'
                  }`}>
                    {t.status}
                  </span>
                </div>

                <h3 className="font-display-lg font-extrabold text-white text-base uppercase">{t.title}</h3>
                <p className="text-xs text-[#8e9dae]">{t.format} &bull; Entry: <span className="text-[#00f2ff] font-bold">{t.entryFee || 'Free'}</span> &bull; Prize: <span className="font-mono text-[#ffb693] font-bold">{t.prizePool}</span></p>

                {/* Slots & Progress Bar */}
                <div className="p-3.5 bg-[#07090c] rounded border border-[#3a494b]/60 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#8e9dae] font-semibold">Slot Progress</span>
                    <span className="font-mono font-bold text-[#00f2ff]">{t.registeredTeams} / {t.maxTeams} Teams</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#151a21] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00f2ff] rounded-full"
                      style={{ width: `${Math.min(100, ((t.registeredTeams || 0) / (t.maxTeams || 32)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-[#8e9dae] pt-0.5 font-mono">
                    <span>Date: {t.startDate}</span>
                    <span>Time: {t.startTime}</span>
                  </div>
                </div>
              </div>

              {/* ACTION CONTROL BUTTONS */}
              <div className="space-y-2 pt-3 border-t border-[#3a494b]/60">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => handleOpenEditModal(t)}
                    className="py-2 px-3 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] text-[#e1e2e7] rounded font-bold flex items-center justify-center gap-1.5 min-h-[38px] uppercase tracking-wider"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#00f2ff]" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDuplicate(t)}
                    className="py-2 px-3 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] text-[#e1e2e7] rounded font-bold flex items-center justify-center gap-1.5 min-h-[38px] uppercase tracking-wider"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#00f2ff]" />
                    <span>Duplicate</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => handleToggleRegistration(t)}
                    className="py-2 px-3 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] text-[#ffb800] rounded font-bold flex items-center justify-center gap-1.5 min-h-[38px] uppercase tracking-wider"
                  >
                    {t.status === 'Registration Open' ? <Lock className="w-3.5 h-3.5 text-[#ffb800]" /> : <Unlock className="w-3.5 h-3.5 text-[#00ff9d]" />}
                    <span>{t.status === 'Registration Open' ? 'Close Reg' : 'Open Reg'}</span>
                  </button>

                  <button
                    onClick={() => handleDelete(t.id, t.title)}
                    className="py-2 px-3 bg-[#07090c] hover:bg-red-950/40 border border-[#3a494b] hover:border-[#ff3366] text-[#ff3366] rounded font-bold flex items-center justify-center gap-1.5 min-h-[38px] uppercase tracking-wider"
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

      {/* CREATE / EDIT MODAL DIALOG */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#151a21] border border-[#3a494b] rounded-xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 p-2 rounded bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <h3 className="font-display-lg text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#00f2ff]" />
                <span>{editingId ? 'Edit Tournament Configuration' : 'Create New Tournament'}</span>
              </h3>
              <p className="text-xs text-[#8e9dae]">Configure parameters and rule sets for competitive play.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <FormInput
                label="Tournament Title"
                name="title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Free Fire India Championship 2026"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-label-caps text-[11px] font-bold text-[#8e9dae] uppercase">Game Title</label>
                  <select
                    value={form.game}
                    onChange={(e) => setForm((prev) => ({ ...prev, game: e.target.value }))}
                    className="w-full p-3 bg-[#07090c] border border-[#3a494b] rounded text-white text-xs focus:outline-none focus:border-[#00f2ff]"
                  >
                    {SUPPORTED_GAMES.map((g) => (
                      <option key={`m-game-${g}`} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <FormInput
                  label="Match Format"
                  name="format"
                  value={form.format}
                  onChange={(e) => setForm((prev) => ({ ...prev, format: e.target.value }))}
                  placeholder="e.g. Squad Battle Royale"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <FormInput
                  label="Prize Pool"
                  name="prizePool"
                  value={form.prizePool}
                  onChange={(e) => setForm((prev) => ({ ...prev, prizePool: e.target.value }))}
                  placeholder="₹1,00,000"
                  required
                />

                <FormInput
                  label="Entry Fee"
                  name="entryFee"
                  value={form.entryFee}
                  onChange={(e) => setForm((prev) => ({ ...prev, entryFee: e.target.value }))}
                  placeholder="Free or ₹50"
                  required
                />

                <FormInput
                  label="Max Squad Slots"
                  name="maxTeams"
                  type="number"
                  value={form.maxTeams}
                  onChange={(e) => setForm((prev) => ({ ...prev, maxTeams: e.target.value }))}
                  placeholder="32"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Start Date"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  required
                />

                <FormInput
                  label="Start Time"
                  name="startTime"
                  value={form.startTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                  placeholder="06:00 PM IST"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-label-caps text-[11px] font-bold text-[#8e9dae] uppercase">Tournament Rulebook (1 rule per line)</label>
                <textarea
                  rows={4}
                  value={form.rulesText}
                  onChange={(e) => setForm((prev) => ({ ...prev, rulesText: e.target.value }))}
                  placeholder="Enter tournament rules..."
                  className="w-full p-3 bg-[#07090c] border border-[#3a494b] rounded text-white text-xs placeholder-[#8e9dae] focus:outline-none focus:border-[#00f2ff]"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-xs font-bold bg-[#07090c] text-[#8e9dae] border border-[#3a494b] rounded hover:bg-[#1d232c] uppercase min-h-[44px]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-cyber-primary flex-1 justify-center py-3 min-h-[44px]"
                >
                  {isSaving ? 'Saving Configuration...' : editingId ? 'Update Tournament' : 'Create Competition'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  )
}
