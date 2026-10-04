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
  FileText,
  Crosshair,
  Shield,
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
import PlayerMatchSchedule from '../components/tournament/PlayerMatchSchedule'
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

  const renderRegistrationSummaryCard = () => (
    <div className="bg-[#141416] rounded-xl border border-[#27272a] hover:border-[#00f2ff]/40 p-4 sm:p-5 shadow-xl flex flex-col gap-3.5 sm:gap-4 relative transition-colors">
      <div>
        <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-[#27272a] mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00f2ff]" />
            <h3 className="text-xs sm:text-sm font-headline font-bold text-white uppercase tracking-wider">
              Registration Summary
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-[#00f2ff] px-2 py-0.5 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/30 uppercase">
            {tournament.status || 'Instant Slot'}
          </span>
        </div>

        {/* Key Metrics Grid (2x2) */}
        <div className="grid grid-cols-2 gap-2 font-body text-xs mb-3">
          <div className="bg-[#1c1b1c] p-2.5 rounded-lg border border-[#27272a]">
            <span className="font-label text-[9px] uppercase tracking-wider text-[#849495] block">Entry Fee</span>
            <span className="font-mono text-sm sm:text-base font-bold text-[#00f2ff]">
              {tournament.entryFee || 'Free'} <span className="font-body text-[10px] text-[#849495] font-normal">/ {modeInfo.teamUnit || 'Squad'}</span>
            </span>
          </div>
          <div className="bg-[#1c1b1c] p-2.5 rounded-lg border border-[#27272a]">
            <span className="font-label text-[9px] uppercase tracking-wider text-[#849495] block">Platform</span>
            <span className="font-semibold text-white">Mobile <span className="text-[9px] text-[#849495] font-normal">(No PC)</span></span>
          </div>
          <div className="bg-[#1c1b1c] p-2.5 rounded-lg border border-[#27272a]">
            <span className="font-label text-[9px] uppercase tracking-wider text-[#849495] block">Format</span>
            <span className="font-semibold text-white">{tournament.format || `${modeInfo.mode} Mode`}</span>
          </div>
          <div className="bg-[#1c1b1c] p-2.5 rounded-lg border border-[#27272a]">
            <span className="font-label text-[9px] uppercase tracking-wider text-[#849495] block">Registration Ends</span>
            <span className="font-semibold text-red-400 truncate block">{tournament.startDate || tournament.registrationEnd || 'Before Kickoff'}</span>
          </div>
        </div>

        <div className="bg-[#1c1b1c] px-3 py-1.5 rounded-lg border border-[#27272a] flex items-center justify-between">
          <span className="font-label text-[10px] text-[#849495] uppercase tracking-wider">Prize Pool Target</span>
          <span className="font-mono text-xs font-bold text-[#ff5e07]">{formatTournamentPrize(tournament)} Total Purse</span>
        </div>
      </div>

      <div className="pt-2 sm:pt-3 border-t border-[#27272a] space-y-3">
        <div className="flex justify-between items-center mb-0.5">
          <span className="font-bold text-xs sm:text-sm text-[#e5e2e3] uppercase tracking-wider font-label">Total Entry</span>
          <span className="font-display font-black text-xl sm:text-2xl text-[#ff5e07]">
            {tournament.entryFee || 'Free'}
          </span>
        </div>

        {authLoading || (isAuthenticated && isCheckingRegistration && !isAlreadyRegistered) ? (
          <button
            disabled
            className="w-full bg-[#1c1b1c] text-[#849495] border border-[#27272a] font-headline font-bold text-xs sm:text-base py-3 sm:py-3.5 rounded-lg flex items-center justify-center gap-2 cursor-wait animate-pulse min-h-[44px]"
          >
            <Clock className="w-4 h-4 text-[#ff5e07] animate-spin" />
            <span>Verifying Registration...</span>
          </button>
        ) : isCancelled ? (
          <div className="space-y-3">
            <button
              disabled
              className="w-full bg-red-950/50 text-red-400 border border-red-500/40 font-headline font-bold text-xs sm:text-base py-3 sm:py-3.5 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed select-none min-h-[44px]"
            >
              <Ban className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
              <span>Tournament Cancelled</span>
            </button>
            {isAlreadyRegistered && (
              <div className="p-3 bg-[#0e0e0f] border border-emerald-500/30 rounded-lg space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center text-white">
                  <span className="text-[#b9cacb]">Refund Status:</span>
                  <span className="text-[#10b981] font-bold uppercase flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% Refunded
                  </span>
                </div>
                {userRegistration?.team_name && (
                  <div className="flex justify-between items-center text-white">
                    <span className="text-[#b9cacb]">Registered Entry:</span>
                    <span className="font-bold text-[#00f2ff] truncate max-w-[160px]">
                      {userRegistration.team_name}
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-emerald-400/90 pt-1 border-t border-[#27272a] font-body leading-relaxed">
                  Your entry fee has been credited directly back to your authoritative MJ ESPORTS wallet.
                </p>
              </div>
            )}
          </div>
        ) : isAlreadyRegistered ? (
          <div className="space-y-3">
            <button
              disabled
              className="w-full bg-emerald-950/60 text-[#10b981] border border-[#10b981]/50 font-headline font-bold text-xs sm:text-base py-3 sm:py-3.5 rounded-lg shadow-[0_0_16px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2 cursor-default select-none min-h-[44px]"
            >
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#10b981]" />
              <span>
                {modeInfo.mode === 'Solo'
                  ? 'Player Registered'
                  : modeInfo.mode === 'Duo'
                  ? 'Duo Registered'
                  : 'Squad Registered'}
              </span>
            </button>

            <div className="p-3 bg-[#0e0e0f] border border-[#10b981]/30 rounded-lg space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center text-white">
                <span className="text-[#b9cacb]">Roster Status:</span>
                <span className="text-[#10b981] font-bold uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                </span>
              </div>
              {userRegistration?.team_name && (
                <div className="flex justify-between items-center text-white">
                  <span className="text-[#b9cacb]">Registered Entry:</span>
                  <span className="font-bold text-[#00f2ff] truncate max-w-[160px]">
                    {userRegistration.team_name}
                  </span>
                </div>
              )}
              {participantCheckin?.lobby_slot && (
                <div className="flex justify-between items-center text-white">
                  <span className="text-[#b9cacb]">Lobby Slot:</span>
                  <span className="font-bold text-[#00f2ff] font-mono">
                    Slot #{participantCheckin.lobby_slot}
                  </span>
                </div>
              )}
              <p className="text-[11px] text-[#b9cacb] pt-1.5 border-t border-[#27272a] font-body leading-relaxed">
                Match room credentials will automatically appear in the credentials panel above when published.
              </p>
            </div>
          </div>
        ) : (
          <button
            onClick={handleRegisterClick}
            disabled={isRegistrationDisabled}
            className="w-full bg-[#ff5e07] hover:bg-[#e05204] text-white font-headline font-bold text-xs sm:text-sm uppercase tracking-wider py-3 sm:py-3.5 rounded-lg shadow-[0_0_16px_rgba(255,94,7,0.35)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Gamepad2 className="w-4 h-4" />
            <span>
              {!isAuthenticated
                ? 'Sign In to Register'
                : isFull
                ? 'Registration Full'
                : isClosed
                ? 'Registration Closed'
                : `Register ${modeInfo.mode} Now`}
            </span>
          </button>
        )}

        <p className="text-center text-[11px] text-[#849495] mt-1.5">
          By registering, you agree to the official MJ tournament rules.
        </p>
      </div>

      {/* Share & Save Actions */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#27272a]">
        <button
          onClick={() => handleCopy(window.location.href, 'Tournament Link')}
          className="h-8 bg-[#1c1b1c] hover:bg-[#27272a] text-[#b9cacb] hover:text-white font-label text-[11px] uppercase rounded-lg border border-[#27272a] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5 text-[#849495]" />
          <span>Share Link</span>
        </button>
        <button
          onClick={() => handleCopy(window.location.href, 'Tournament Bookmarked')}
          className="h-8 bg-[#1c1b1c] hover:bg-[#27272a] text-[#b9cacb] hover:text-white font-label text-[11px] uppercase rounded-lg border border-[#27272a] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Bookmark className="w-3.5 h-3.5 text-[#849495]" />
          <span>Save Scrim</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="w-full min-h-screen bg-[#131314] text-[#e5e2e3] font-body antialiased pb-24 sm:pb-16 md:pb-12">
      {/* 0. COMPACT MOBILE SUBHEADER / BREADCRUMB (Google Stitch Mobile Spec) */}
      <div className="sm:hidden px-4 py-2.5 bg-[#0e0e0f]/95 backdrop-blur-md border-b border-[#27272a] flex items-center justify-between text-xs font-label">
        <Link
          to="/tournaments"
          className="inline-flex items-center gap-1.5 text-[#b9cacb] hover:text-[#00f2ff] transition-colors group py-1"
        >
          <ArrowLeft className="w-4 h-4 text-[#00f2ff] transition-transform group-hover:-translate-x-0.5" />
          <span className="font-bold uppercase tracking-wider text-[11px]">Tournaments</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isCancelled ? 'bg-red-500' : 'bg-[#10b981] animate-pulse'}`}></span>
          <span className="font-mono text-[11px] text-[#849495] uppercase font-bold">
            {tournament.status || 'Live'}
          </span>
        </div>
      </div>

      {/* 1. STITCH HERO BANNER HEADER */}
      <div className="relative w-full min-h-[190px] xs:min-h-[220px] sm:min-h-[300px] md:h-[480px] lg:h-[512px] overflow-hidden flex flex-col justify-end">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-50"
          style={{
            backgroundImage: `url(${getTournamentImage(tournament)})`
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#131314] via-[#131314]/70 to-transparent"></div>
        <div className="relative z-10 w-full pt-6 sm:pt-8 md:p-12 pb-3.5 sm:pb-6 px-4 sm:px-6 max-w-7xl mx-auto flex flex-col justify-end">
          <div className="inline-flex items-center gap-2 bg-[#141416]/80 backdrop-blur-md border border-[#27272a] px-3 py-1 rounded-full w-max mb-2 sm:mb-3">
            <span className={`w-2 h-2 rounded-full ${isCancelled ? 'bg-red-500' : 'bg-[#10b981] animate-pulse'}`}></span>
            <span className={`text-[10px] xs:text-xs font-label uppercase tracking-wider font-bold ${isCancelled ? 'text-red-400' : 'text-[#b9cacb]'}`}>
              {tournament.status || 'Registration Open'}
            </span>
          </div>
          <h1 className="text-xl xs:text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-headline font-black text-white tracking-tight mb-2 sm:mb-2.5 uppercase drop-shadow-lg leading-tight">
            {tournament.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs md:text-sm font-label text-[#b9cacb]">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#141416]/70 border border-[#27272a]">
              <Gamepad2 className="w-3.5 h-3.5 text-[#ff5e07]" />
              <span className="font-semibold text-[#e5e2e3]">{tournament.game}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#141416]/70 border border-[#27272a]">
              <Users className="w-3.5 h-3.5 text-[#ff5e07]" />
              <span className="font-semibold text-[#e5e2e3]">{tournament.format || 'Squad'} Mode</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#141416]/70 border border-[#27272a]">
              <MapPin className="w-3.5 h-3.5 text-[#ff5e07]" />
              <span className="font-semibold text-[#e5e2e3]">{tournament.map || 'Bermuda'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA (2 COLS: OVERVIEW & STICKY SIDEBAR) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 sm:py-8 md:py-12">
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
          <div className="lg:col-span-2 space-y-6 sm:space-y-8 min-w-0 w-full">
            
            {/* Tabs Header */}
            <div className="border-b border-[#27272a] overflow-x-auto w-full max-w-full min-w-0 hide-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x overscroll-x-contain">
              <nav aria-label="Tabs" className="flex gap-2 sm:gap-6 min-w-max pb-0.5">
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
                    className={`font-headline text-xs xs:text-sm sm:text-base md:text-lg py-2.5 sm:py-3.5 px-3 sm:px-2 transition-all shrink-0 whitespace-nowrap focus:outline-none focus-visible:ring-1 focus-visible:ring-[#00f2ff] rounded-t-lg ${
                      activeTab === tab.id
                        ? 'font-bold text-[#ff5e07] border-b-2 border-[#ff5e07] bg-[#ff5e07]/5 sm:bg-transparent'
                        : 'font-medium text-[#b9cacb] hover:text-white hover:bg-[#1c1b1c]/40'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <section className="space-y-4 sm:space-y-6">
                {/* 1. TOURNAMENT OVERVIEW CARD (Desktop Only: Removed from Mobile Overview in Phase 2A) */}
                <div className="hidden lg:block bg-[#141416] p-4 sm:p-5 rounded-xl border border-[#27272a] space-y-3 shadow-lg">
                  <div className="flex items-center justify-between pb-2 border-b border-[#27272a]/60">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#00f2ff]" />
                      <h2 className="font-headline text-xs sm:text-sm font-bold text-white uppercase tracking-wider">Tournament Overview</h2>
                    </div>
                    <span className="font-mono text-[10px] text-[#849495] uppercase">
                      {tournament.id ? `DOC-ID: #${String(tournament.id).slice(0, 8)}` : 'PROTOCOL ACTIVE'}
                    </span>
                  </div>
                  <p className="text-[#b9cacb] leading-relaxed font-body text-xs sm:text-sm">
                    {tournament.description ||
                      'Welcome to the ultimate Free Fire MAX battleground. The Pro Championship brings together the top squads to compete for glory and a massive prize pool. Show your skills, coordinate with your team, and survive to become the champion.'}
                  </p>

                  {/* Quick Specs Grid (2x2) */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-[#1c1b1c] p-2.5 rounded-lg border border-[#27272a] flex items-center justify-between">
                      <div>
                        <span className="font-label text-[9px] uppercase tracking-wider text-[#849495] block">MAP TARGET</span>
                        <span className="font-body text-xs font-semibold text-white">{tournament.map || 'Bermuda'}</span>
                      </div>
                      <MapPin className="w-4 h-4 text-[#849495]" />
                    </div>
                    <div className="bg-[#1c1b1c] p-2.5 rounded-lg border border-[#27272a] flex items-center justify-between">
                      <div>
                        <span className="font-label text-[9px] uppercase tracking-wider text-[#849495] block">GUN ATTRIBUTES</span>
                        <span className={`font-body text-xs font-semibold ${tournament.gunAttributes === 'Enabled' || tournament.gun_attributes ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {tournament.gunAttributes === 'Enabled' || tournament.gun_attributes ? 'ENABLED' : 'OFF (Pure Skill)'}
                        </span>
                      </div>
                      <Crosshair className="w-4 h-4 text-[#849495]" />
                    </div>
                    <div className="bg-[#1c1b1c] p-2.5 rounded-lg border border-[#27272a] flex items-center justify-between">
                      <div>
                        <span className="font-label text-[9px] uppercase tracking-wider text-[#849495] block">CHAR. SKILLS</span>
                        <span className={`font-body text-xs font-semibold ${tournament.characterSkills === 'Enabled' || tournament.character_skills ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {tournament.characterSkills === 'Enabled' || tournament.character_skills ? 'ENABLED' : 'OFF'}
                        </span>
                      </div>
                      <Shield className="w-4 h-4 text-[#849495]" />
                    </div>
                    <div className="bg-[#1c1b1c] p-2.5 rounded-lg border border-[#27272a] flex items-center justify-between">
                      <div>
                        <span className="font-label text-[9px] uppercase tracking-wider text-[#849495] block">MATCH MODE</span>
                        <span className="font-body text-xs font-semibold text-white">{tournament.format || tournament.mode || 'Classic BR'}</span>
                      </div>
                      <Gamepad2 className="w-4 h-4 text-[#849495]" />
                    </div>
                  </div>
                </div>

                {/* 2. PRIZE ALLOCATION (Priority 2) */}
                <div className="bg-[#141416] p-4 sm:p-5 rounded-xl border border-[#ff5e07]/40 relative overflow-hidden space-y-3 shadow-lg">
                  <div className="flex items-center justify-between pb-2 border-b border-[#27272a]">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#ff5e07]" />
                      <h3 className="font-headline text-xs sm:text-sm font-bold text-white uppercase tracking-wider">Prize Pool & Allocation</h3>
                    </div>
                    <span className="font-mono text-[10px] text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/30 px-2 py-0.5 rounded font-bold uppercase">
                      Escrow Secured
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="font-label text-[10px] text-[#849495] uppercase tracking-wider block">TOTAL PURSE</span>
                      <span className="font-display text-2xl sm:text-3xl font-black text-[#ff5e07] tracking-tight">
                        {formatTournamentPrize(tournament)} <span className="font-label text-xs text-[#b9cacb] font-normal">INR</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-label text-[9px] text-[#849495] uppercase tracking-wider block">DISTRIBUTION</span>
                      <span className="font-label text-[11px] text-[#00f2ff] font-bold uppercase">100% Disbursed</span>
                    </div>
                  </div>
                  {/* Tier Breakdown Mini-Strip */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 py-2 px-1 bg-[#1c1b1c] rounded-lg border border-[#27272a] text-center font-mono">
                    <div className="border-r border-[#27272a] pr-1">
                      <span className="text-[9px] text-[#ff5e07] font-bold block uppercase">1ST PLACE</span>
                      <span className="text-xs font-bold text-white">50%</span>
                      <span className="text-[8px] text-[#849495] block">Booyah</span>
                    </div>
                    <div className="border-r border-[#27272a] px-1">
                      <span className="text-[9px] text-[#b9cacb] block uppercase">2ND PLACE</span>
                      <span className="text-xs font-bold text-white">30%</span>
                      <span className="text-[8px] text-[#849495] block">Runner-up</span>
                    </div>
                    <div className="border-r sm:border-r border-[#27272a] px-1">
                      <span className="text-[9px] text-[#b9cacb] block uppercase">3RD PLACE</span>
                      <span className="text-xs font-bold text-white">20%</span>
                      <span className="text-[8px] text-[#849495] block">Podium</span>
                    </div>
                    <div className="hidden sm:block pl-1">
                      <span className="text-[9px] text-[#00f2ff] block uppercase">PER KILL</span>
                      <span className="text-xs font-bold text-[#00f2ff]">MVP</span>
                      <span className="text-[8px] text-[#849495] block">Bounty</span>
                    </div>
                  </div>
                  {/* 4px Height Compact Gradient Progress Indicator */}
                  <div className="w-full bg-[#201f20] h-1.5 rounded-full overflow-hidden flex border border-[#27272a]/50">
                    <div className="h-full bg-[#ff5e07]" style={{ width: '50%' }}></div>
                    <div className="h-full bg-[#ffb59a]" style={{ width: '30%' }}></div>
                    <div className="h-full bg-[#849495]" style={{ width: '20%' }}></div>
                  </div>
                </div>

                {/* 3. DATE & TIME SPECIFICATION (Priority 3) */}
                <div className="bg-[#141416] p-4 sm:p-5 rounded-xl border border-[#27272a] space-y-3 shadow-lg">
                  <div className="flex items-center justify-between pb-2 border-b border-[#27272a]/60">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#00f2ff]" />
                      <h3 className="font-headline text-xs sm:text-sm font-bold text-white uppercase tracking-wider">Date & Time Specification</h3>
                    </div>
                    <span className="font-mono text-[10px] text-[#849495] px-1.5 py-0.5 rounded bg-[#1c1b1c] border border-[#27272a]">
                      IST (UTC+05:30)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-label text-[9px] text-[#849495] uppercase tracking-wider block">TOURNAMENT DATE</span>
                      <h4 className="font-headline text-sm sm:text-base font-bold text-white uppercase">{tournament.startDate || 'Nov 25, 2024'}</h4>
                    </div>
                    <div className="text-right">
                      <span className="font-label text-[9px] text-[#849495] uppercase tracking-wider block">MATCH KICKOFF</span>
                      <div className="flex items-center gap-1.5 justify-end">
                        <Clock className="w-4 h-4 text-[#00f2ff]" />
                        <span className="font-mono text-sm sm:text-base font-bold text-[#00f2ff]">{tournament.startTime || '06:00 PM IST'}</span>
                      </div>
                    </div>
                  </div>
                  {/* Mini Timeline Pill */}
                  <div className="bg-[#1c1b1c] p-2 rounded-lg border border-[#27272a] flex items-center justify-between font-mono text-[10px] text-[#b9cacb]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                      <span>Reg Closes: <strong className="text-white">{tournament.registrationEnd || tournament.startDate || '05:00 PM'}</strong></span>
                    </div>
                    <span className="text-[#849495]">•</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e07]"></span>
                      <span>Check-in: <strong className="text-white">{tournament.checkInTime || '05:15 PM'}</strong></span>
                    </div>
                    <span className="text-[#849495]">•</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff]"></span>
                      <span>Kickoff: <strong className="text-white">{tournament.startTime || '06:00 PM'}</strong></span>
                    </div>
                  </div>
                </div>

                {/* 4. MOBILE-PROMOTED REGISTRATION SUMMARY & CTA (Priority 1) */}
                <div className="block lg:hidden">
                  {renderRegistrationSummaryCard()}
                </div>

                {/* PRIZE POOL BREAKDOWN & DISTRIBUTION CARD (Desktop Only: Mobile uses promoted Registration Summary) */}
                <div className="hidden lg:block mt-6">
                  <EntryPrizeSystem
                    entryFee={entryFeeStr}
                    paymentEnabled={isPaidTournament}
                    maxTeams={tournament.maxTeams || tournament.max_teams || 12}
                    game={tournament.game}
                    mode={tournament.mode}
                    readOnly={true}
                  />
                </div>

                {/* 5. SLOT CAPACITY METRICS (Priority 4) */}
                <div className="bg-[#141416] p-4 sm:p-5 rounded-xl border border-[#27272a] space-y-3 shadow-lg">
                  <div className="flex items-center justify-between pb-2 border-b border-[#27272a]/60">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#00f2ff]" />
                      <h4 className="font-headline text-xs sm:text-sm font-bold text-white uppercase tracking-wider">Slot Capacity Metrics</h4>
                    </div>
                    <span className="font-mono text-[10px] text-[#00f2ff] bg-[#00f2ff]/10 border border-[#00f2ff]/30 px-2 py-0.5 rounded font-bold">
                      {fillPercentage}% FILLED
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#1c1b1c] p-2.5 rounded-lg border border-[#27272a]">
                      <span className="font-label text-[9px] uppercase tracking-wider text-[#849495] block">REGISTERED SQUADS</span>
                      <span className="font-mono text-sm font-bold text-white">
                        {regTeams} / {maxTeams} <span className="text-[10px] text-[#849495]">{modeInfo.teamUnit || 'Squads'}</span>
                      </span>
                    </div>
                    <div className="bg-[#1c1b1c] p-2.5 rounded-lg border border-[#27272a]">
                      <span className="font-label text-[9px] uppercase tracking-wider text-[#849495] block">COMBATANTS LOGGED</span>
                      <span className="font-mono text-sm font-bold text-white">
                        {filledPlayerSlots} / {totalPlayerSlots} <span className="text-[10px] text-[#849495]">Players</span>
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="w-full bg-[#201f20] rounded-full h-2.5 overflow-hidden border border-[#27272a]/50">
                      <div
                        className="bg-gradient-to-r from-[#00f2ff] to-[#ff5e07] h-2.5 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,242,255,0.4)]"
                        style={{ width: `${fillPercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[10px] pt-0.5">
                      <span className="text-[#849495]">SLOTS RESERVED: {regTeams}</span>
                      <span className="text-[#ff5e07] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e07]"></span>
                        {Math.max(0, maxTeams - regTeams)} {modeInfo.teamUnit || 'Squad'} Slots Remaining
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6. MATCH CHECK-IN & ROSTER VERIFICATION (Desktop Only: Removed from Mobile Overview in Phase 2A) */}
                <div className="hidden lg:block bg-[#141416] border border-[#27272a] rounded-xl p-4 sm:p-6 space-y-4 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#27272a] pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#00f2ff]" />
                      <h3 className="font-headline text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                        Match Check-In & Slot Assignment
                      </h3>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold uppercase tracking-wider border ${
                      tournament.status === 'Check-in Open'
                        ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/40 animate-pulse'
                        : tournament.status === 'Check-in Closed'
                        ? 'bg-slate-900 text-slate-400 border-slate-700'
                        : 'bg-[#1c1b1c] text-[#849495] border-[#27272a]'
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
                      <p className="text-xs text-[#b9cacb] font-body leading-relaxed">
                        Sign in to verify your registration and check in for this tournament match.
                      </p>
                      <Link
                        to="/login"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00f2ff]/10 border border-[#00f2ff]/40 text-[#00f2ff] font-label font-extrabold text-xs uppercase hover:bg-[#00f2ff]/20 transition-all"
                      >
                        Sign In
                      </Link>
                    </div>
                  ) : !isAlreadyRegistered && !isAdmin ? (
                    <p className="text-xs text-[#849495] font-body leading-relaxed">
                      Check-in is reserved for confirmed participants. Register your entry using the summary card to receive match slot assignments.
                    </p>
                  ) : participantCheckin ? (
                    /* ALREADY CHECKED IN VIEW */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="p-3.5 bg-[#1c1b1c] rounded-lg border border-[#00f2ff]/30 flex flex-col justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#849495] font-label">
                            Assigned Lobby Slot
                          </span>
                          <p className="text-xl sm:text-2xl font-mono font-black text-[#00f2ff] mt-1">
                            {participantCheckin.lobby_slot ? `SLOT #${participantCheckin.lobby_slot}` : 'PENDING'}
                          </p>
                          <span className="text-[10px] text-[#849495] mt-1">
                            Join this exact slot number in the room
                          </span>
                        </div>

                        <div className="p-3.5 bg-[#1c1b1c] rounded-lg border border-[#27272a] flex flex-col justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#849495] font-label">
                            Check-In Status
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span className="font-mono text-sm font-bold text-white uppercase">
                              {participantCheckin.status}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#849495] mt-1">
                            {participantCheckin.status === 'LOCKED' ? 'Roster finalized by admin' : 'Check-in recorded'}
                          </span>
                        </div>

                        <div className="p-3.5 bg-[#1c1b1c] rounded-lg border border-[#27272a] flex flex-col justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#849495] font-label">
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
                          <span className="text-[10px] text-[#849495] mt-1 font-mono">
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

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#27272a]">
                        <span className="text-xs text-[#849495]">
                          Experiencing an in-game issue, disconnect, or room conflict?
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowIncidentModal(true)}
                          className="px-3 py-1.5 rounded-lg bg-[#1c1b1c] hover:bg-[#27272a] text-amber-400 border border-amber-500/30 text-xs font-bold font-label uppercase flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Flag className="w-3.5 h-3.5" />
                          <span>Report Match Incident</span>
                        </button>
                      </div>
                    </div>
                  ) : tournament.status === 'Check-in Open' ? (
                    /* CHECK-IN OPEN FORM VIEW */
                    <form onSubmit={handleCheckinSubmit} className="space-y-4">
                      <p className="text-xs text-[#b9cacb] font-body leading-relaxed">
                        The check-in window is open! Submit your Free Fire MAX in-game character UID to confirm readiness and automatically receive your official custom room lobby slot.
                      </p>

                      <div className="p-3 bg-[#1c1b1c] rounded-lg border border-[#27272a] space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#849495] font-label uppercase font-bold">Registered UID:</span>
                          <span className="font-mono font-bold text-white">
                            {userRegistration?.captain_uid || 'Not recorded'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#e5e2e3] font-label uppercase tracking-wider block">
                          Free Fire In-Game UID *
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={checkinInputUid}
                            onChange={(e) => setCheckinInputUid(e.target.value)}
                            placeholder="Enter 8-10 digit Free Fire UID"
                            className="flex-1 px-4 py-2.5 bg-[#1c1b1c] border border-[#27272a] focus:border-[#00f2ff] rounded-lg text-white font-mono text-sm placeholder:text-[#525252] outline-none transition-colors"
                            required
                          />
                          <button
                            type="submit"
                            disabled={checkinSubmitting}
                            className="px-6 py-2.5 rounded-lg bg-[#00f2ff] hover:bg-[#00dbe7] text-black font-headline font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,242,255,0.25)] min-h-[42px]"
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
                    <div className="p-4 bg-[#1c1b1c] border border-[#27272a] rounded-lg space-y-1 text-xs">
                      <div className="font-bold text-[#b9cacb] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#00f2ff]" />
                        <span>Check-In Window Not Yet Open</span>
                      </div>
                      <p className="text-[#849495]">
                        Check-in will open at {tournament.checkInTime || 'the scheduled check-in time'}. Prepare your Free Fire UID in advance.
                      </p>
                    </div>
                  )}
                </div>

                {/* 7. CUSTOM MATCH ROOM CREDENTIALS (Priority 6) */}
                {tournament.roomStatus === 'Published' ? (
                  !isAuthenticated ? (
                    <div className="bg-[#141416] border border-[#27272a] rounded-xl p-4 sm:p-6 space-y-3 shadow-lg">
                      <div className="flex items-center gap-2 text-[#00f2ff] font-headline font-bold text-sm uppercase">
                        <Lock className="w-4 h-4 text-[#849495]" />
                        <span>Match Room Credentials</span>
                      </div>
                      <p className="text-xs text-[#849495] font-body leading-relaxed">
                        Sign in and register for this tournament to view custom room credentials.
                      </p>
                      <Link
                        to="/login"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00f2ff]/10 border border-[#00f2ff]/40 text-[#00f2ff] font-label font-extrabold text-xs uppercase hover:bg-[#00f2ff]/20 transition-all"
                      >
                        Sign In to View
                      </Link>
                    </div>
                  ) : (isAlreadyRegistered || isAdmin) ? (
                    secureRoomDetails?.roomId ? (
                      <div className="bg-[#141416] border border-[#00f2ff]/50 rounded-xl p-4 sm:p-6 space-y-4 shadow-[0_0_20px_rgba(0,255,255,0.15)] relative overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#27272a] pb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5e07] animate-pulse"></span>
                            <h3 className="font-headline text-sm sm:text-base font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                              <Key className="w-4 h-4 text-[#00f2ff]" />
                              <span>MATCH ROOM LIVE</span>
                            </h3>
                          </div>
                          <span className="px-2.5 py-1 rounded bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 text-xs font-mono font-bold uppercase tracking-wider">
                            Room Status: Published
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* ROOM ID CARD */}
                          <div className="bg-[#1c1b1c] p-3.5 sm:p-4 rounded-lg border border-[#27272a] space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-extrabold text-[#849495] uppercase font-label tracking-wider">ROOM ID</span>
                              <button
                                onClick={() => handleCopy(secureRoomDetails.roomId, 'Room ID')}
                                className="px-2.5 py-1 rounded bg-[#201f20] hover:bg-[#00f2ff]/20 border border-[#27272a] hover:border-[#00f2ff]/50 text-[#00f2ff] text-xs font-bold font-label flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer min-h-[32px]"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>COPY ID</span>
                              </button>
                            </div>
                            <div className="font-mono text-xl font-black text-[#00f2ff] tracking-wider select-all">
                              {secureRoomDetails.roomId}
                            </div>
                          </div>

                          {/* ROOM PASSWORD CARD */}
                          <div className="bg-[#1c1b1c] p-3.5 sm:p-4 rounded-lg border border-[#27272a] space-y-2">
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-[10px] font-extrabold text-[#849495] uppercase font-label tracking-wider">PASSWORD</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setShowPassword((prev) => !prev)}
                                  className="p-1.5 rounded hover:bg-[#201f20] text-[#849495] hover:text-white transition-colors"
                                  title={showPassword ? 'Hide Password' : 'Show Password'}
                                >
                                  {showPassword ? <EyeOff className="w-4 h-4 text-[#00f2ff]" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => handleCopy(secureRoomDetails.roomPassword, 'Password')}
                                  className="px-2.5 py-1 rounded bg-[#201f20] hover:bg-[#00f2ff]/20 border border-[#27272a] hover:border-[#00f2ff]/50 text-white hover:text-[#00f2ff] text-xs font-bold font-label flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer min-h-[32px]"
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
                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#27272a]">
                          <button
                            onClick={() => handleCopyCredentials(tournament?.title, secureRoomDetails.roomId, secureRoomDetails.roomPassword)}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#00f2ff] text-black font-headline font-black text-xs uppercase tracking-wider hover:bg-[#00dbe7] transition-all flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(0,242,255,0.25)] active:scale-98 cursor-pointer min-h-[40px]"
                          >
                            <Copy className="w-4 h-4" />
                            <span>COPY CREDENTIALS</span>
                          </button>
                          <span className="text-xs font-label text-[#10b981] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Match room is ready.</span>
                          </span>
                        </div>
                      </div>
                    ) : roomLoading ? (
                      <div className="bg-[#141416] border border-[#00f2ff]/30 rounded-xl p-4 sm:p-6 space-y-2 animate-pulse">
                        <div className="flex items-center gap-2 text-[#00f2ff] font-headline font-bold text-sm uppercase">
                          <Key className="w-4 h-4 text-[#00f2ff]" />
                          <span>Verifying Match Room Credentials...</span>
                        </div>
                        <p className="text-xs text-[#849495] font-label">
                          Loading secure room credentials for registered participants...
                        </p>
                      </div>
                    ) : (
                      <div className="bg-[#141416] border border-[#00f2ff]/40 rounded-xl p-4 sm:p-6 space-y-2">
                        <div className="flex items-center gap-2 text-[#00f2ff] font-headline font-bold text-sm uppercase">
                          <Key className="w-4 h-4 text-[#00f2ff]" />
                          <span>Match Room Credentials</span>
                        </div>
                        <p className="text-xs text-[#849495] font-body leading-relaxed">
                          {roomErrorMessage || 'Match room credentials have been published. Re-verifying participant session details...'}
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="bg-[#141416] border border-[#27272a] rounded-xl p-4 sm:p-6 space-y-2">
                      <div className="flex items-center gap-2 text-[#00f2ff] font-headline font-bold text-sm uppercase">
                        <Lock className="w-4 h-4 text-[#849495]" />
                        <span>Match Room Credentials</span>
                      </div>
                      <p className="text-xs text-[#849495] font-body leading-relaxed">
                        Room credentials are available only to registered participants.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="bg-[#141416] border border-[#27272a] rounded-xl p-4 sm:p-6 space-y-2">
                    <div className="flex items-center gap-2 text-[#00f2ff] font-headline font-bold text-sm uppercase">
                      <Key className="w-4 h-4 text-[#849495]" />
                      <span>Match Room Credentials</span>
                    </div>
                    <p className="text-xs text-[#849495] font-body leading-relaxed">
                      Room credentials will appear here when the admin publishes the room.
                    </p>
                  </div>
                )}

                {/* Tactical Map Banner (Render only when map image content exists) */}
                {(tournament.mapImage || tournament.map_image) && (
                  <div className="mt-8 rounded-xl overflow-hidden border border-[#27272a] shadow-lg">
                    <div
                      className="bg-cover bg-center w-full h-48 sm:h-64"
                      style={{
                        backgroundImage: `url(${tournament.mapImage || tournament.map_image})`
                      }}
                    ></div>
                  </div>
                )}
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
              <div className="space-y-6 sm:space-y-8">
                <PlayerMatchSchedule tournamentId={id} tournament={tournament} />
                <div className="pt-1 sm:pt-2">
                  <div className="mb-3 sm:mb-4">
                    <h3 className="font-headline text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      Tournament Timeline & Window Details
                    </h3>
                    <p className="text-xs text-[#849495] mt-0.5">
                      Authoritative schedule windows for player registration, check-in, and match kickoff.
                    </p>
                  </div>
                  <TournamentScheduleForm
                    startDate={tournament.startDate || ''}
                    startTime={tournament.startTime || '06:00 PM IST'}
                    registrationStart={tournament.registrationStart || ''}
                    registrationEnd={tournament.registrationEnd || ''}
                    checkInTime={tournament.checkInTime || '05:15 PM IST'}
                    roomPublishTime={tournament.roomPublishTime || '05:45 PM IST'}
                    readOnly={true}
                  />
                </div>
              </div>
            )}

            {/* TAB 4: REGISTERED SQUADS */}
            {activeTab === 'teams' && (() => {
              const registeredSquads = Array.isArray(tournament?.teamsList) && tournament.teamsList.length > 0
                ? tournament.teamsList
                : (Array.isArray(tournament?.teams_list) ? tournament.teams_list : [])

              return (
                <div className="space-y-4">
                  {/* Header Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 border-b border-[#27272a] pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff] shrink-0">
                        <Users className="w-4 h-4 text-[#00f2ff]" />
                      </div>
                      <div>
                        <h3 className="font-headline text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                          Registered Squads
                        </h3>
                        <span className="font-mono text-[10px] sm:text-[11px] text-[#849495] block">
                          Confirmed Battle Roster
                        </span>
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-mono font-bold px-2.5 py-0.5 rounded bg-[#1c1b1c] text-[#00f2ff] border border-[#00f2ff]/30 uppercase tracking-wider shrink-0">
                        {registeredSquads.length} / {maxTeams} {modeInfo.teamUnit || 'Squads'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Roster Verified</span>
                      </span>
                    </div>
                  </div>

                  {/* Empty State vs Squad Cards Grid */}
                  {registeredSquads.length === 0 ? (
                    <div
                      data-testid="squads-empty-state"
                      className="bg-[#141416] border border-[#27272a] rounded-xl p-6 sm:p-8 text-center space-y-3.5 shadow-md max-w-full"
                    >
                      <div className="w-12 h-12 rounded-xl bg-[#1c1b1c] border border-[#27272a] flex items-center justify-center mx-auto text-[#00f2ff]">
                        <Users className="w-6 h-6 text-[#00f2ff]/70" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm sm:text-base font-headline font-bold text-white uppercase tracking-wide">
                          No squads registered yet.
                        </p>
                        <p className="text-xs text-[#849495] max-w-sm mx-auto leading-relaxed">
                          Be the first combat unit to claim an official slot in this tournament bracket.
                        </p>
                      </div>
                      <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                        {!isRegistrationDisabled && (
                          <button
                            type="button"
                            onClick={handleRegisterClick}
                            className="px-5 py-2.5 bg-[#ff5e07] hover:bg-[#e05206] text-white font-headline font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(255,94,7,0.3)] active:scale-98 cursor-pointer min-h-[44px] flex items-center gap-2"
                          >
                            <Trophy className="w-4 h-4" />
                            <span>Claim First Slot</span>
                          </button>
                        )}
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c1b1c] border border-[#27272a] text-[10px] sm:text-[11px] font-mono text-[#00f2ff]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>{maxTeams} {modeInfo.teamUnit || 'Squad'} Slots Vacant</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      data-testid="registered-squads-grid"
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
                    >
                      {registeredSquads.map((t, idx) => {
                        const teamName = t.name || t.team_name || `Squad ${idx + 1}`
                        const captainName = t.captain || t.captain_name || t.captain_uid || 'Squad Leader'
                        const status = t.status || 'Confirmed'
                        const isConfirmed = status.toLowerCase() === 'confirmed'

                        return (
                          <div
                            key={`squad-${idx}`}
                            data-testid={`squad-card-${idx}`}
                            className="p-3.5 sm:p-4 bg-[#141416] border border-[#27272a] hover:border-[#00f2ff]/40 rounded-xl space-y-3 transition-colors shadow-sm relative flex flex-col justify-between"
                          >
                            {/* Top Row: Slot Number, Team Name & Status */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="px-2 py-0.5 rounded bg-[#1c1b1c] border border-[#27272a] text-[10px] sm:text-[11px] font-mono font-bold text-[#00f2ff] shrink-0">
                                  SLOT #{String(idx + 1).padStart(2, '0')}
                                </span>
                                <h4 className="font-headline font-bold text-white text-xs sm:text-sm tracking-wide truncate">
                                  {teamName}
                                </h4>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 border ${
                                isConfirmed
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                                  : 'bg-amber-950/60 text-amber-400 border-amber-500/40'
                              }`}>
                                {status}
                              </span>
                            </div>

                            {/* Details Bento Box */}
                            <div className="p-2.5 bg-[#1c1b1c] rounded-lg border border-[#27272a] space-y-1.5 text-xs font-mono">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-[10px] text-[#849495] uppercase font-bold tracking-wider">CAPTAIN</span>
                                <span className="text-white font-semibold truncate max-w-[160px] text-[11px] sm:text-xs">
                                  {captainName}
                                </span>
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-[#27272a]/60 text-[10px] text-[#849495]">
                                <span>VERIFICATION</span>
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>ROSTER LOCKED</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Promoted Mobile Registration Prompt if slots remain */}
                  {registeredSquads.length > 0 && !isRegistrationDisabled && (
                    <div className="p-3.5 sm:p-4 bg-[#141416] border border-[#27272a] rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
                      <div className="space-y-0.5">
                        <span className="font-headline text-xs sm:text-sm font-bold text-white uppercase tracking-wider block">
                          Slots Remaining: {Math.max(0, maxTeams - registeredSquads.length)} {modeInfo.teamUnit || 'Squads'}
                        </span>
                        <span className="text-xs text-[#849495] block">
                          Registration is open for verified squads. Book your entry before cutoff.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRegisterClick}
                        className="px-5 py-2.5 bg-[#ff5e07] hover:bg-[#e05206] text-white font-headline font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_12px_rgba(255,94,7,0.3)] active:scale-98 cursor-pointer min-h-[44px]"
                      >
                        Claim Slot
                      </button>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* TAB 5: FAQS (Phase 6 Approved Stitch Redesign) */}
            {activeTab === 'faqs' && (
              <section className="space-y-3.5 sm:space-y-4 max-w-full">
                {/* Header & Category Banner */}
                <div className="bg-[#141416] p-4 sm:p-5 rounded-xl border border-[#27272a] shadow-lg space-y-2">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#27272a]/60">
                    <div className="flex items-center gap-2 min-w-0">
                      <HelpCircle className="w-4 h-4 text-[#00f2ff] shrink-0" />
                      <h2 className="font-headline text-xs sm:text-sm font-bold text-white uppercase tracking-wider truncate">
                        Frequently Asked Questions
                      </h2>
                    </div>
                    <span className="font-mono text-[10px] text-[#00f2ff] px-2 py-0.5 rounded bg-[#1c1b1c] border border-[#00f2ff]/30 uppercase tracking-wider shrink-0">
                      Arbiter Guide
                    </span>
                  </div>
                  <p className="text-[#849495] font-body text-xs leading-relaxed">
                    Official protocols covering custom room access, escrow settlements, match disconnects, and esports scoring.
                  </p>
                </div>

                {/* Compact Accordion */}
                <div data-testid="faq-accordion" className="space-y-2 sm:space-y-2.5">
                  {faqs.map((faq, idx) => {
                    const isOpen = openFaqIndex === idx
                    return (
                      <div
                        key={`faq-${idx}`}
                        data-testid={`faq-item-${idx}`}
                        className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                          isOpen
                            ? 'bg-[#1c1b1c] border-[#00f2ff]/40 shadow-[0_0_12px_rgba(0,242,255,0.06)]'
                            : 'bg-[#141416] border-[#27272a] hover:border-[#27272a]/90 hover:bg-[#1a191a]'
                        }`}
                      >
                        <button
                          type="button"
                          id={`faq-btn-${idx}`}
                          aria-expanded={isOpen}
                          aria-controls={`faq-panel-${idx}`}
                          onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                          className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 cursor-pointer select-none transition-colors min-h-[44px] group"
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 border transition-colors ${
                              isOpen
                                ? 'bg-[#ff5e07]/10 text-[#ff5e07] border-[#ff5e07]/30'
                                : 'bg-[#1c1b1c] text-[#849495] border-[#27272a] group-hover:text-[#00f2ff]'
                            }`}>
                              0{idx + 1}
                            </span>
                            <span className={`font-headline font-bold text-xs sm:text-sm tracking-wide transition-colors ${
                              isOpen ? 'text-[#ff5e07]' : 'text-white group-hover:text-[#00f2ff]'
                            }`}>
                              {faq.q}
                            </span>
                          </div>
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                            isOpen
                              ? 'bg-[#ff5e07]/15 border-[#ff5e07]/40 text-[#ff5e07]'
                              : 'bg-[#1c1b1c] border-[#27272a] text-[#849495] group-hover:text-white'
                          }`}>
                            {isOpen ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </div>
                        </button>

                        {isOpen && (
                          <div
                            id={`faq-panel-${idx}`}
                            role="region"
                            aria-labelledby={`faq-btn-${idx}`}
                            data-testid={`faq-answer-${idx}`}
                            className="px-3.5 pb-3.5 sm:px-4 sm:pb-4 pt-0"
                          >
                            <div className="p-3 rounded-lg bg-[#141416] border border-[#27272a]/70 text-xs text-[#b9cacb] font-body leading-relaxed space-y-1.5">
                              <p>{faq.a}</p>
                              <div className="pt-1 border-t border-[#27272a]/50 flex items-center justify-between text-[10px] font-mono text-[#849495]">
                                <span>STANDARD PROCEDURE</span>
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>ENFORCED</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Arbitration & Support Contact Notice */}
                <div className="p-3.5 sm:p-4 bg-[#141416] border border-[#27272a] rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-headline font-bold text-white uppercase tracking-wider block text-xs">
                      Need Immediate Match Support?
                    </span>
                    <span className="text-[#849495] text-[11px] block">
                      Arbiters are active on official discord 30 minutes prior to room launch.
                    </span>
                  </div>
                  <Link
                    to="/about"
                    className="px-3.5 py-2 rounded-lg bg-[#1c1b1c] border border-[#27272a] hover:border-[#00f2ff]/40 text-[#00f2ff] font-mono text-[11px] font-bold uppercase tracking-wider transition-colors shrink-0 min-h-[36px] flex items-center"
                  >
                    Support Desk
                  </Link>
                </div>
              </section>
            )}

          </div>

          {/* RIGHT COLUMN: STICKY SIDEBAR (Stitch Exact Layout) */}
          <div className={`relative ${activeTab === 'overview' ? 'hidden lg:block' : 'block'}`}>
            <div className="sticky top-24">
              {renderRegistrationSummaryCard()}
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
