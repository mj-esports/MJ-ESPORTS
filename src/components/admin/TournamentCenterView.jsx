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
  ChevronRight,
  Swords,
  Award,
  History,
  ClipboardList
} from 'lucide-react'
import { SUPPORTED_GAMES } from '../../data/mockData'
import { getTournamentImage } from '../../utils/tournamentImageUtils'
import { calculateFormattedPrize, formatTournamentPrize } from '../../utils/tournamentPrizeUtils'
import { getDefaultGameCapacity } from '../../utils/tournamentUtils'
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
  const [activeOpsTab, setActiveOpsTab] = useState('ALL_TOURNAMENTS') // 'ALL_TOURNAMENTS' | 'REGISTRATION_QUEUE' | 'MATCH_OPERATIONS' | 'RESULTS' | 'HISTORY'
  const [selectedTournamentId, setSelectedTournamentId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [actionId, setActionId] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [alert, setAlert] = useState(null)

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
    maxTeams: 12,
    startDate: '',
    startTime: '06:00 PM IST',
    registrationStart: 'Immediate',
    registrationEnd: '1 Hour Prior to Kickoff',
    checkInTime: '05:15 PM IST',
    roomPublishTime: '05:45 PM IST',
    description: 'Official high-stakes esports tournament.',
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

  const handleOpenCreateModal = () => {
    setFormErrors({})
    const defaultCap = getDefaultGameCapacity(defaultFormState.game, defaultFormState.mode)
    setForm({
      ...defaultFormState,
      maxTeams: defaultCap.maxTeams,
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
      game: t.game || 'Free Fire MAX',
      mode: resolvedMode,
      prizePool: formatTournamentPrize(t),
      entryFee: t.entryFee || t.entry_fee || 'Free',
      maxTeams: t.maxTeams || 12,
      startDate: t.startDate || t.start_date || new Date().toISOString().split('T')[0],
      startTime: t.startTime || t.start_time || '06:00 PM IST',
      registrationStart: t.registrationStart || 'Immediate',
      registrationEnd: t.registrationEnd || '1 Hour Prior to Kickoff',
      checkInTime: t.checkInTime || '05:15 PM IST',
      roomPublishTime: t.roomPublishTime || '05:45 PM IST',
      description: t.description || 'Official high-stakes esports tournament.',
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
      const isPaymentOn = Boolean(form.paymentEnabled)
      const entryFeeNum = isPaymentOn
        ? (typeof form.entryFeeNum === 'number' ? form.entryFeeNum : (parseFloat(String(form.entryFee || 0).replace(/[^0-9.]/g, '')) || 0))
        : 0
      const slotsNum = Number(form.maxTeams || 0)

      if (isPaymentOn && (isNaN(entryFeeNum) || entryFeeNum < 0)) {
        errors.entryFee = 'Entry Fee must be greater than or equal to 0.'
      }
      if (!slotsNum || slotsNum <= 0) {
        errors.maxTeams = 'Total Team / Squad Slots must be greater than 0.'
      }

      if (isPaymentOn) {
        if (!form.paymentGateway || !String(form.paymentGateway).trim()) {
          errors.paymentGateway = 'Payment Gateway is required when Payment Status is ON.'
        }
      }

      const pType = form.prizeType || 'placement'
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

    for (let step = 0; step <= 2; step++) {
      const errs = getStepValidationErrors(step)
      if (Object.keys(errs).length > 0) {
        setFormErrors(errs)
        setCurrentStep(step)
        const firstErrorMsg = Object.values(errs)[0] || `Step ${step + 1} validation failed.`
        showError(firstErrorMsg, 'Validation Error')
        return
      }
    }

    setFormErrors({})
    const publishForm = { ...form, status: form.status === 'Draft' || !form.status ? 'Registration Open' : form.status }
    setForm(publishForm)
    await submitFormData(publishForm, false)
  }

  const submitFormData = async (payload, isDraft = false) => {
    if (isSaving) return
    setIsSaving(true)
    setAlert(null)
    try {
      const formatString = payload.mode === 'solo' ? 'SOLO (1P)' : payload.mode === 'duo' ? 'DUO (2P)' : 'SQUAD (4P)'
      const resolvedPrize = calculateFormattedPrize(payload)

      const tournamentPayload = {
        title: String(payload.title || '').trim(),
        game: String(payload.game || 'Free Fire MAX').trim(),
        mode: String(payload.mode || 'squad').trim(),
        format: formatString,
        prize_pool: resolvedPrize,
        prizePool: resolvedPrize,
        entry_fee: String(payload.entryFee || 'Free').trim(),
        entryFee: String(payload.entryFee || 'Free').trim(),
        max_teams: Number(payload.maxTeams || 12),
        maxTeams: Number(payload.maxTeams || 12),
        start_date: String(payload.startDate || '').trim(),
        startDate: String(payload.startDate || '').trim(),
        start_time: String(payload.startTime || '').trim(),
        startTime: String(payload.startTime || '').trim(),
        registrationStart: payload.registrationStart || null,
        registrationEnd: payload.registrationEnd || null,
        status: String(payload.status || (isDraft ? 'Draft' : 'Registration Open')).trim(),
        rules: Array.isArray(payload.rules) ? payload.rules : OFFICIAL_MJ_RULES,
        description: String(payload.description || 'Official high-stakes esports tournament.').trim(),
      }

      if (editingId) {
        if (editTournament) await editTournament(editingId, tournamentPayload)
        telemetry.logAdminAction('update_tournament', editingId, { title: payload.title, status: payload.status })
        showSuccess(`Tournament "${payload.title}" updated successfully!`, 'Tournament Updated')
      } else {
        if (createTournament) await createTournament(tournamentPayload)
        telemetry.logAdminAction('create_tournament', payload.title, { status: payload.status })
        showSuccess(
          isDraft ? `Draft for "${payload.title}" saved.` : `Tournament "${payload.title}" published! Registration is now OPEN.`,
          'Tournament Published'
        )
      }

      setShowModal(false)
    } catch (err) {
      telemetry.logError(err, { action: 'submit_tournament', editingId })
      const exactErrorMsg = err?.message || err?.details || (typeof err === 'string' ? err : 'Failed to save tournament.')
      setAlert({ type: 'error', message: exactErrorMsg })
      showError(exactErrorMsg, 'Tournament Save Error')
    } finally {
      setIsSaving(false)
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
        max_teams: t.max_teams || t.maxTeams || 12,
        maxTeams: t.maxTeams || t.max_teams || 12,
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

  // Define steps for Step Wizard
  const wizardSteps = [
    {
      title: 'General Information',
      shortTitle: 'General',
      content: (
        <div className="space-y-4">
          <div className="border-b border-[#27272a] pb-2">
            <h3 className="text-sm font-extrabold text-white uppercase font-headline flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#00f2ff]" />
              <span>General Information</span>
            </h3>
            <p className="text-xs text-[#849495] font-body">Provide the basic details and game mode.</p>
          </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect
              label="Game"
              name="game"
              value={form.game}
              onChange={(e) => {
                const nextGame = e.target.value
                const nextCap = getDefaultGameCapacity(nextGame, form.mode)
                setForm((prev) => ({
                  ...prev,
                  game: nextGame,
                  maxTeams: editingId ? prev.maxTeams : nextCap.maxTeams,
                }))
              }}
              options={SUPPORTED_GAMES}
              required
              icon={Gamepad2}
            />

            <FormModeSelector
              label="Match Mode"
              value={form.mode}
              onChange={(newMode) => {
                const nextCap = getDefaultGameCapacity(form.game, newMode)
                setForm((prev) => ({
                  ...prev,
                  mode: newMode,
                  maxTeams: editingId ? prev.maxTeams : nextCap.maxTeams,
                }))
              }}
              options={[
                { key: 'solo', label: 'Solo (1 Player)', size: 1 },
                { key: 'duo', label: 'Duo (2 Players)', size: 2 },
                { key: 'squad', label: 'Squad (4 Players)', size: 4 },
              ]}
              required
            />
          </div>

          {/* Live Preview Card */}
          {(() => {
            const previewCap = getDefaultGameCapacity(form.game, form.mode)
            const currentTeams = Number(form.maxTeams || previewCap.maxTeams)
            const currentPlayers = currentTeams * previewCap.teamSize

            return (
              <div className="p-3.5 bg-[#1c1b1c] border border-[#00f2ff]/30 rounded space-y-2">
                <div className="flex items-center justify-between border-b border-[#27272a] pb-1.5">
                  <span className="text-[10px] font-headline font-bold text-[#00f2ff] uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Configuration & Capacity Preview</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[9px] font-headline font-bold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 uppercase">
                    {previewCap.roomCap} Player Room Cap
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-body">
                  <div>
                    <span className="text-[10px] text-[#849495] uppercase block">Selected Game</span>
                    <p className="font-headline font-bold text-white uppercase truncate">{form.game || 'Free Fire MAX'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#849495] uppercase block">Match Mode</span>
                    <p className="font-headline font-bold text-white uppercase">
                      {form.mode === 'solo' ? 'Solo (1P)' : form.mode === 'duo' ? 'Duo (2P)' : 'Squad (4P)'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#849495] uppercase block">Max Squads</span>
                    <p className="font-headline font-bold text-[#00f2ff] text-sm">{currentTeams} {previewCap.teamUnit}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#849495] uppercase block">Player Cap</span>
                    <p className="font-headline font-bold text-[#10b981] text-sm">{currentPlayers} / {previewCap.roomCap} Players</p>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      ),
    },
    {
      title: 'Match Configuration & Schedule',
      shortTitle: 'Match & Schedule',
      content: (
        <div className="space-y-4">
          <div className="border-b border-[#27272a] pb-2">
            <h3 className="text-sm font-extrabold text-white uppercase font-headline flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-[#00f2ff]" />
              <span>Match Configuration & Schedule</span>
            </h3>
            <p className="text-xs text-[#849495] font-body">Configure map, rules, and match timeline execution.</p>
          </div>

          <div className="p-3.5 bg-[#1c1b1c] border border-[#27272a] rounded space-y-3">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
              <span className="text-xs font-headline font-bold text-[#00f2ff] uppercase flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                <span>Match Configuration Preset</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-headline font-bold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 uppercase">
                {form.game?.startsWith('Free Fire') ? 'Free Fire Preset' : 'BGMI Preset'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

              <FormSelect
                label="Gun Attributes"
                name="gunAttributes"
                value={form.ffGunAttributes || form.gunAttributes || 'Disabled'}
                onChange={(e) => setForm((prev) => ({ ...prev, ffGunAttributes: e.target.value, gunAttributes: e.target.value }))}
                options={['Enabled', 'Disabled', 'Default']}
                icon={Crosshair}
              />

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

          <div className="space-y-2">
            <h4 className="text-xs font-headline font-bold text-white uppercase">Tournament Schedule</h4>
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
                setForm((prev) => ({ ...prev, ...sched }))
                if (Object.keys(formErrors).length > 0) setFormErrors({})
              }}
            />
          </div>

          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-headline font-bold text-white uppercase">Official Rulebook</h4>
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
            setForm((prev) => ({ ...prev, ...financialData }))
            if (Object.keys(formErrors).length > 0) setFormErrors({})
          }}
        />
      ),
    },
  ]

  const activeTournament = tournaments.find((t) => t.id === selectedTournamentId)

  return (
    <div className="space-y-5 font-body antialiased">
      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* 1. TOURNAMENTS CONSOLE PAGE HEADER */}
      <div className="bg-[#141416] border border-[#27272a] rounded p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-headline font-bold text-[#00f2ff] uppercase tracking-wider mb-1.5">
            <Trophy className="w-4 h-4" />
            <span>Tournaments Console</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">
            Arena Operations
          </h1>
          <p className="text-xs sm:text-sm text-[#849495] font-body mt-1 max-w-2xl">
            Operational controls & real-time arena management
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-[#00f2ff] hover:bg-[#00f2ff]/90 text-[#00363a] font-headline font-extrabold rounded text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,242,255,0.25)] shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#00363a] stroke-[3]" />
          <span>+ CREATE TOURNAMENT</span>
        </button>
      </div>

      {/* 2. UNIFIED PRIMARY NAVIGATION BAR */}
      <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-headline font-bold border-b border-[#27272a] pb-2">
        {[
          { id: 'ALL_TOURNAMENTS', label: 'ALL TOURNAMENTS', icon: Trophy },
          { id: 'REGISTRATION_QUEUE', label: 'REGISTRATION QUEUE', icon: ClipboardList },
          { id: 'MATCH_OPERATIONS', label: 'MATCH OPERATIONS', icon: Swords },
          { id: 'RESULTS', label: 'RESULTS', icon: Award },
          { id: 'HISTORY', label: 'HISTORY', icon: History },
        ].map((tab) => {
          const Icon = tab.icon
          const active = activeOpsTab === tab.id && !selectedTournamentId

          return (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedTournamentId(null)
                setActiveOpsTab(tab.id)
              }}
              className={`px-3.5 py-2 rounded transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                active
                  ? 'bg-[#00f2ff] text-[#00363a] font-extrabold shadow-sm'
                  : 'bg-[#141416] text-[#849495] hover:text-white border border-[#27272a]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* 3. VIEW SWITCHING CONTAINER */}
      {selectedTournamentId ? (
        <TournamentOperationsWorkspace
          tournament={activeTournament}
          onBackToRoster={() => setSelectedTournamentId(null)}
          onEditTournament={handleOpenEditModal}
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
            <div className="bg-[#141416] border border-[#27272a] rounded p-8 text-center space-y-3 font-body">
              <Award className="w-10 h-10 text-[#fed83a] mx-auto opacity-70" />
              <h3 className="text-sm font-headline font-extrabold text-white uppercase tracking-wider">
                Result Verification Pipeline
              </h3>
              <p className="text-xs text-[#849495] max-w-md mx-auto">
                Official match scorecard submission and automated extraction workflow will be integrated in Phase 3.
              </p>
            </div>
          )}

          {activeOpsTab === 'HISTORY' && (
            <div className="bg-[#141416] border border-[#27272a] rounded p-6 space-y-4">
              <h3 className="text-sm font-headline font-extrabold text-white uppercase tracking-wider border-b border-[#27272a] pb-3">
                Completed Tournament Archive
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tournaments.filter(t => t.status === 'Completed' || t.status === 'Prize Distributed').length === 0 ? (
                  <p className="text-xs text-[#849495] font-body py-4">No completed tournaments found in historical logs.</p>
                ) : (
                  tournaments.filter(t => t.status === 'Completed' || t.status === 'Prize Distributed').map((t) => (
                    <div key={t.id} className="p-3.5 bg-[#1c1b1c] border border-[#27272a] rounded text-xs font-body space-y-1">
                      <span className="font-headline font-bold text-white block">{t.title}</span>
                      <span className="text-[#849495]">{t.game} &bull; Prize: {formatTournamentPrize(t)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* 4. STEP WIZARD MODAL DIALOG */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#141416] border border-[#27272a] rounded max-w-3xl w-full p-6 sm:p-8 space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto font-body">
            
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 p-2 rounded bg-[#1c1b1c] border border-[#27272a] text-[#849495] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 border-b border-[#27272a] pb-3">
              <h3 className="font-headline text-lg sm:text-xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#00f2ff]" />
                <span>{editingId ? 'Edit Tournament Configuration' : 'Tournament Creation Wizard'}</span>
              </h3>
              <p className="text-xs text-[#849495]">Configure general info, schedule, and registration/prizes in 3 guided steps.</p>
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
