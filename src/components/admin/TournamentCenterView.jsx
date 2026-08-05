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
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  Flame,
  Gamepad2,
  X,
  FileText,
  Users,
  Image,
  Sparkles,
  MapPin,
  Zap,
  Shield,
  Target,
  Crosshair
} from 'lucide-react'
import { SUPPORTED_GAMES } from '../../data/mockData'
import FormInput from '../common/FormInput'
import FormSelect from '../common/FormSelect'
import FormModeSelector from '../common/FormModeSelector'
import AuthAlert from '../common/AuthAlert'
import LoadingButton from '../common/LoadingButton'
import StepWizard from '../common/StepWizard'
import TournamentScheduleForm from '../common/TournamentScheduleForm'
import EntryPrizeSystem from '../common/EntryPrizeSystem'
import OfficialRulebook, { OFFICIAL_MJ_RULES } from '../common/OfficialRulebook'
import ReviewSummaryStep from './ReviewSummaryStep'
import { useToast } from '../../contexts/ToastContext'

export default function TournamentCenterView({
  tournaments = [],
  createTournament,
  editTournament,
  deleteTournament,
  updateTournamentStatus,
}) {
  const { showSuccess, showError } = useToast()
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [gameFilter, setGameFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [actionId, setActionId] = useState(null)
  const [formErrors, setFormErrors] = useState({})

  const defaultFormState = {
    title: '',
    bannerUrl: '',
    game: 'Free Fire',
    mode: 'squad',
    prizePool: '₹1,00,000',
    entryFee: 'Free',
    maxTeams: 32,
    startDate: '',
    startTime: '06:00 PM IST',
    registrationStart: 'Immediate',
    registrationEnd: '1 Hour Prior to Kickoff',
    checkInTime: '05:15 PM IST',
    roomPublishTime: '05:45 PM IST',
    description: 'Official high-stakes tournament.',
    status: 'Registration Open',
    // Free Fire Specifics
    ffMap: 'Bermuda',
    ffGunAttributes: 'Disabled',
    ffCharacterSkills: 'Enabled',
    // BGMI Specifics
    bgmiMap: 'Erangel',
    bgmiPerspective: 'TPP',
    bgmiRedZone: 'Disabled',
  }

  const [form, setForm] = useState(defaultFormState)
  const [alert, setAlert] = useState(null)

  const handleOpenCreateModal = () => {
    setFormErrors({})
    setForm({
      ...defaultFormState,
      startDate: new Date().toISOString().split('T')[0]
    })
    setEditingId(null)
    setCurrentStep(0)
    setShowModal(true)
  }

  const handleOpenEditModal = (t) => {
    setFormErrors({})
    const fmt = (t.match_format || t.matchFormat || t.format || '').toLowerCase()
    const resolvedMode = t.mode
      ? String(t.mode).toLowerCase()
      : (t.team_size === 1 || fmt.includes('solo'))
      ? 'solo'
      : (t.team_size === 2 || fmt.includes('duo'))
      ? 'duo'
      : 'squad'

    setForm({
      title: t.title || '',
      bannerUrl: t.bannerUrl || '',
      game: t.game || 'Free Fire',
      mode: resolvedMode,
      prizePool: t.prizePool || '₹1,00,000',
      entryFee: t.entryFee || 'Free',
      maxTeams: t.maxTeams || 32,
      startDate: t.startDate || new Date().toISOString().split('T')[0],
      startTime: t.startTime || '06:00 PM IST',
      registrationStart: t.registrationStart || 'Immediate',
      registrationEnd: t.registrationEnd || '1 Hour Prior to Kickoff',
      checkInTime: t.checkInTime || '05:15 PM IST',
      roomPublishTime: t.roomPublishTime || '05:45 PM IST',
      description: t.description || 'Official high-stakes tournament.',
      status: t.status || 'Registration Open',
      ffMap: t.ffMap || 'Bermuda',
      ffGunAttributes: t.ffGunAttributes || 'Disabled',
      ffCharacterSkills: t.ffCharacterSkills || 'Enabled',
      bgmiMap: t.bgmiMap || 'Erangel',
      bgmiPerspective: t.bgmiPerspective || 'TPP',
      bgmiRedZone: t.bgmiRedZone || 'Disabled',
    })
    setEditingId(t.id)
    setCurrentStep(0)
    setShowModal(true)
  }

  const validateStep = (stepIdx) => {
    const errors = {}
    if (stepIdx === 0) {
      if (!form.title || !form.title.trim()) {
        errors.title = 'Tournament Title is required.'
      } else if (form.title.trim().length < 3) {
        errors.title = 'Tournament Title must be at least 3 characters long.'
      }
      if (form.bannerUrl && form.bannerUrl.trim() && !form.bannerUrl.startsWith('http://') && !form.bannerUrl.startsWith('https://')) {
        errors.bannerUrl = 'Banner URL must start with http:// or https://'
      }
    } else if (stepIdx === 1) {
      if (!form.startDate) {
        errors.startDate = 'Tournament Date is required.'
      }
      if (!form.registrationStart || !form.registrationStart.trim()) {
        errors.registrationStart = 'Registration Opens time is required.'
      }
      if (!form.registrationEnd || !form.registrationEnd.trim()) {
        errors.registrationEnd = 'Registration Closes time is required.'
      }
      if (!form.checkInTime || !form.checkInTime.trim()) {
        errors.checkInTime = 'Check-in Time is required.'
      }
      if (!form.startTime || !form.startTime.trim()) {
        errors.startTime = 'Match Start Time is required.'
      }
      if (!form.roomPublishTime || !form.roomPublishTime.trim()) {
        errors.roomPublishTime = 'Room Publish Time is required.'
      }
      if (!form.status || !form.status.trim()) {
        errors.status = 'Operational Stage Status is required.'
      }
    } else if (stepIdx === 2) {
      const entryFeeNum = typeof form.entryFeeNum === 'number' ? form.entryFeeNum : (parseFloat(String(form.entryFee || 0).replace(/[^0-9.]/g, '')) || 0)
      const slotsNum = Number(form.maxTeams || 0)
      const pType = form.prizeType || 'placement_kill'
      const prizesObj = form.prizes || {}
      const perKill = Number(form.perKillReward || 0)

      if (isNaN(entryFeeNum) || entryFeeNum < 0) {
        errors.entryFee = 'Entry Fee must be a valid non-negative amount.'
      }
      if (!slotsNum || slotsNum <= 0) {
        errors.maxTeams = 'Max Squad Slots must be greater than 0.'
      }

      // Dynamic Validation strictly based on active Prize Type (Hidden fields are NEVER validated)
      if (pType === 'per_kill') {
        if (!perKill || perKill <= 0) {
          errors.perKillReward = 'Per Kill Reward amount is required.'
        }
      } else if (pType === 'winner_takes_all') {
        if (!prizesObj.winnerPrize || Number(prizesObj.winnerPrize) <= 0) {
          errors.winnerPrize = 'Winner Champion Prize amount is required.'
        }
      } else if (pType === 'placement') {
        if (!prizesObj.firstPrize || Number(prizesObj.firstPrize) <= 0) {
          errors.firstPrize = '1st Champion Prize amount is required.'
        }
      } else if (pType === 'placement_kill') {
        if (!perKill || perKill <= 0) {
          errors.perKillReward = 'Per Kill Reward amount is required.'
        }
        if (!prizesObj.firstPrize || Number(prizesObj.firstPrize) <= 0) {
          errors.firstPrize = '1st Champion Prize amount is required.'
        }
      }
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleWizardNext = () => {
    if (validateStep(currentStep)) {
      setFormErrors({})
      setCurrentStep((prev) => Math.min(prev + 1, 3))
    } else {
      showError('Please fill in all required fields before proceeding to the next step.', 'Validation Error')
    }
  }

  const handleWizardBack = () => {
    setFormErrors({})
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const handleSaveDraft = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!validateStep(0)) {
      setCurrentStep(0)
      showError('Please enter a valid Tournament Title to save draft.', 'Validation Error')
      return
    }
    const draftForm = { ...form, status: 'Draft' }
    setForm(draftForm)
    await submitFormData(draftForm, true)
  }

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!validateStep(0)) {
      setCurrentStep(0)
      showError('Please correct Basic Info errors before publishing.', 'Validation Error')
      return
    }
    if (!validateStep(1)) {
      setCurrentStep(1)
      showError('Please select a valid Start Date & Time before publishing.', 'Validation Error')
      return
    }
    if (!validateStep(2)) {
      setCurrentStep(2)
      showError('Please configure Financials & Slot Capacity before publishing.', 'Validation Error')
      return
    }
    const publishForm = { ...form, status: form.status === 'Draft' ? 'Registration Open' : form.status }
    setForm(publishForm)
    await submitFormData(publishForm, false)
  }

  const submitFormData = async (payload, isDraft = false) => {
    if (isSaving) return // Verify that Publish button only attempts to save once
    setIsSaving(true)
    setAlert(null)
    try {
      const modeSize = payload.mode === 'solo' ? 1 : payload.mode === 'duo' ? 2 : 4
      const formatString = payload.mode === 'solo' ? 'SOLO (1P)' : payload.mode === 'duo' ? 'DUO (2P)' : 'SQUAD (4P)'

      const tournamentPayload = {
        title: String(payload.title || '').trim(),
        game: String(payload.game || 'Free Fire').trim(),
        mode: String(payload.mode || 'squad').trim(),
        team_size: modeSize,
        match_format: formatString,
        format: formatString,
        prize_pool: String(payload.prizePool || '₹0').trim(),
        prizePool: String(payload.prizePool || '₹0').trim(),
        entry_fee: String(payload.entryFee || 'Free').trim(),
        entryFee: String(payload.entryFee || 'Free').trim(),
        max_teams: Number(payload.maxTeams || 32),
        maxTeams: Number(payload.maxTeams || 32),
        start_date: String(payload.startDate || '').trim(),
        startDate: String(payload.startDate || '').trim(),
        start_time: String(payload.startTime || '').trim(),
        startTime: String(payload.startTime || '').trim(),
        registrationStart: payload.registrationStart || null,
        registrationEnd: payload.registrationEnd || null,
        status: String(payload.status || (isDraft ? 'Draft' : 'Registration Open')).trim(),
        rules: Array.isArray(payload.rules) ? payload.rules : OFFICIAL_MJ_RULES,
        banner_url: String(payload.bannerUrl || '').trim(),
        bannerUrl: String(payload.bannerUrl || '').trim(),
        bannerImage: String(payload.bannerUrl || '').trim(),
        description: String(payload.description || 'Official high-stakes tournament.').trim(),
      }

      if (editingId) {
        if (editTournament) await editTournament(editingId, tournamentPayload)
        if (isDraft) {
          showSuccess(`Draft for "${payload.title}" updated successfully!`, 'Draft Updated')
        } else {
          showSuccess(`Tournament "${payload.title}" updated successfully!`, 'Tournament Updated')
        }
      } else {
        if (createTournament) await createTournament(tournamentPayload)
        if (isDraft) {
          showSuccess(`Draft for "${payload.title}" saved to database!`, 'Draft Saved')
        } else {
          showSuccess(`Tournament "${payload.title}" published! Registration is now OPEN.`, 'Tournament Published')
        }
      }

      setShowModal(false)
    } catch (err) {
      console.error({
        payload,
        validationResult: formErrors,
        supabaseError: err,
        stack: err.stack || new Error().stack
      })
      const exactErrorMsg = err.message || 'Failed to insert tournament.'
      setAlert({ type: 'error', message: exactErrorMsg })
      showError(exactErrorMsg, 'Tournament Error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleRegistration = async (t) => {
    const nextStatus = t.status === 'Registration Open' ? 'Registration Closed' : 'Registration Open'
    setActionId(t.id)
    try {
      if (updateTournamentStatus) await updateTournamentStatus(t.id, nextStatus)
      showSuccess(`Registration status updated to "${nextStatus}" for ${t.title}`, 'Status Updated')
    } catch (err) {
      showError(err, 'Toggle Failed')
    } finally {
      setActionId(null)
    }
  }

  const handleDuplicate = async (t) => {
    try {
      const dupPayload = {
        title: `${t.title} (Copy)`,
        game: t.game,
        mode: t.mode || 'squad',
        team_size: t.team_size || 4,
        match_format: t.match_format || t.format || 'SQUAD (4P)',
        format: t.format || 'SQUAD (4P)',
        prize_pool: t.prize_pool || t.prizePool || '₹1,00,000',
        prizePool: t.prizePool || t.prize_pool || '₹1,00,000',
        entry_fee: t.entry_fee || t.entryFee || 'Free',
        entryFee: t.entryFee || t.entry_fee || 'Free',
        max_teams: t.max_teams || t.maxTeams || 32,
        maxTeams: t.maxTeams || t.max_teams || 32,
        start_date: t.start_date || t.startDate || '',
        startDate: t.startDate || t.start_date || '',
        start_time: t.start_time || t.startTime || '06:00 PM IST',
        startTime: t.startTime || t.start_time || '06:00 PM IST',
        status: 'Draft',
        rules: t.rules || [],
        banner_url: t.banner_url || t.bannerUrl || '',
      }
      if (createTournament) await createTournament(dupPayload)
      showSuccess(`Tournament "${t.title}" duplicated successfully!`, 'Tournament Duplicated')
    } catch (err) {
      showError(err, 'Duplication Failed')
    }
  }

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete tournament "${title}"?`)) return
    setActionId(id)
    try {
      if (deleteTournament) await deleteTournament(id)
      showSuccess(`Tournament "${title}" deleted successfully.`, 'Tournament Deleted')
    } catch (err) {
      showError(err, 'Delete Failed')
    } finally {
      setActionId(null)
    }
  }

  // Filter tournaments
  const filteredTournaments = tournaments.filter((t) => {
    const matchesSearch =
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.game?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesGame = !gameFilter || t.game === gameFilter
    const matchesStatus = !statusFilter || t.status === statusFilter
    return matchesSearch && matchesGame && matchesStatus
  })

  // Define steps for Step Wizard
  const wizardSteps = [
    {
      title: 'General Information',
      shortTitle: 'General',
      content: (
        <div className="space-y-4">
          <FormInput
            label="Tournament Title"
            name="title"
            value={form.title}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, title: e.target.value }))
              if (formErrors.title) setFormErrors((prev) => ({ ...prev, title: null }))
            }}
            placeholder="e.g. Free Fire India Championship 2026"
            required
            error={formErrors.title}
            icon={Trophy}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect
              label="Game Title"
              name="game"
              value={form.game}
              onChange={(e) => setForm((prev) => ({ ...prev, game: e.target.value }))}
              options={SUPPORTED_GAMES}
              required
              icon={Gamepad2}
            />

            <FormModeSelector
              label="Competition Mode"
              value={form.mode}
              onChange={(newMode) => setForm((prev) => ({ ...prev, mode: newMode }))}
              required
            />
          </div>

          <div className="p-3.5 bg-[#07090c] border border-[#00f2ff]/30 rounded-xl flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2.5">
              <Users className="w-4.5 h-4.5 text-[#00f2ff] shrink-0" />
              <div>
                <span className="font-label-caps text-[9px] font-bold text-[#8e9dae] uppercase tracking-widest block">
                  Selected Match Format Preview
                </span>
                <h4 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-tight">
                  {form.mode === 'solo'
                    ? 'Solo Battle Royale'
                    : form.mode === 'duo'
                    ? 'Duo Battle Royale'
                    : 'Squad Battle Royale'}
                </h4>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/30 uppercase font-mono">
              {form.mode === 'solo' ? '1 Player Required' : form.mode === 'duo' ? '2 Players Required' : '4 Players Required'}
            </span>
          </div>

          <FormInput
            label="Banner Image URL (Optional)"
            name="bannerUrl"
            value={form.bannerUrl}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, bannerUrl: e.target.value }))
              if (formErrors.bannerUrl) setFormErrors((prev) => ({ ...prev, bannerUrl: null }))
            }}
            placeholder="https://images.unsplash.com/photo-..."
            error={formErrors.bannerUrl}
            icon={Image}
          />
        </div>
      ),
    },
    {
      title: 'Scheduling & Game Settings',
      shortTitle: 'Schedule & Rules',
      content: (
        <div className="space-y-4">
          
          {/* CONDITIONAL GAME OPTIONS SECTION */}
          {form.game === 'Free Fire' ? (
            <div className="p-4 bg-[#07090c] border border-[#00f2ff]/30 rounded-xl space-y-3.5 shadow-inner">
              <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-2">
                <span className="text-xs font-bold text-[#00f2ff] uppercase flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#fe6b00]" />
                  <span>Free Fire Tournament Parameters</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#fe6b00]/10 text-[#fe6b00] border border-[#fe6b00]/30 uppercase">
                  FF Preset
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormSelect
                  label="Match Map"
                  name="ffMap"
                  value={form.ffMap}
                  onChange={(e) => setForm((prev) => ({ ...prev, ffMap: e.target.value }))}
                  options={['Bermuda', 'Purgatory', 'Kalahari', 'Alpine', 'Nexterra']}
                  icon={MapPin}
                />

                <FormSelect
                  label="Gun Attributes"
                  name="ffGunAttributes"
                  value={form.ffGunAttributes}
                  onChange={(e) => setForm((prev) => ({ ...prev, ffGunAttributes: e.target.value }))}
                  options={['Disabled', 'Enabled']}
                  icon={Crosshair}
                />

                <FormSelect
                  label="Character Skills"
                  name="ffCharacterSkills"
                  value={form.ffCharacterSkills}
                  onChange={(e) => setForm((prev) => ({ ...prev, ffCharacterSkills: e.target.value }))}
                  options={['Enabled', 'Disabled']}
                  icon={Zap}
                />
              </div>
            </div>
          ) : form.game === 'BGMI' ? (
            <div className="p-4 bg-[#07090c] border border-[#00ff9d]/30 rounded-xl space-y-3.5 shadow-inner">
              <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-2">
                <span className="text-xs font-bold text-[#00ff9d] uppercase flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#00ff9d]" />
                  <span>BGMI Tournament Parameters</span>
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/30 uppercase">
                  BGMI Preset
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormSelect
                  label="Match Map"
                  name="bgmiMap"
                  value={form.bgmiMap}
                  onChange={(e) => setForm((prev) => ({ ...prev, bgmiMap: e.target.value }))}
                  options={['Erangel', 'Miramar', 'Sanhok', 'Vikendi', 'Livik']}
                  icon={MapPin}
                />

                <FormSelect
                  label="Perspective"
                  name="bgmiPerspective"
                  value={form.bgmiPerspective}
                  onChange={(e) => setForm((prev) => ({ ...prev, bgmiPerspective: e.target.value }))}
                  options={['TPP', 'FPP']}
                  icon={Target}
                />

                <FormSelect
                  label="Red Zone"
                  name="bgmiRedZone"
                  value={form.bgmiRedZone}
                  onChange={(e) => setForm((prev) => ({ ...prev, bgmiRedZone: e.target.value }))}
                  options={['Disabled', 'Enabled']}
                />
              </div>
            </div>
          ) : null}

          {/* TOURNAMENT SCHEDULE (V1 FIELDS) */}
          <TournamentScheduleForm
            startDate={form.startDate}
            startTime={form.startTime}
            registrationStart={form.registrationStart}
            registrationEnd={form.registrationEnd}
            checkInTime={form.checkInTime}
            roomPublishTime={form.roomPublishTime}
            errors={formErrors}
            onChange={(sched) => {
              setForm((prev) => ({
                ...prev,
                ...sched
              }))
              if (Object.keys(formErrors).length > 0) setFormErrors({})
            }}
          />

          <div className="space-y-1">
            <label className="font-label-caps text-[11px] font-bold text-[#8e9dae] uppercase">Operational Stage Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full p-3 bg-[#07090c] border border-[#3a494b] rounded text-white text-xs focus:outline-none focus:border-[#00f2ff]"
            >
              <option value="Draft">Stage 1: Draft (Private)</option>
              <option value="Registration Open">Stage 2: Registration Open</option>
              <option value="Registration Closed">Stage 5: Registration Closed</option>
              <option value="Live Now">Stage 8: Live Now</option>
              <option value="Completed">Stage 11: Completed</option>
            </select>
          </div>

          {/* READ-ONLY OFFICIAL TOURNAMENT RULEBOOK */}
          <OfficialRulebook rules={OFFICIAL_MJ_RULES} />
        </div>
      ),
    },
    {
      title: 'Prize & Entry System (V1)',
      shortTitle: 'Prize & Entry',
      content: (
        <EntryPrizeSystem
          entryFee={form.entryFee}
          maxTeams={form.maxTeams}
          game={form.game}
          mode={form.mode}
          paymentType={form.paymentType}
          distributionType={form.distributionType}
          perKillReward={form.perKillReward}
          prizes={form.prizes}
          errors={formErrors}
          onChange={(financialData) => {
            setForm((prev) => ({
              ...prev,
              ...financialData
            }))
            if (Object.keys(formErrors).length > 0) setFormErrors({})
          }}
        />
      ),
    },
    {
      title: 'Review & Launch Tournament',
      shortTitle: 'Review & Publish',
      content: (
        <ReviewSummaryStep form={form} />
      ),
    },
  ]

  return (
    <div className="space-y-6 antialiased font-mono text-xs">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3a494b]/60 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] text-[10px] font-bold uppercase tracking-wider mb-1">
            <Trophy className="w-3.5 h-3.5" />
            <span>Tournament Management</span>
          </div>
          <h2 className="font-display-lg text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
            Tournament Operations Hub
          </h2>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="btn-cyber text-xs py-3 px-5 uppercase tracking-wider flex items-center gap-2 min-h-[44px] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Tournament Wizard</span>
        </button>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#151a21] p-4 rounded-xl border border-[#3a494b]/60 shadow-lg">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#8e9dae] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tournaments by name or game..."
            className="w-full bg-[#07090c] border border-[#3a494b] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#8e9dae] focus:border-[#00f2ff] focus:outline-none h-[38px]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[#8e9dae]" />
          <select
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value)}
            className="bg-[#07090c] border border-[#3a494b] rounded-lg px-3 py-2 text-xs text-white focus:border-[#00f2ff] focus:outline-none h-[38px]"
          >
            <option value="">All Games</option>
            {SUPPORTED_GAMES.map((g) => (
              <option key={`filter-${g}`} value={g}>{g}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#07090c] border border-[#3a494b] rounded-lg px-3 py-2 text-xs text-white focus:border-[#00f2ff] focus:outline-none h-[38px]"
          >
            <option value="">All Statuses</option>
            <option value="Registration Open">Registration Open</option>
            <option value="Live Now">Live Now</option>
            <option value="Registration Closed">Registration Closed</option>
            <option value="Draft">Draft</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* TOURNAMENTS GRID DISPLAY */}
      {filteredTournaments.length === 0 ? (
        <div className="py-16 text-center border border-[#3a494b]/60 bg-[#151a21]/60 rounded-xl p-6 space-y-3 shadow-lg">
          <Trophy className="w-10 h-10 text-[#8e9dae] mx-auto opacity-50" />
          <p className="text-xs font-bold text-white uppercase">No Tournaments Found</p>
          <p className="text-[10px] text-[#8e9dae]">No tournaments match the selected filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTournaments.map((t) => (
            <div
              key={t.id}
              className="bg-[#151a21] border border-[#3a494b]/60 hover:border-[#00f2ff]/50 rounded-xl p-5 space-y-4 shadow-xl flex flex-col justify-between transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30">
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
                    <span className="font-mono font-bold text-[#00f2ff]">{t.registeredTeams || 0} / {t.maxTeams || 32} Teams</span>
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
                    className="btn-cyber-outline text-[11px] min-h-[38px] py-1.5 px-2.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#00f2ff]" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDuplicate(t)}
                    className="btn-cyber-outline text-[11px] min-h-[38px] py-1.5 px-2.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#00f2ff]" />
                    <span>Duplicate</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => handleToggleRegistration(t)}
                    className="btn-cyber-outline text-[11px] min-h-[38px] py-1.5 px-2.5 text-[#ffb800] cursor-pointer"
                  >
                    {t.status === 'Registration Open' ? <Lock className="w-3.5 h-3.5 text-[#ffb800]" /> : <Unlock className="w-3.5 h-3.5 text-[#00ff9d]" />}
                    <span>{t.status === 'Registration Open' ? 'Close Reg' : 'Open Reg'}</span>
                  </button>

                  <button
                    onClick={() => handleDelete(t.id, t.title)}
                    className="btn-cyber-danger text-[11px] min-h-[38px] py-1.5 px-2.5 cursor-pointer"
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

      {/* REUSABLE STEP WIZARD MODAL DIALOG */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#151a21] border border-[#3a494b] rounded-2xl max-w-3xl w-full p-6 sm:p-8 space-y-5 shadow-[0_0_50px_rgba(0,242,255,0.15)] relative max-h-[92vh] overflow-y-auto">
            
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-[#00f2ff] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 border-b border-[#3a494b]/50 pb-3">
              <h3 className="font-display-lg text-lg font-bold text-white uppercase tracking-tight flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#00f2ff]" />
                <span>{editingId ? 'Edit Tournament Configuration' : 'Tournament Creation Wizard'}</span>
              </h3>
              <p className="text-xs text-[#8e9dae]">Configure parameters, schedule, financials, and rules in 4 guided steps.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <StepWizard
                steps={wizardSteps}
                currentStep={currentStep}
                onNext={handleWizardNext}
                onBack={handleWizardBack}
                onSaveDraft={handleSaveDraft}
                onCancel={() => setShowModal(false)}
                nextText="Next Step"
                finishText={editingId ? 'Update & Publish' : 'Publish Tournament'}
                isSubmitting={isSaving}
              />
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
