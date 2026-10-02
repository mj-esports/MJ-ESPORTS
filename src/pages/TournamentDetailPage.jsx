import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Trophy,
  Calendar,
  Clock,
  Radio,
  ArrowLeft,
  Gamepad2,
  CheckCircle2,
  Key,
  Copy,
  Lock,
  Award,
  ChevronDown,
  ChevronUp,
  Building2,
  HelpCircle,
  Users,
  MapPin,
  Share2,
  Bookmark,
  Eye,
  EyeOff,
  Ban,
  AlertTriangle,
  ShieldCheck,
  Flag,
} from 'lucide-react'
import { useTournaments } from '../contexts/TournamentContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { DetailSkeleton } from '../components/common/SkeletonLoader'
import SlotBookingModal from '../components/tournament/SlotBookingModal'
import PointsTable from '../components/bracket/PointsTable'
import BracketViewer from '../components/bracket/BracketViewer'
import { getTournamentImage } from '../utils/tournamentImageUtils'
import { formatTournamentPrize } from '../utils/tournamentPrizeUtils'
import {
  calculateFilledPlayerSlots,
  calculateTotalPlayerSlots,
  calculateSlotFillPercentage,
  getTournamentMode,
} from '../utils/tournamentUtils'
import TournamentScheduleForm from '../components/common/TournamentScheduleForm'
import EntryPrizeSystem from '../components/common/EntryPrizeSystem'
import OfficialRulebook, { OFFICIAL_MJ_RULES } from '../components/common/OfficialRulebook'
import {
  checkInParticipant,
  getParticipantCheckin,
  subscribeToTournamentCheckins,
  reportMatchIncident,
} from '../services/matchCheckinService'

export default function TournamentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getTournamentById, isUserRegistered, getUserRegistration, fetchTournaments, getRoomCredentials, loading } = useTournaments()
  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth()
  const { showSuccess, showError } = useToast()

  const tournament = getTournamentById(id)

  const [activeTab, setActiveTab] = useState('overview')
  const [showSlotModal, setShowSlotModal] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState(0)
  const [secureRoomDetails, setSecureRoomDetails] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [roomLoading, setRoomLoading] = useState(false)
  const [roomErrorMessage, setRoomErrorMessage] = useState(null)

  // Asynchronous authoritative database registration state
  const [userRegistration, setUserRegistration] = useState(null)
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true)

  // Match Check-in & Incident State
  const [participantCheckin, setParticipantCheckin] = useState(null)
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [checkinInputUid, setCheckinInputUid] = useState('')
  const [checkinSubmitting, setCheckinSubmitting] = useState(false)
  const [checkinError, setCheckinError] = useState(null)

  // Incident reporting modal
  const [showIncidentModal, setShowIncidentModal] = useState(false)
  const [incidentType, setIncidentType] = useState('ROOM_ISSUE')
  const [incidentDescription, setIncidentDescription] = useState('')
  const [incidentSubmitting, setIncidentSubmitting] = useState(false)

  // Authoritative registration fetch directly from public.tournament_registrations (RLS-guaranteed)
  const fetchRegistrationStatus = useCallback(async () => {
    if (!id || !user?.id) {
      setUserRegistration(null)
      setIsCheckingRegistration(false)
      return
    }
    setIsCheckingRegistration(true)
    try {
      const reg = await getUserRegistration(id, user.id)
      setUserRegistration(reg)
    } catch (err) {
      console.warn('[Fetch Registration Status Error]:', err)
    } finally {
      setIsCheckingRegistration(false)
    }
  }, [id, user?.id, getUserRegistration])

  useEffect(() => {
    fetchRegistrationStatus()
  }, [fetchRegistrationStatus])

  // Context-cached registration fallback for instant UI response
  const isCachedRegistered = useMemo(() => {
    if (!user) return false
    return isUserRegistered(id, user)
  }, [isUserRegistered, id, user])

  const isAlreadyRegistered = Boolean(userRegistration || isCachedRegistered)

  useEffect(() => {
    let isMounted = true
    if (tournament && tournament.roomStatus === 'Published' && isAuthenticated && (isAlreadyRegistered || isAdmin) && getRoomCredentials) {
      setRoomLoading(true)
      setRoomErrorMessage(null)
      getRoomCredentials(tournament.id).then((res) => {
        if (!isMounted) return
        setRoomLoading(false)
        if (res && res.success && (res.roomId || res.room_id)) {
          setSecureRoomDetails({
            roomId: res.roomId || res.room_id,
            roomPassword: res.roomPassword || res.room_password,
          })
        } else {
          setSecureRoomDetails(null)
          if (res?.message) {
            setRoomErrorMessage(res.message)
          }
        }
      })
    } else {
      setSecureRoomDetails(null)
      setRoomLoading(false)
      setRoomErrorMessage(null)
    }
    return () => { isMounted = false }
  }, [tournament, isAlreadyRegistered, isAuthenticated, isAdmin, getRoomCredentials])

  // Fetch authoritative participant check-in status
  const fetchCheckinStatus = useCallback(async () => {
    if (!id || !user?.id) {
      setParticipantCheckin(null)
      return
    }
    setCheckinLoading(true)
    try {
      const chk = await getParticipantCheckin(id, user.id)
      setParticipantCheckin(chk)
    } catch (err) {
      console.warn('[Fetch Checkin Status Error]:', err)
    } finally {
      setCheckinLoading(false)
    }
  }, [id, user?.id])

  useEffect(() => {
    fetchCheckinStatus()
    const unsubscribe = subscribeToTournamentCheckins(id, () => {
      fetchCheckinStatus()
    })
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [id, fetchCheckinStatus])

  // Pre-fill check-in UID with registered Free Fire UID if available
  useEffect(() => {
    if (!checkinInputUid) {
      const registeredUid = userRegistration?.captain_uid || userRegistration?.captain_game_uid || user?.user_metadata?.free_fire_uid || ''
      if (registeredUid) {
        setCheckinInputUid(registeredUid)
      }
    }
  }, [userRegistration, user, checkinInputUid])

  const handleCheckinSubmit = async (e) => {
    e.preventDefault()
    if (!checkinInputUid.trim()) {
      setCheckinError('Please enter your in-game Free Fire UID.')
      return
    }
    setCheckinSubmitting(true)
    setCheckinError(null)
    try {
      const res = await checkInParticipant({
        tournamentId: id,
        checkinUid: checkinInputUid.trim(),
      })
      if (res.success) {
        showSuccess(res.message || 'Check-in completed successfully!', 'Check-In Success')
        await fetchCheckinStatus()
      } else {
        setCheckinError(res.message || 'Check-in failed. Please verify with administrators.')
      }
    } catch (err) {
      setCheckinError(err.message || 'An error occurred during check-in.')
    } finally {
      setCheckinSubmitting(false)
    }
  }

  const handleReportIncident = async (e) => {
    e.preventDefault()
    if (!incidentDescription.trim()) return
    setIncidentSubmitting(true)
    try {
      const res = await reportMatchIncident({
        tournamentId: id,
        incidentType,
        description: incidentDescription.trim(),
      })
      if (res.success) {
        showSuccess('Incident reported to tournament administrators.', 'Report Logged')
        setShowIncidentModal(false)
        setIncidentDescription('')
      } else {
        showError(res.message || 'Failed to submit incident report.')
      }
    } catch (err) {
      showError(err.message || 'Failed to submit incident report.')
    } finally {
      setIncidentSubmitting(false)
    }
  }

  const handleCopy = async (text, label) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      showSuccess(`${label} copied to clipboard!`, 'Copied')
    } catch (err) {
      showSuccess(`${label}: ${text}`, 'Copy Info')
    }
  }

  const handleCopyCredentials = async (tournamentTitle, roomId, password) => {
    if (!roomId) return
    const formattedText = `Tournament: ${tournamentTitle || 'Tournament'}\nRoom ID: ${roomId}\nPassword: ${password || ''}`
    try {
      await navigator.clipboard.writeText(formattedText)
      showSuccess('Room credentials copied to clipboard!', 'Credentials Copied')
    } catch (err) {
      showSuccess(`Credentials:\n${formattedText}`, 'Copy Info')
    }
  }

  // Derive prize breakdown values
  const prizeBreakdown = useMemo(() => {
    const rawPrize = parseInt((tournament?.prizePool || tournament?.prize_pool || '0').replace(/[^0-9]/g, ''), 10) || 0
    if (rawPrize === 0) {
      return [
        { place: '1st Champion', amount: '₹0', share: '50%' },
        { place: '2nd Runner-Up', amount: '₹0', share: '30%' },
        { place: '3rd Runner-Up', amount: '₹0', share: '20%' },
      ]
    }

    return [
      { place: '1st Champion', amount: `₹${Math.round(rawPrize * 0.5).toLocaleString()}`, share: '50% Pool' },
      { place: '2nd Runner-Up', amount: `₹${Math.round(rawPrize * 0.3).toLocaleString()}`, share: '30% Pool' },
      { place: '3rd Runner-Up', amount: `₹${Math.round(rawPrize * 0.2).toLocaleString()}`, share: '20% Pool' },
    ]
  }, [tournament])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 bg-[#0a0a0a] min-h-screen">
        <DetailSkeleton />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4 bg-[#111111] p-8 rounded-xl border border-[#333333]">
          <Trophy className="w-12 h-12 text-[#a3a3a3] mx-auto opacity-50" />
          <h2 className="font-headline text-2xl font-bold text-white uppercase">Tournament Not Found</h2>
          <p className="text-xs text-[#a3a3a3]">The tournament ID you requested does not exist or has been removed.</p>
          <Link to="/tournaments" className="inline-flex px-6 py-2.5 bg-[#f97316] text-white font-headline font-bold rounded-lg hover:bg-orange-600 transition-colors">
            Back to Tournaments
          </Link>
        </div>
      </div>
    )
  }

  const modeInfo = getTournamentMode(tournament)
  const filledPlayerSlots = calculateFilledPlayerSlots(tournament)
  const totalPlayerSlots = calculateTotalPlayerSlots(tournament)
  const fillPercentage = calculateSlotFillPercentage(tournament)

  const regTeams = Number(tournament.registeredTeams || tournament.registered_teams || 0)
  const maxTeams = Number(tournament.maxTeams || tournament.max_teams || 12)

  const isFull = regTeams >= maxTeams
  const isCancelled = tournament.status === 'Cancelled'
  const isUserRefunded = userRegistration?.payment_status === 'Refunded' || userRegistration?.status === 'Cancelled'
  const isClosed = tournament.status === 'Registration Closed' || tournament.status === 'Bracket Locked' || tournament.status === 'Completed' || isCancelled
  const isRegistrationDisabled = isFull || isClosed || isAlreadyRegistered || isCancelled

  // Authoritative Fee & Payment Status Derivation
  const entryFeeStr = String(tournament.entryFee || tournament.entry_fee || 'Free').trim()
  const rawFeeDigits = entryFeeStr.replace(/[^0-9.]/g, '')
  const numericEntryFee = entryFeeStr.toLowerCase() === 'free' || !rawFeeDigits ? 0 : parseFloat(rawFeeDigits)
  const isPaidTournament = Boolean(tournament.paymentEnabled || tournament.payment_enabled || numericEntryFee > 0)

  const handleRegisterClick = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setShowSlotModal(true)
  }

  const faqs = [
    {
      q: 'How do I access the Custom Room ID and Password?',
      a: 'Custom Room credentials will be published directly in the "Match Room Credentials" box on this page 15 minutes before the match start time. Only approved squad members will see the password.',
    },
    {
      q: 'How are prize pools distributed to winners?',
      a: 'Prize winnings are verified by tournament refs and transferred directly to the team captain wallet within 24 hours of match conclusion.',
    },
    {
      q: 'What happens if a teammate suffers a network disconnection?',
      a: 'Matches proceed as scheduled. Disconnected players may attempt to reconnect via the in-game lobby if the game server permits re-entry.',
    },
    {
      q: 'How are total points calculated?',
      a: 'Total points follow official esports formula: Total Points = Placement Points + Kill Points (1 Kill = 1 Point).',
    },
  ]

  return (
    <div className="w-full min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-body antialiased pb-24">
      {/* 1. STITCH HERO BANNER HEADER */}
      <div className="relative w-full h-[300px] xs:h-[360px] md:h-[512px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{
            backgroundImage: `url(${getTournamentImage(tournament)})`
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full p-4 sm:p-6 md:p-12 max-w-7xl mx-auto flex flex-col justify-end">
          <div className="inline-flex items-center gap-2 bg-[#111111]/50 backdrop-blur-sm border border-[#333333] px-3 py-1 rounded-full w-max mb-3 sm:mb-4">
            <span className={`w-2 h-2 rounded-full ${isCancelled ? 'bg-red-500' : 'bg-[#22c55e] animate-pulse'}`}></span>
            <span className={`text-[10px] xs:text-xs font-label uppercase tracking-wider ${isCancelled ? 'text-red-400 font-bold' : 'text-[#a3a3a3]'}`}>
              {tournament.status || 'Registration Open'}
            </span>
          </div>
          <h1 className="text-2xl xs:text-3xl md:text-6xl font-headline font-black text-white tracking-tight mb-2 uppercase drop-shadow-lg leading-tight">
            {tournament.title}
          </h1>
          <div className="flex flex-wrap gap-2.5 sm:gap-4 text-xs md:text-base font-label text-[#a3a3a3]">
            <span className="flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4 text-[#f97316]" />
              {tournament.game}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#f97316]" />
              {tournament.format || 'Squad'} Mode
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#f97316]" />
              {tournament.map || 'Bermuda'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA (2 COLS: OVERVIEW & STICKY SIDEBAR) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {isCancelled && (
          <div className="mb-6 p-4 sm:p-5 bg-red-950/40 border border-red-500/40 rounded-xl flex items-start gap-3.5">
            <Ban className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs font-body">
              <h4 className="font-headline font-bold text-sm uppercase text-red-300">
                Tournament Cancelled by Organizer
              </h4>
              <p className="text-[#b9cacb] leading-relaxed">
                This tournament has been cancelled. All registered players who paid entry fees have received a full (100%) refund directly into their authoritative MJ ESPORTS wallet.
              </p>
              {isUserRefunded && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/60 border border-emerald-500/40 rounded text-emerald-400 font-headline font-bold uppercase text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Your entry fee has been credited back to your wallet</span>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: DETAILS & TABS */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Tabs Header */}
            <div className="border-b border-[#333333] overflow-x-auto hide-scrollbar">
              <nav aria-label="Tabs" className="flex gap-6 min-w-max">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'rules', label: 'Rules' },
                  { id: 'schedule', label: 'Schedule' },
                  { id: 'teams', label: 'Registered Squads' },
                  { id: 'faqs', label: 'FAQs' },
                ].map((tab) => (
                  <button
                    key={`detail-tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`font-headline text-lg py-4 px-1 transition-colors ${
                      activeTab === tab.id
                        ? 'font-bold text-[#f97316] border-b-2 border-[#f97316]'
                        : 'font-medium text-[#a3a3a3] hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <section className="space-y-6">
                <h2 className="text-2xl font-headline font-bold text-white">Tournament Overview</h2>
                <p className="text-[#a3a3a3] leading-relaxed font-body">
                  {tournament.description ||
                    'Welcome to the ultimate Free Fire MAX battleground. The Pro Championship brings together the top squads to compete for glory and a massive prize pool. Show your skills, coordinate with your team, and survive to become the champion.'}
                </p>

                {/* Info Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#333333] hover:border-[#333333]/80 transition-colors">
                    <div className="flex items-center gap-3 mb-2 text-[#f97316]">
                      <Award className="w-5 h-5 text-[#f97316]" />
                      <h3 className="font-headline font-semibold text-white">Prize Pool</h3>
                    </div>
                    <p className="text-3xl font-display font-black text-white">{formatTournamentPrize(tournament)}</p>
                    <p className="text-sm text-[#a3a3a3] mt-1">Distributed among top 3 teams</p>
                  </div>

                  <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#333333] hover:border-[#333333]/80 transition-colors">
                    <div className="flex items-center gap-3 mb-2 text-white">
                      <Calendar className="w-5 h-5 text-[#f97316]" />
                      <h3 className="font-headline font-semibold text-white">Date & Time</h3>
                    </div>
                    <p className="text-lg font-medium text-white">{tournament.startDate || 'Nov 25, 2024'}</p>
                    <p className="text-sm text-[#a3a3a3] mt-1">Starts at {tournament.startTime || '6:00 PM IST'}</p>
                  </div>
                </div>

                {/* PRIZE POOL BREAKDOWN & DISTRIBUTION CARD */}
                <div className="mt-6">
                  <EntryPrizeSystem
                    entryFee={entryFeeStr}
                    paymentEnabled={isPaidTournament}
                    maxTeams={tournament.maxTeams || tournament.max_teams || 12}
                    game={tournament.game}
                    mode={tournament.mode}
                    readOnly={true}
                  />
                </div>

                {/* Slot Capacity Progress Bar Box */}
                <div className="bg-[#1a1a1a] p-6 rounded-xl border border-[#333333] mt-6 space-y-3">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <h4 className="font-headline font-semibold text-white">Slot Capacity</h4>
                      <p className="text-sm text-[#a3a3a3]">
                        {filledPlayerSlots} / {totalPlayerSlots} Players registered
                        {modeInfo.mode !== 'Solo' && (
                          <span className="text-xs text-[#737373] ml-1.5 font-mono">
                            ({regTeams} / {maxTeams} {modeInfo.teamUnit})
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-[#f97316] font-bold">{fillPercentage}% Full</span>
                  </div>
                  <div className="w-full bg-[#262626] rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-[#f97316] h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${fillPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* MATCH CHECK-IN & ROSTER VERIFICATION PANEL */}
                <div className="bg-[#111111] border border-[#262626] rounded-xl p-5 sm:p-6 space-y-4 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#262626] pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#00FFFF]" />
                      <h3 className="font-headline text-base sm:text-lg font-bold text-white uppercase tracking-wide">
                        Match Check-In & Slot Assignment
                      </h3>
                    </div>
                    {/* Status Badge */}
                    <span className={`px-3 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider border ${
                      tournament.status === 'Check-in Open'
                        ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/40 animate-pulse'
                        : tournament.status === 'Check-in Closed'
                        ? 'bg-slate-900 text-slate-400 border-slate-700'
                        : 'bg-[#1a1a1a] text-[#a3a3a3] border-[#333333]'
                    }`}>
                      {tournament.status === 'Check-in Open'
                        ? 'Check-In Window Open'
                        : tournament.status === 'Check-in Closed'
                        ? 'Roster Locked'
                        : 'Check-In Scheduled'}
                    </span>
                  </div>

                  {!isAuthenticated ? (
                    <div className="space-y-2">
                      <p className="text-xs text-[#a3a3a3] font-body leading-relaxed">
                        Sign in to verify your registration and check in for this tournament match.
                      </p>
                      <Link
                        to="/login"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#00FFFF]/10 border border-[#00FFFF]/40 text-[#00FFFF] font-label font-extrabold text-xs uppercase hover:bg-[#00FFFF]/20 transition-all"
                      >
                        Sign In
                      </Link>
                    </div>
                  ) : !isAlreadyRegistered && !isAdmin ? (
                    <p className="text-xs text-[#a3a3a3] font-body leading-relaxed">
                      Check-in is reserved for confirmed participants. Register your entry using the sidebar to receive match slot assignments.
                    </p>
                  ) : participantCheckin ? (
                    /* ALREADY CHECKED IN VIEW */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* LOBBY SLOT ASSIGNMENT */}
                        <div className="p-4 bg-[#171717] rounded-lg border border-[#00FFFF]/30 flex flex-col justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#a3a3a3] font-label">
                            Assigned Lobby Slot
                          </span>
                          <p className="text-2xl font-mono font-black text-[#00FFFF] mt-1">
                            {participantCheckin.lobby_slot ? `SLOT #${participantCheckin.lobby_slot}` : 'PENDING'}
                          </p>
                          <span className="text-[10px] text-[#737373] mt-1">
                            Join this exact slot number in the custom room
                          </span>
                        </div>

                        {/* CHECK-IN STATUS */}
                        <div className="p-4 bg-[#171717] rounded-lg border border-[#333333] flex flex-col justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#a3a3a3] font-label">
                            Check-In Status
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="font-mono text-sm font-bold text-white uppercase">
                              {participantCheckin.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#737373] mt-1">
                            {participantCheckin.status === 'LOCKED' ? 'Roster finalized by admin' : 'Check-in recorded'}
                          </span>
                        </div>

                        {/* UID VERIFICATION STATUS */}
                        <div className="p-4 bg-[#171717] rounded-lg border border-[#333333] flex flex-col justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#a3a3a3] font-label">
                            UID Verification
                          </span>
                          <div className="mt-1">
                            {participantCheckin.uid_match_status === 'UID_MATCH' || participantCheckin.uid_match_status === 'ADMIN_VERIFIED' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-emerald-400">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                {participantCheckin.uid_match_status === 'ADMIN_VERIFIED' ? 'ADMIN APPROVED' : 'UID MATCHED'}
                              </span>
                            ) : participantCheckin.uid_match_status === 'UID_MISMATCH' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-amber-400">
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                UID MISMATCH (REVIEW)
                              </span>
                            ) : (
                              <span className="text-xs font-mono font-bold text-red-400">
                                {participantCheckin.uid_match_status}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#737373] mt-1 font-mono">
                            UID: {participantCheckin.checkin_uid}
                          </span>
                        </div>
                      </div>

                      {participantCheckin.uid_match_status === 'UID_MISMATCH' && (
                        <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-lg text-xs text-amber-200 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-bold">UID Discrepancy Flagged:</strong> Your entered check-in UID does not match the registered Free Fire UID ({participantCheckin.registered_uid}). Tournament referee review is underway.
                          </div>
                        </div>
                      )}

                      {/* Action to report incident */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#262626]">
                        <span className="text-xs text-[#a3a3a3]">
                          Experiencing an in-game issue, disconnect, or room conflict?
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowIncidentModal(true)}
                          className="px-3 py-1.5 rounded bg-[#1f1f1f] hover:bg-[#2a2a2a] text-amber-400 border border-amber-500/30 text-xs font-bold font-label uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Flag className="w-3.5 h-3.5" />
                          <span>Report Match Incident</span>
                        </button>
                      </div>
                    </div>
                  ) : tournament.status === 'Check-in Open' ? (
                    /* CHECK-IN OPEN FORM VIEW */
                    <form onSubmit={handleCheckinSubmit} className="space-y-4">
                      <p className="text-xs text-[#a3a3a3] font-body leading-relaxed">
                        The check-in window is open! Submit your Free Fire MAX in-game character UID to confirm readiness and automatically receive your official custom room lobby slot.
                      </p>

                      <div className="p-3.5 bg-[#171717] rounded-lg border border-[#262626] space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#a3a3a3] font-label uppercase font-bold">Registered UID:</span>
                          <span className="font-mono font-bold text-white">
                            {userRegistration?.captain_uid || 'Not recorded'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#f5f5f5] font-label uppercase tracking-wider block">
                          Free Fire In-Game UID *
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={checkinInputUid}
                            onChange={(e) => setCheckinInputUid(e.target.value)}
                            placeholder="Enter 8-10 digit Free Fire UID"
                            className="flex-1 px-4 py-2.5 bg-[#171717] border border-[#333333] focus:border-[#00FFFF] rounded-lg text-white font-mono text-sm placeholder:text-[#525252] outline-none transition-colors"
                            required
                          />
                          <button
                            type="submit"
                            disabled={checkinSubmitting}
                            className="px-6 py-2.5 rounded-lg bg-[#00FFFF] hover:bg-[#00FFFF]/90 text-black font-headline font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,255,255,0.25)] min-h-[42px]"
                          >
                            {checkinSubmitting ? (
                              <>
                                <Clock className="w-4 h-4 animate-spin" />
                                <span>Checking In...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Check In & Claim Slot</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {checkinError && (
                        <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-lg text-xs text-red-300 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          <span>{checkinError}</span>
                        </div>
                      )}
                    </form>
                  ) : tournament.status === 'Check-in Closed' ? (
                    <div className="p-4 bg-slate-900/50 border border-slate-700/50 rounded-lg space-y-1 text-xs">
                      <div className="font-bold text-slate-300 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Check-In Window Closed</span>
                      </div>
                      <p className="text-slate-400">
                        Check-in has concluded and the match roster is locked. If you missed check-in, contact tournament administration.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-[#171717] border border-[#262626] rounded-lg space-y-1 text-xs">
                      <div className="font-bold text-[#a3a3a3] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#00FFFF]" />
                        <span>Check-In Window Not Yet Open</span>
                      </div>
                      <p className="text-[#737373]">
                        Check-in will open at {tournament.checkInTime || 'the scheduled check-in time'}. Prepare your Free Fire UID in advance.
                      </p>
                    </div>
                  )}
                </div>

                {/* Custom Match Room Credentials Panel */}
                {tournament.roomStatus === 'Published' ? (
                  !isAuthenticated ? (
                    <div className="bg-[#111111] border border-[#333333] rounded-xl p-5 sm:p-6 space-y-3">
                      <div className="flex items-center gap-2 text-[#00FFFF] font-headline font-bold text-sm uppercase">
                        <Lock className="w-4 h-4 text-[#A0A0A0]" />
                        <span>Match Room Credentials</span>
                      </div>
                      <p className="text-xs text-[#A0A0A0] font-label leading-relaxed">
                        Sign in and register for this tournament to view custom room credentials.
                      </p>
                      <Link
                        to="/login"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#00FFFF]/10 border border-[#00FFFF]/40 text-[#00FFFF] font-label font-extrabold text-xs uppercase hover:bg-[#00FFFF]/20 transition-all"
                      >
                        Sign In to View
                      </Link>
                    </div>
                  ) : (isAlreadyRegistered || isAdmin) ? (
                    secureRoomDetails?.roomId ? (
                      <div className="bg-[#111111] border border-[#00FFFF]/50 rounded-xl p-5 sm:p-6 space-y-4 shadow-[0_0_20px_rgba(0,255,255,0.15)] relative overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#262626] pb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#FF0055] animate-pulse"></span>
                            <h3 className="font-headline text-base sm:text-lg font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                              <Key className="w-5 h-5 text-[#00FFFF]" />
                              <span>MATCH ROOM LIVE</span>
                            </h3>
                          </div>
                          <span className="px-3 py-1 rounded bg-[#00FFFF]/10 text-[#00FFFF] border border-[#00FFFF]/30 text-xs font-mono font-bold uppercase tracking-wider">
                            Room Status: Published
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* ROOM ID CARD */}
                          <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333333] space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-extrabold text-[#A0A0A0] uppercase font-label tracking-wider">ROOM ID</span>
                              <button
                                onClick={() => handleCopy(secureRoomDetails.roomId, 'Room ID')}
                                className="px-2.5 py-1 rounded bg-[#252525] hover:bg-[#00FFFF]/20 border border-[#333333] hover:border-[#00FFFF]/50 text-[#00FFFF] text-xs font-bold font-label flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer min-h-[32px]"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>COPY ID</span>
                              </button>
                            </div>
                            <div className="font-mono text-xl font-black text-[#00FFFF] tracking-wider select-all">
                              {secureRoomDetails.roomId}
                            </div>
                          </div>

                          {/* ROOM PASSWORD CARD */}
                          <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#333333] space-y-2">
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-[11px] font-extrabold text-[#A0A0A0] uppercase font-label tracking-wider">PASSWORD</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setShowPassword((prev) => !prev)}
                                  className="p-1.5 rounded hover:bg-[#252525] text-[#A0A0A0] hover:text-white transition-colors"
                                  title={showPassword ? 'Hide Password' : 'Show Password'}
                                >
                                  {showPassword ? <EyeOff className="w-4 h-4 text-[#00FFFF]" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => handleCopy(secureRoomDetails.roomPassword, 'Password')}
                                  className="px-2.5 py-1 rounded bg-[#252525] hover:bg-[#00FFFF]/20 border border-[#333333] hover:border-[#00FFFF]/50 text-white hover:text-[#00FFFF] text-xs font-bold font-label flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer min-h-[32px]"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>COPY PASSWORD</span>
                                </button>
                              </div>
                            </div>
                            <div className="font-mono text-xl font-black text-white tracking-wider select-all">
                              {showPassword ? (secureRoomDetails.roomPassword || 'None') : '••••••••'}
                            </div>
                          </div>
                        </div>

                        {/* COMBINED COPY CREDENTIALS BUTTON */}
                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#262626]">
                          <button
                            onClick={() => handleCopyCredentials(tournament?.title, secureRoomDetails.roomId, secureRoomDetails.roomPassword)}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#00FFFF] text-black font-label font-extrabold text-xs uppercase tracking-wider hover:bg-[#00FFFF]/90 transition-all flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(0,255,255,0.25)] active:scale-98 cursor-pointer min-h-[40px]"
                          >
                            <Copy className="w-4 h-4" />
                            <span>COPY CREDENTIALS</span>
                          </button>
                          <span className="text-xs font-label text-[#22c55e] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Match room is ready.</span>
                          </span>
                        </div>
                      </div>
                    ) : roomLoading ? (
                      <div className="bg-[#111111] border border-[#00FFFF]/30 rounded-xl p-5 sm:p-6 space-y-2 animate-pulse">
                        <div className="flex items-center gap-2 text-[#00FFFF] font-headline font-bold text-sm uppercase">
                          <Key className="w-4 h-4 text-[#00FFFF]" />
                          <span>Verifying Match Room Credentials...</span>
                        </div>
                        <p className="text-xs text-[#A0A0A0] font-label">
                          Loading secure room credentials for registered participants...
                        </p>
                      </div>
                    ) : (
                      <div className="bg-[#111111] border border-[#00FFFF]/40 rounded-xl p-5 sm:p-6 space-y-2">
                        <div className="flex items-center gap-2 text-[#00FFFF] font-headline font-bold text-sm uppercase">
                          <Key className="w-4 h-4 text-[#00FFFF]" />
                          <span>Match Room Credentials</span>
                        </div>
                        <p className="text-xs text-[#A0A0A0] font-label leading-relaxed">
                          {roomErrorMessage || 'Match room credentials have been published. Re-verifying participant session details...'}
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="bg-[#111111] border border-[#333333] rounded-xl p-5 sm:p-6 space-y-2">
                      <div className="flex items-center gap-2 text-[#00FFFF] font-headline font-bold text-sm uppercase">
                        <Lock className="w-4 h-4 text-[#A0A0A0]" />
                        <span>Match Room Credentials</span>
                      </div>
                      <p className="text-xs text-[#A0A0A0] font-label leading-relaxed">
                        Room credentials are available only to registered participants.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="bg-[#111111] border border-[#333333] rounded-xl p-5 sm:p-6 space-y-2">
                    <div className="flex items-center gap-2 text-[#00FFFF] font-headline font-bold text-sm uppercase">
                      <Key className="w-4 h-4 text-[#A0A0A0]" />
                      <span>Match Room Credentials</span>
                    </div>
                    <p className="text-xs text-[#A0A0A0] font-label leading-relaxed">
                      Room credentials will appear here when the admin publishes the room.
                    </p>
                  </div>
                )}

                {/* Tactical Map Banner */}
                <div className="mt-8 rounded-xl overflow-hidden border border-[#333333] shadow-lg">
                  <div
                    className="bg-cover bg-center w-full h-48 sm:h-64"
                    style={{
                      backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80')`
                    }}
                  ></div>
                </div>
              </section>
            )}

            {/* TAB 2: RULES */}
            {activeTab === 'rules' && (
              <OfficialRulebook
                rules={tournament.rules && tournament.rules.length > 0 ? tournament.rules : OFFICIAL_MJ_RULES}
              />
            )}

            {/* TAB 3: SCHEDULE */}
            {activeTab === 'schedule' && (
              <TournamentScheduleForm
                startDate={tournament.startDate || ''}
                startTime={tournament.startTime || '06:00 PM IST'}
                registrationStart={tournament.registrationStart || ''}
                registrationEnd={tournament.registrationEnd || ''}
                checkInTime={tournament.checkInTime || '05:15 PM IST'}
                roomPublishTime={tournament.roomPublishTime || '05:45 PM IST'}
                readOnly={true}
              />
            )}

            {/* TAB 4: REGISTERED SQUADS */}
            {activeTab === 'teams' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tournament.teamsList && tournament.teamsList.length > 0 ? (
                  tournament.teamsList.map((t, idx) => (
                    <div key={`squad-${idx}`} className="p-4 bg-[#1a1a1a] border border-[#333333] rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-[#f5f5f5] text-sm">{t.name}</h4>
                        <span className="text-xs text-[#22c55e] font-bold">Confirmed</span>
                      </div>
                      <p className="text-xs text-[#a3a3a3]">Captain: <strong className="text-[#f5f5f5]">{t.captain}</strong></p>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full p-8 text-center bg-[#1a1a1a] border border-[#333333] rounded-xl text-[#a3a3a3] text-xs">
                    No teams registered yet. Be the first squad to book a slot!
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: FAQS */}
            {activeTab === 'faqs' && (
              <div className="bg-[#1a1a1a] border border-[#333333] rounded-xl p-6 space-y-4">
                <h3 className="text-xl font-headline font-bold text-white">Frequently Asked Questions</h3>
                <div className="space-y-3">
                  {faqs.map((faq, idx) => (
                    <div key={`faq-${idx}`} className="bg-[#111111] border border-[#333333] rounded-lg overflow-hidden">
                      <button
                        onClick={() => setOpenFaqIndex(openFaqIndex === idx ? -1 : idx)}
                        className="w-full p-4 text-left text-xs font-bold text-white uppercase flex justify-between items-center hover:text-[#f97316]"
                      >
                        <span>{faq.q}</span>
                        {openFaqIndex === idx ? <ChevronUp className="w-4 h-4 text-[#f97316]" /> : <ChevronDown className="w-4 h-4 text-[#a3a3a3]" />}
                      </button>
                      {openFaqIndex === idx && (
                        <div className="p-4 pt-0 text-xs text-[#a3a3a3] leading-relaxed border-t border-[#333333]">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: STICKY SIDEBAR (Stitch Exact Layout) */}
          <div className="relative">
            <div className="sticky top-24 bg-[#1a1a1a] rounded-xl border border-[#333333] p-6 shadow-xl backdrop-blur-md bg-opacity-90 flex flex-col gap-6">
              <div>
                <h3 className="text-xl font-headline font-bold text-white border-b border-[#333333] pb-4 mb-4">
                  Registration Summary
                </h3>
                <ul className="space-y-4 font-body text-sm">
                  <li className="flex justify-between items-center">
                    <span className="text-[#a3a3a3]">Entry Fee</span>
                    <span className="font-semibold text-white">{tournament.entryFee || 'Free'} / Squad</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-[#a3a3a3]">Platform</span>
                    <span className="font-semibold text-white">Mobile</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-[#a3a3a3]">Format</span>
                    <span className="font-semibold text-white">{tournament.format || 'Custom Room'}</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-[#a3a3a3]">Registration Ends</span>
                    <span className="font-semibold text-white">{tournament.startDate || 'Nov 24, 11:59 PM'}</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-[#333333] space-y-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-lg text-white">Total</span>
                  <span className="font-display font-black text-2xl text-[#f97316]">
                    {tournament.entryFee || 'Free'}
                  </span>
                </div>

                {authLoading || (isAuthenticated && isCheckingRegistration && !isAlreadyRegistered) ? (
                  <button
                    disabled
                    className="w-full bg-[#1e1e1e] text-[#a3a3a3] border border-[#333333] font-headline font-bold text-sm sm:text-base py-4 rounded-xl flex items-center justify-center gap-2 cursor-wait animate-pulse"
                  >
                    <Clock className="w-4 h-4 text-[#f97316] animate-spin" />
                    <span>Verifying Registration...</span>
                  </button>
                ) : isCancelled ? (
                  <div className="space-y-3">
                    <button
                      disabled
                      className="w-full bg-red-950/50 text-red-400 border border-red-500/40 font-headline font-bold text-base py-4 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed select-none"
                    >
                      <Ban className="w-5 h-5 text-red-400" />
                      <span>Tournament Cancelled</span>
                    </button>
                    {isAlreadyRegistered && (
                      <div className="p-3.5 bg-[#111111] border border-emerald-500/30 rounded-xl space-y-2 text-xs font-mono">
                        <div className="flex justify-between items-center text-white">
                          <span className="text-[#a3a3a3]">Refund Status:</span>
                          <span className="text-[#22c55e] font-bold uppercase flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 100% Refunded
                          </span>
                        </div>
                        {userRegistration?.team_name && (
                          <div className="flex justify-between items-center text-white">
                            <span className="text-[#a3a3a3]">Registered Entry:</span>
                            <span className="font-bold text-[#00FFFF] truncate max-w-[160px]">
                              {userRegistration.team_name}
                            </span>
                          </div>
                        )}
                        <p className="text-[11px] text-emerald-400/90 pt-1 border-t border-[#262626] font-body leading-relaxed">
                          Your entry fee has been credited directly back to your authoritative MJ ESPORTS wallet.
                        </p>
                      </div>
                    )}
                  </div>
                ) : isAlreadyRegistered ? (
                  <div className="space-y-3">
                    <button
                      disabled
                      className="w-full bg-emerald-950/60 text-[#22c55e] border border-[#22c55e]/50 font-headline font-bold text-base py-4 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.2)] flex items-center justify-center gap-2 cursor-default select-none"
                    >
                      <CheckCircle2 className="w-5 h-5 text-[#22c55e]" />
                      <span>
                        {modeInfo.mode === 'Solo'
                          ? 'Player Registered'
                          : modeInfo.mode === 'Duo'
                          ? 'Duo Registered'
                          : 'Squad Registered'}
                      </span>
                    </button>

                    <div className="p-3.5 bg-[#111111] border border-[#22c55e]/30 rounded-xl space-y-2 text-xs font-mono">
                      <div className="flex justify-between items-center text-white">
                        <span className="text-[#a3a3a3]">Roster Status:</span>
                        <span className="text-[#22c55e] font-bold uppercase flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                        </span>
                      </div>
                      {userRegistration?.team_name && (
                        <div className="flex justify-between items-center text-white">
                          <span className="text-[#a3a3a3]">Registered Entry:</span>
                          <span className="font-bold text-[#00FFFF] truncate max-w-[160px]">
                            {userRegistration.team_name}
                          </span>
                        </div>
                      )}
                      {participantCheckin?.lobby_slot && (
                        <div className="flex justify-between items-center text-white">
                          <span className="text-[#a3a3a3]">Lobby Slot:</span>
                          <span className="font-bold text-[#00FFFF] font-mono">
                            Slot #{participantCheckin.lobby_slot}
                          </span>
                        </div>
                      )}
                      <p className="text-[11px] text-[#a3a3a3] pt-1.5 border-t border-[#262626] font-body leading-relaxed">
                        Match room credentials will automatically appear in the credentials panel above when published.
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleRegisterClick}
                    disabled={isRegistrationDisabled}
                    className="w-full bg-[#f97316] text-white font-headline font-bold text-lg py-4 rounded-xl hover:bg-orange-600 transition-colors shadow-[0_0_15px_rgba(249,115,22,0.3)] hover:shadow-[0_0_25px_rgba(249,115,22,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {!isAuthenticated
                      ? 'Sign In to Register'
                      : isFull
                      ? 'Registration Full'
                      : isClosed
                      ? 'Registration Closed'
                      : `Register ${modeInfo.mode} Now`}
                  </button>
                )}

                <p className="text-center text-xs text-[#a3a3a3] mt-2">
                  By registering, you agree to the official MJ tournament rules.
                </p>
              </div>

              {/* Share & Save Actions */}
              <div className="flex justify-center gap-6 pt-4 border-t border-[#333333]">
                <button
                  onClick={() => handleCopy(window.location.href, 'Tournament Link')}
                  className="text-[#a3a3a3] hover:text-[#f97316] transition-colors p-2 flex flex-col items-center gap-1 text-xs"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
                <button className="text-[#a3a3a3] hover:text-[#f97316] transition-colors p-2 flex flex-col items-center gap-1 text-xs">
                  <Bookmark className="w-4 h-4" /> Save
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Slot Booking Modal */}
      {showSlotModal && (
        <SlotBookingModal
          tournament={tournament}
          onClose={() => setShowSlotModal(false)}
          onRegistered={async () => {
            await fetchRegistrationStatus()
            if (fetchTournaments) await fetchTournaments()
          }}
        />
      )}

      {/* Incident Reporting Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141416] border border-[#27272a] rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Flag className="w-5 h-5" />
                <h3 className="font-headline font-bold text-base uppercase text-white">
                  Report Match Incident
                </h3>
              </div>
              <button
                onClick={() => setShowIncidentModal(false)}
                className="text-[#a3a3a3] hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReportIncident} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#a3a3a3] uppercase font-label">
                  Incident Category *
                </label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-xs text-white font-body outline-none focus:border-[#00FFFF]"
                >
                  <option value="ROOM_ISSUE">Room Issue (Invalid ID / Password)</option>
                  <option value="PLAYER_DISCONNECTED">Player / Squad Disconnection</option>
                  <option value="INCORRECT_ROOM_CONFIG">Incorrect Room Configuration</option>
                  <option value="TECHNICAL_ISSUE">Technical / Network Difficulty</option>
                  <option value="REMAKE_REQUEST">Request Match Remake</option>
                  <option value="OTHER">Other Operational Incident</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#a3a3a3] uppercase font-label">
                  Incident Description *
                </label>
                <textarea
                  value={incidentDescription}
                  onChange={(e) => setIncidentDescription(e.target.value)}
                  placeholder="Provide precise details of the issue (e.g. room password rejected, squad member timed out before match start)..."
                  rows={4}
                  className="w-full px-3 py-2 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-xs text-white font-body placeholder:text-[#525252] outline-none focus:border-[#00FFFF] resize-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(false)}
                  className="flex-1 py-2.5 bg-[#1c1b1c] hover:bg-[#27272a] text-[#849495] hover:text-white rounded-lg text-xs font-headline font-bold uppercase transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={incidentSubmitting}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-headline font-extrabold text-xs uppercase rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {incidentSubmitting ? 'Submitting...' : 'Submit Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
