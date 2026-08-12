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
  Crosshair,
  ChevronRight
} from 'lucide-react'
import { SUPPORTED_GAMES } from '../../data/mockData'
import { getTournamentImage } from '../../utils/tournamentImageUtils'
import { calculateFormattedPrize, formatTournamentPrize } from '../../utils/tournamentPrizeUtils'
import {
  TOURNAMENT_LIFECYCLE_STAGES,
  getNextLifecycleStage,
  normalizeLifecycleStatus
} from '../../constants/tournamentLifecycle'
import FormInput from '../common/FormInput'
import FormSelect from '../common/FormSelect'
import FormModeSelector from '../common/FormModeSelector'
import AuthAlert from '../common/AuthAlert'
import LoadingButton from '../common/LoadingButton'
import StepWizard from '../common/StepWizard'
import TournamentScheduleForm from '../common/TournamentScheduleForm'
import EntryPrizeSystem from '../common/EntryPrizeSystem'
import OfficialRulebook, { OFFICIAL_MJ_RULES } from '../common/OfficialRulebook'
import { useTournaments } from '../../contexts/TournamentContext'
import { useToast } from '../../contexts/ToastContext'
import { telemetry } from '../../services/telemetryService'
import ReviewSummaryStep from './ReviewSummaryStep'
import AllTournamentsView from './tournaments/AllTournamentsView'
import TournamentOperationsWorkspace from './tournaments/TournamentOperationsWorkspace'
import RegistrationQueueView from './RegistrationQueueView'
import MatchControlView from './MatchControlView'

export default function TournamentCenterView({
  tournaments = [],
  createTournament,
  editTournament,
  deleteTournament,
  updateTournamentStatus,
}) {
  const { advanceTournamentLifecycle } = useTournaments()
  const { showSuccess, showError } = useToast()
  const [activeOpsTab, setActiveOpsTab] = useState('ALL_TOURNAMENTS')
  const [selectedTournamentId, setSelectedTournamentId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [gameFilter, setGameFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [actionId, setActionId] = useState(null)
  const [formErrors, setFormErrors] = useState({})

  const handleAdvanceStage = async (t) => {
    const nextStage = getNextLifecycleStage(t.status)
    if (!nextStage) {
      showError('Tournament is already at the final lifecycle stage.', 'Lifecycle Stage')
      return
    }
    setActionId(t.id)
    try {
      const res = await advanceTournamentLifecycle(t.id)
      if (res && res.success === false) {
        showError(res.error || 'Failed to advance stage.', 'Lifecycle Error')
      } else {
        showSuccess(`Tournament stage advanced to "${nextStage}"`, 'Lifecycle Updated')
      }
    } catch {
      showError('Failed to update stage.', 'Lifecycle Error')
    } finally {
      setActionId(null)
    }
  }

  const defaultFormState = {
    title: '',
    game: 'Free Fire MAX',
    mode: 'squad',
    prizePool: '₹0',
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
      game: t.game || 'Free Fire',
      mode: resolvedMode,
      prizePool: formatTournamentPrize(t),
      entryFee: t.entryFee || t.entry_fee || 'Free',
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
      prizeType: t.prizeType || t.prize_type || 'placement',
      perKillReward: t.perKillReward || t.per_kill_reward || 30,
      prizes: t.prizes || t.prize_details || {},
    })
    setEditingId(t.id)
    setCurrentStep(0)
    setShowModal(true)
  }

  const getStepValidationErrors = (stepIdx) => {
    const errors = {}

    if (stepIdx === 0) {
      if (!form.title || !form.title.trim()) {
        errors.title = 'Tournament Name is required.'
      } else if (form.title.trim().length < 3) {
        errors.title = 'Tournament Name must be at least 3 characters long.'
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
    } else if (stepIdx === 2) {
      // 1. REGISTRATION VALIDATION
      const isPaymentOn = Boolean(form.paymentEnabled)
      const entryFeeNum = isPaymentOn
        ? (typeof form.entryFeeNum === 'number' ? form.entryFeeNum : (parseFloat(String(form.entryFee || 0).replace(/[^0-9.]/g, '')) || 0))
        : 0
      const slotsNum = Number(form.maxTeams || 0)

      if (isPaymentOn && (isNaN(entryFeeNum) || entryFeeNum < 0)) {
        errors.entryFee = 'Entry Fee must be greater than or equal to 0.'
      }
      if (!slotsNum || slotsNum <= 0) {
        errors.maxTeams = 'Total Team Slots must be greater than 0.'
      }

      // 2. PAYMENT VALIDATION (Skipped completely if Payment Status is OFF)
      if (isPaymentOn) {
        if (!form.paymentGateway || !String(form.paymentGateway).trim()) {
          errors.paymentGateway = 'Payment Gateway is required when Payment Status is ON.'
        }
      }

      // 3. PRIZE TYPE VALIDATION
      const pType = form.prizeType || 'placement'
      if (!pType) {
        errors.prizeType = 'Exactly one Prize Type must be selected.'
      }

      // 4. PRIZE CONFIGURATION VALIDATION (Dynamic based on selected Prize Type)
      const prizesObj = form.prizes || {}
      const perKill = Number(form.perKillReward || 0)

      if (pType === 'placement') {
        if (!prizesObj.firstPrize || Number(prizesObj.firstPrize) <= 0) {
          errors.firstPrize = '1st Prize amount is required.'
        }
      } else if (pType === 'placement_kill') {
        if (!prizesObj.firstPrize || Number(prizesObj.firstPrize) <= 0) {
          errors.firstPrize = '1st Prize amount is required.'
        }
        if (!perKill || perKill <= 0) {
          errors.perKillReward = 'Per Kill Reward amount is required.'
        }
      } else if (pType === 'per_kill') {
        if (!perKill || perKill <= 0) {
          errors.perKillReward = 'Per Kill Reward amount is required.'
        }
      } else if (pType === 'winner_takes_all') {
        if (!prizesObj.winnerPrize || Number(prizesObj.winnerPrize) <= 0) {
          errors.winnerPrize = 'Winner Prize amount is required.'
        }
      }
    }

    return errors
  }

  const validateStep = (stepIdx) => {
    const errors = getStepValidationErrors(stepIdx)
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleWizardNext = () => {
    const errors = getStepValidationErrors(currentStep)
    setFormErrors(errors)
    if (Object.keys(errors).length === 0) {
      setCurrentStep((prev) => Math.min(prev + 1, 2))
    } else {
      const firstErrorMsg = Object.values(errors)[0] || 'Please fill in all required fields before proceeding.'
      showError(firstErrorMsg, 'Validation Error')
    }
  }

  const handleWizardBack = () => {
    setFormErrors({})
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const handleSaveDraft = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    const errors = getStepValidationErrors(0)
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      setCurrentStep(0)
      const firstErrorMsg = Object.values(errors)[0] || 'Please enter a valid Tournament Name to save draft.'
      showError(firstErrorMsg, 'Validation Error')
      return
    }
    const draftForm = { ...form, status: 'Draft' }
    setForm(draftForm)
    await submitFormData(draftForm, true)
  }

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()

    const step0Errors = getStepValidationErrors(0)
    if (Object.keys(step0Errors).length > 0) {
      setFormErrors(step0Errors)
      setCurrentStep(0)
      const firstErrorMsg = Object.values(step0Errors)[0] || 'General Information validation failed.'
      showError(firstErrorMsg, 'Validation Error')
      return
    }

    const step1Errors = getStepValidationErrors(1)
    if (Object.keys(step1Errors).length > 0) {
      setFormErrors(step1Errors)
      setCurrentStep(1)
      const firstErrorMsg = Object.values(step1Errors)[0] || 'Match Configuration & Schedule validation failed.'
      showError(firstErrorMsg, 'Validation Error')
      return
    }

    const step2Errors = getStepValidationErrors(2)
    if (Object.keys(step2Errors).length > 0) {
      setFormErrors(step2Errors)
      setCurrentStep(2)
      const firstErrorMsg = Object.values(step2Errors)[0] || 'Registration & Prize validation failed.'
      showError(firstErrorMsg, 'Validation Error')
      return
    }

    setFormErrors({})
    const publishForm = { ...form, status: form.status === 'Draft' || !form.status ? 'Registration Open' : form.status }
    setForm(publishForm)
    await submitFormData(publishForm, false)
  }

  const submitFormData = async (payload, isDraft = false) => {
    if (isSaving) {
      console.warn('[Publish Blocked]: Save operation is already in progress.')
      return
    }
    setIsSaving(true)
    setAlert(null)
    try {
      const modeSize = payload.mode === 'solo' ? 1 : payload.mode === 'duo' ? 2 : 4
      const formatString = payload.mode === 'solo' ? 'SOLO (1P)' : payload.mode === 'duo' ? 'DUO (2P)' : 'SQUAD (4P)'

      const resolvedPrize = calculateFormattedPrize(payload)

      const tournamentPayload = {
        title: String(payload.title || '').trim(),
        game: String(payload.game || 'Free Fire').trim(),
        mode: String(payload.mode || 'squad').trim(),
        format: formatString,
        prize_pool: resolvedPrize,
        prizePool: resolvedPrize,
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
        description: String(payload.description || 'Official high-stakes tournament.').trim(),
      }

      console.log("STEP 4 : Tournament payload", tournamentPayload)

      if (editingId) {
        if (editTournament) await editTournament(editingId, tournamentPayload)
        telemetry.logAdminAction('update_tournament', editingId, { title: payload.title, status: payload.status })
        if (isDraft) {
          showSuccess(`Draft for "${payload.title}" updated successfully!`, 'Draft Updated')
        } else {
          showSuccess(`Tournament "${payload.title}" updated successfully!`, 'Tournament Updated')
        }
      } else {
        if (createTournament) await createTournament(tournamentPayload)
        telemetry.logAdminAction('create_tournament', payload.title, { status: payload.status })
        if (isDraft) {
          showSuccess(`Draft for "${payload.title}" saved to database!`, 'Draft Saved')
        } else {
          showSuccess(`Tournament "${payload.title}" published! Registration is now OPEN.`, 'Tournament Published')
        }
      }

      setShowModal(false)
    } catch (err) {
      console.error("Supabase Error:", {
        code: err?.code,
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        status: err?.status
      })
      telemetry.logError(err, { action: 'submit_tournament', editingId })
      const exactErrorMsg = err?.message || err?.details || (typeof err === 'string' ? err : 'Failed to insert tournament into database.')
      setAlert({ type: 'error', message: exactErrorMsg })
      showError(exactErrorMsg, exactErrorMsg)
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
      const dupPrize = formatTournamentPrize(t)
      const dupPayload = {
        title: `${t.title} (Copy)`,
        game: t.game,
        mode: t.mode || 'squad',
        team_size: t.team_size || 4,
        format: t.format || 'SQUAD (4P)',
        prize_pool: dupPrize,
        prizePool: dupPrize,
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

  // Filter tournaments based on search and dropdown filters
  const filteredTournaments = tournaments.filter((t) => {
    const matchesSearch =
      !searchQuery.trim() ||
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
          <div className="border-b border-[#3a494b]/50 pb-2">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-tight font-headline flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#00f2ff]" />
              <span>General Information</span>
            </h3>
            <p className="text-xs text-[#8e9dae]">Provide the basic details of the tournament.</p>
          </div>

          {/* 1. TOURNAMENT NAME (REQUIRED) */}
          <FormInput
            label="Tournament Name"
            name="title"
            value={form.title}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, title: e.target.value }))
              if (formErrors.title) setFormErrors((prev) => ({ ...prev, title: null }))
            }}
            placeholder="e.g. Free Fire Friday Scrim #12 or BGMI Weekend Championship"
            required
            error={formErrors.title}
            icon={Trophy}
          />

          {/* 2. GAME (REQUIRED) & 3. MATCH MODE (REQUIRED) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect
              label="Game"
              name="game"
              value={form.game}
              onChange={(e) => setForm((prev) => ({ ...prev, game: e.target.value }))}
              options={SUPPORTED_GAMES}
              required
              icon={Gamepad2}
            />

            <FormModeSelector
              label="Match Mode"
              value={form.mode}
              onChange={(newMode) => setForm((prev) => ({ ...prev, mode: newMode }))}
              options={[
                { key: 'solo', label: 'Solo (1 Player)', size: 1 },
                { key: 'duo', label: 'Duo (2 Players)', size: 2 },
                { key: 'squad', label: 'Squad (4 Players)', size: 4 },
              ]}
              required
            />
          </div>

          {/* 4. LIVE PREVIEW CARD */}
          <div className="p-4 bg-[#07090c] border border-[#00f2ff]/30 rounded-xl space-y-2.5 shadow-inner">
            <div className="flex items-center justify-between border-b border-[#3a494b]/50 pb-2">
              <span className="font-label-caps text-[10px] font-bold text-[#00f2ff] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00f2ff]" />
                <span>Live Configuration Preview</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 uppercase font-mono">
                Read-Only
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-[#8e9dae] uppercase font-bold tracking-wider block mb-0.5">
                  Selected Game
                </span>
                <p className="font-bold text-white font-headline uppercase">{form.game || 'Free Fire MAX'}</p>
              </div>
              <div>
                <span className="text-[10px] text-[#8e9dae] uppercase font-bold tracking-wider block mb-0.5">
                  Match Mode
                </span>
                <p className="font-bold text-white font-headline uppercase">
                  {form.mode === 'solo' ? 'Solo Battle Royale' : form.mode === 'duo' ? 'Duo Battle Royale' : 'Squad Battle Royale'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-[#8e9dae] uppercase font-bold tracking-wider block mb-0.5">
                  Required Players
                </span>
                <p className="font-mono font-extrabold text-[#00ff9d] text-sm">
                  {form.mode === 'solo' ? '1' : form.mode === 'duo' ? '2' : '4'}
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Match Configuration & Schedule',
      shortTitle: 'Match & Schedule',
      content: (
        <div className="space-y-5">
          <div className="border-b border-[#3a494b]/50 pb-2">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-tight font-headline flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-[#00f2ff]" />
              <span>Match Configuration & Schedule</span>
            </h3>
            <p className="text-xs text-[#8e9dae]">Configure map, rules, and match timeline execution.</p>
          </div>

          {/* SECTION 1: MATCH CONFIGURATION */}
          <div className="p-4 bg-[#07090c] border border-[#00f2ff]/30 rounded-xl space-y-4 shadow-inner">
            <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-2">
              <span className="text-xs font-bold text-[#00f2ff] uppercase flex items-center gap-2 font-headline">
                <Target className="w-4 h-4 text-[#00f2ff]" />
                <span>Section 1: Match Configuration</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 uppercase font-mono">
                {form.game?.startsWith('Free Fire') ? 'Free Fire Preset' : 'BGMI Preset'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Map (Required - Game Specific) */}
              <FormSelect
                label="Map"
                name="map"
                value={form.game?.startsWith('Free Fire') ? (form.ffMap || 'Bermuda') : (form.bgmiMap || 'Erangel')}
                onChange={(e) => {
                  const mapVal = e.target.value
                  if (form.game?.startsWith('Free Fire')) {
                    setForm((prev) => ({ ...prev, ffMap: mapVal }))
                  } else {
                    setForm((prev) => ({ ...prev, bgmiMap: mapVal }))
                  }
                }}
                options={
                  form.game?.startsWith('Free Fire')
                    ? ['Bermuda', 'Kalahari', 'Purgatory', 'Alpine', 'Nexterra', 'Random']
                    : ['Erangel', 'Miramar', 'Sanhok', 'Vikendi', 'Livik', 'Nusa', 'Random']
                }
                required
                icon={MapPin}
              />

              {/* 2. Match Type */}
              <FormSelect
                label="Match Type"
                name="matchType"
                value={form.matchType || 'Battle Royale'}
                onChange={(e) => setForm((prev) => ({ ...prev, matchType: e.target.value }))}
                options={
                  form.game?.startsWith('Free Fire')
                    ? ['Battle Royale', 'Clash Squad (Free Fire)', 'Classic', 'Custom']
                    : ['Battle Royale', 'Classic', 'Custom']
                }
                icon={Flame}
              />

              {/* 3. Gun Attributes */}
              <FormSelect
                label="Gun Attributes"
                name="gunAttributes"
                value={form.ffGunAttributes || form.gunAttributes || 'Disabled'}
                onChange={(e) => setForm((prev) => ({ ...prev, ffGunAttributes: e.target.value, gunAttributes: e.target.value }))}
                options={['Enabled', 'Disabled', 'Default']}
                icon={Crosshair}
              />

              {/* 4. Character Skills */}
              <FormSelect
                label="Character Skills"
                name="characterSkills"
                value={form.ffCharacterSkills || form.characterSkills || 'Enabled'}
                onChange={(e) => setForm((prev) => ({ ...prev, ffCharacterSkills: e.target.value, characterSkills: e.target.value }))}
                options={['Enabled', 'Disabled', 'Default']}
                icon={Zap}
              />
            </div>
          </div>

          {/* SECTION 2: TOURNAMENT SCHEDULE */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-headline">
              Section 2: Tournament Schedule
            </h4>
            <TournamentScheduleForm
              startDate={form.startDate}
              startTime={form.startTime}
              registrationStart={form.registrationStart}
              registrationEnd={form.registrationEnd}
              checkInStart={form.checkInStart}
              checkInEnd={form.checkInEnd || form.checkInTime}
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
          </div>

          {/* SECTION 3: RULEBOOK (READ-ONLY) */}
          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-headline">
              Section 3: Official Rulebook
            </h4>
            <OfficialRulebook rules={OFFICIAL_MJ_RULES} />
          </div>
        </div>
      ),
    },
    {
      title: 'Registration, Payment & Prize',
      shortTitle: 'Registration & Prize',
      content: (
        <EntryPrizeSystem
          entryFee={form.entryFeeNum || form.entryFee}
          maxTeams={form.maxTeams}
          game={form.game}
          mode={form.mode}
          registrationApproval={form.registrationApproval}
          allowWaitlist={form.allowWaitlist}
          maxWaitlistSize={form.maxWaitlistSize}
          paymentEnabled={form.paymentEnabled}
          paymentGateway={form.paymentGateway}
          prizeType={form.prizeType}
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
  ]

  const activeTournament = tournaments.find((t) => t.id === selectedTournamentId)

  return (
    <div className="space-y-6 antialiased">
      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* Admin V2 Tournaments Information Architecture Navigation */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-3 shadow-xl flex items-center gap-2 overflow-x-auto text-xs font-mono font-bold">
        {[
          { id: 'ALL_TOURNAMENTS', label: 'ALL TOURNAMENTS' },
          { id: 'CREATE_TOURNAMENT', label: '+ CREATE TOURNAMENT' },
          { id: 'REGISTRATION_QUEUE', label: 'REGISTRATION QUEUE' },
          { id: 'MATCH_OPERATIONS', label: 'MATCH OPERATIONS' },
          { id: 'RESULTS', label: 'RESULTS PIPELINE' },
          { id: 'HISTORY', label: 'HISTORY & ARCHIVE' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'CREATE_TOURNAMENT') {
                handleOpenCreateModal()
              } else {
                setSelectedTournamentId(null)
                setActiveOpsTab(tab.id)
              }
            }}
            className={`px-3.5 py-2 rounded-lg transition-all whitespace-nowrap ${
              activeOpsTab === tab.id && !selectedTournamentId
                ? 'bg-[#00f2ff] text-black font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.3)]'
                : 'bg-[#07090c] text-[#8e9dae] hover:text-white border border-[#3a494b]/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* VIEW SWITCHING */}
      {selectedTournamentId ? (
        <TournamentOperationsWorkspace
          tournament={activeTournament}
          onBackToRoster={() => setSelectedTournamentId(null)}
          updateRegistrationStatus={updateTournamentStatus}
        />
      ) : (
        <>
          {activeOpsTab === 'ALL_TOURNAMENTS' && (
            <AllTournamentsView
              tournaments={tournaments}
              onSelectTournament={(id) => setSelectedTournamentId(id)}
              onOpenCreateWizard={handleOpenCreateModal}
              onEditTournament={handleOpenEditModal}
              onDuplicateTournament={handleDuplicate}
              onDeleteTournament={(t) => handleDelete(t.id, t.title)}
              onAdvanceStage={handleAdvanceStage}
              actionId={actionId}
            />
          )}

          {activeOpsTab === 'REGISTRATION_QUEUE' && (
            <RegistrationQueueView
              tournaments={tournaments}
              updateRegistrationStatus={updateTournamentStatus}
            />
          )}

          {activeOpsTab === 'MATCH_OPERATIONS' && (
            <MatchControlView
              tournaments={tournaments}
              updateTournamentScores={() => {}}
            />
          )}

          {activeOpsTab === 'RESULTS' && (
            <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-6 text-center space-y-3 font-mono">
              <CheckCircle2 className="w-8 h-8 text-[#00ff9d] mx-auto" />
              <h3 className="text-sm font-bold text-white uppercase">RESULT VERIFICATION PIPELINE</h3>
              <p className="text-xs text-[#8e9dae] max-w-md mx-auto">
                Official match scorecard submission and automated OCR extraction workflow will be integrated in Phase 3.
              </p>
            </div>
          )}

          {activeOpsTab === 'HISTORY' && (
            <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-6 font-mono space-y-3">
              <h3 className="text-sm font-bold text-white uppercase border-b border-[#3a494b]/60 pb-2">
                COMPLETED TOURNAMENT ARCHIVE
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tournaments.filter(t => t.status === 'Completed' || t.status === 'Prize Distributed').length === 0 ? (
                  <p className="text-xs text-[#8e9dae]">No completed tournaments found in historical logs.</p>
                ) : (
                  tournaments.filter(t => t.status === 'Completed' || t.status === 'Prize Distributed').map((t) => (
                    <div key={t.id} className="p-3 bg-[#07090c] border border-[#3a494b] rounded-lg text-xs space-y-1">
                      <span className="font-bold text-white block">{t.title}</span>
                      <span className="text-[#8e9dae]">{t.game} • Prize: {t.prizePool || t.prize_pool}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* REUSABLE STEP WIZARD MODAL DIALOG */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#151a21] border border-[#3a494b] rounded-2xl max-w-3xl w-full p-6 sm:p-8 space-y-5 shadow-[0_0_50px_rgba(0,242,255,0.15)] relative max-h-[92vh] overflow-y-auto font-mono">
            
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
              <p className="text-xs text-[#8e9dae]">Configure general info, schedule, and registration/prizes in 3 guided steps.</p>
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
