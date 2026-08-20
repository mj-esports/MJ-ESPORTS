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
  EyeOff
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

export default function TournamentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getTournamentById, isUserRegistered, getUserRegistration, fetchTournaments, getRoomCredentials, loading } = useTournaments()
  const { user, isAuthenticated, isAdmin, loading: authLoading } = useAuth()
  const { showSuccess } = useToast()

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
  const isClosed = tournament.status === 'Registration Closed' || tournament.status === 'Bracket Locked' || tournament.status === 'Completed'
  const isRegistrationDisabled = isFull || isClosed || isAlreadyRegistered

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
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse"></span>
            <span className="text-[10px] xs:text-xs font-label text-[#a3a3a3] uppercase tracking-wider">
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
                    entryFee={tournament.entryFee || '₹50'}
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

    </div>
  )
}
