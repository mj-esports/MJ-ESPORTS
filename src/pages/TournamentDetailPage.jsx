import { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Trophy,
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  Swords,
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
  Sparkles,
  Flame,
  Check,
  Building2,
  HelpCircle,
  Layers,
  MapPin,
  Share2
} from 'lucide-react'
import { useTournaments } from '../contexts/TournamentContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { DetailSkeleton } from '../components/common/SkeletonLoader'
import SlotBookingModal from '../components/tournament/SlotBookingModal'
import PointsTable from '../components/bracket/PointsTable'
import BracketViewer from '../components/bracket/BracketViewer'

export default function TournamentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getTournamentById, isUserRegistered, loading } = useTournaments()
  const { user, isAuthenticated, isAdmin } = useAuth()
  const { showSuccess } = useToast()

  const tournament = getTournamentById(id)

  const [activeTab, setActiveTab] = useState('overview')
  const [showSlotModal, setShowSlotModal] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState(0)

  const handleCopy = (text, label) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    showSuccess(`${label} copied to clipboard!`, 'Copied')
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <DetailSkeleton />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <Trophy className="w-12 h-12 text-[#8e9dae] mx-auto opacity-50" />
        <h2 className="font-display-lg text-2xl font-bold text-white uppercase">Tournament Not Found</h2>
        <p className="text-xs text-[#8e9dae]">The tournament ID you requested does not exist or has been removed.</p>
        <Link to="/tournaments" className="btn-cyber-primary inline-flex">
          Back to Tournaments
        </Link>
      </div>
    )
  }

  const regTeams = Number(tournament.registeredTeams || tournament.registered_teams || 0)
  const maxTeams = Number(tournament.maxTeams || tournament.max_teams || 32)
  const fillPercentage = Math.min(100, Math.round((regTeams / maxTeams) * 100))

  const isFull = regTeams >= maxTeams
  const isClosed = tournament.status === 'Registration Closed' || tournament.status === 'Bracket Locked' || tournament.status === 'Completed'
  const isAlreadyRegistered = isUserRegistered(tournament.id, user?.email || user?.id || user?.user_metadata?.username)
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8">
      
      {/* Back Button */}
      <Link to="/tournaments" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8e9dae] hover:text-[#00f2ff] uppercase tracking-wider transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Tournaments</span>
      </Link>

      {/* 1. HERO BANNER HEADER CARD */}
      <div className="p-6 sm:p-10 rounded-xl bg-[#151a21] border border-[#3a494b]/60 space-y-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded text-xs font-bold uppercase tracking-wider bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 flex items-center gap-1.5 shrink-0">
              <Gamepad2 className="w-4 h-4" />
              {tournament.game}
            </span>
            <span className="px-3 py-1 rounded text-xs font-bold uppercase tracking-wider bg-[#07090c] text-white border border-[#3a494b] shrink-0 font-mono">
              {tournament.format} Mode
            </span>
          </div>
          
          {/* Registration Status Badge & Pulse */}
          <div className="flex items-center gap-2 flex-wrap">
            {isAlreadyRegistered && (
              <span className="px-3 py-1 rounded text-xs font-bold uppercase tracking-wider bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/40 flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>You Are Registered</span>
              </span>
            )}

            <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider border shrink-0 ${
              tournament.status === 'Live Now'
                ? 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40 animate-pulse'
                : tournament.status === 'Registration Open'
                ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40'
                : 'bg-[#8e9dae]/10 text-[#8e9dae] border-[#8e9dae]/40'
            }`}>
              ● Status: {tournament.status}
            </span>
          </div>
        </div>

        {/* Tournament Title & Organizer */}
        <div className="space-y-2">
          <h1 className="font-display-lg text-2xl sm:text-5xl font-extrabold text-white tracking-tight uppercase leading-tight">
            {tournament.title}
          </h1>
          <div className="flex items-center gap-4 text-xs text-[#8e9dae] flex-wrap">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#00f2ff]" />
              <span>Organizer: <strong className="text-white">{tournament.organizer || 'MJ ESPORTS Official'}</strong></span>
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1.5 font-mono text-[#00ff9d]">
              <Clock className="w-4 h-4" />
              <span>Live Start: {tournament.startDate} ({tournament.startTime || '06:00 PM IST'})</span>
            </span>
          </div>
        </div>

        {/* 2. REGISTRATION PROGRESS METER */}
        <div className="p-4 bg-[#07090c] rounded-xl border border-[#3a494b]/60 space-y-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-[#8e9dae] font-bold uppercase">Registration Slot Capacity</span>
            <span className="font-extrabold text-[#00f2ff]">
              {regTeams} / {maxTeams} Squads ({fillPercentage}%)
            </span>
          </div>
          <div className="w-full bg-[#151a21] h-3 rounded-full overflow-hidden p-0.5 border border-[#3a494b]/60">
            <div
              className="bg-gradient-to-r from-[#00f2ff] via-[#00ff9d] to-[#fe6b00] h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,242,255,0.4)]"
              style={{ width: `${fillPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Official Champion Winner Banner (when Completed) */}
        {(tournament.status === 'Completed' || tournament.winnerTeam) && (
          <div className="p-4 bg-[#fe6b00]/10 border-2 border-[#fe6b00] rounded-xl flex items-center justify-between gap-4 shadow-[0_0_25px_rgba(254,107,0,0.25)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#fe6b00] text-slate-950 flex items-center justify-center font-extrabold shadow-md shrink-0">
                <Trophy className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-extrabold text-[#fe6b00] uppercase tracking-widest block">OFFICIAL TOURNAMENT CHAMPION</span>
                <h3 className="font-display-lg text-lg sm:text-xl font-extrabold text-white uppercase">
                  {tournament.winnerTeam || tournament.teamsList?.[0]?.name || 'Grand Champion'}
                </h3>
                {tournament.winnerCaptain && (
                  <p className="text-xs text-[#ffb693]">Captain: <strong>{tournament.winnerCaptain}</strong></p>
                )}
              </div>
            </div>
            <span className="px-3 py-1 bg-[#fe6b00] text-slate-950 text-xs font-extrabold uppercase rounded shadow font-mono">
              TOURNAMENT COMPLETED
            </span>
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="pt-4 flex flex-wrap gap-4">
          <button
            onClick={handleRegisterClick}
            disabled={isRegistrationDisabled}
            className="btn-cyber-primary text-xs flex-1 sm:flex-none justify-center py-3.5 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            <Trophy className="w-4 h-4" />
            <span>
              {isAlreadyRegistered
                ? 'Already Registered'
                : isFull
                ? 'Registration Full'
                : isClosed
                ? 'Registration Closed'
                : 'Register Now'}
            </span>
          </button>
          
          <Link
            to="/live"
            className="px-6 py-3.5 bg-[#07090c] border border-[#3a494b] text-[#00f2ff] hover:bg-[#1d232c] font-bold rounded text-xs flex items-center justify-center gap-2 uppercase tracking-wider transition-colors min-h-[44px] flex-1 sm:flex-none"
          >
            <Radio className="w-4 h-4 text-[#fe6b00]" />
            <span>Watch Live Stream</span>
          </Link>
        </div>
      </div>

      {/* 3. TABS BAR */}
      <div className="flex border-b border-[#3a494b]/60 overflow-x-auto text-xs font-bold uppercase tracking-wider scrollbar-hide">
        {[
          { id: 'overview', label: 'Overview & Details' },
          { id: 'prizes', label: 'Prize Breakdown' },
          { id: 'schedule', label: 'Match Schedule & Timeline' },
          { id: 'standings', label: 'Points Table' },
          { id: 'bracket', label: 'Knockout Bracket' },
          { id: 'teams', label: `Registered Squads (${tournament.teamsList?.length || 0})` },
          { id: 'faqs', label: 'Rules & FAQs' },
        ].map((tab) => (
          <button
            key={`detail-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3.5 border-b-2 transition-all shrink-0 whitespace-nowrap font-mono ${
              activeTab === tab.id
                ? 'border-[#00f2ff] text-[#00f2ff] bg-[#00f2ff]/10 font-extrabold'
                : 'border-transparent text-[#8e9dae] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. TAB CONTENT AREA */}
      <div className="pt-4">
        
        {/* TAB 1: OVERVIEW & DETAILS */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="md:col-span-2 space-y-6">
              
              {/* About Section */}
              <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-3 shadow-xl">
                <h3 className="font-display-lg text-base sm:text-lg font-bold text-white uppercase">About the Tournament</h3>
                <p className="text-[#8e9dae] text-xs leading-relaxed">{tournament.description}</p>
              </div>

              {/* Custom Room Credentials Section */}
              {tournament.roomStatus === 'Published' && (isAlreadyRegistered || isAdmin) ? (
                <div className="bg-[#151a21] border border-[#00f2ff]/60 rounded-xl p-5 sm:p-6 space-y-4 shadow-[0_0_20px_rgba(0,242,255,0.15)]">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display-lg text-base sm:text-lg font-bold text-white flex items-center gap-2 uppercase">
                      <Key className="w-5 h-5 text-[#00f2ff]" />
                      <span>Custom Match Room Credentials</span>
                    </h3>
                    <span className="px-2.5 py-1 rounded bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/40 text-[10px] font-mono font-bold uppercase">
                      Broadcast Live
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-[#07090c] rounded-lg border border-[#3a494b]/60">
                    <div className="space-y-1">
                      <span className="text-[10px] font-label-caps text-[#8e9dae] uppercase tracking-wider block">Room ID</span>
                      <div className="flex items-center justify-between bg-[#151a21] px-3 py-2 rounded border border-[#3a494b]">
                        <span className="font-mono text-base font-extrabold text-[#00f2ff]">{tournament.roomId || 'Not set'}</span>
                        {tournament.roomId && (
                          <button onClick={() => handleCopy(tournament.roomId, 'Room ID')} className="p-1.5 hover:bg-[#3a494b] text-[#00f2ff] rounded">
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-label-caps text-[#8e9dae] uppercase tracking-wider block">Password</span>
                      <div className="flex items-center justify-between bg-[#151a21] px-3 py-2 rounded border border-[#3a494b]">
                        <span className="font-mono text-base font-extrabold text-[#fe6b00]">{tournament.roomPassword || 'Not set'}</span>
                        {tournament.roomPassword && (
                          <button onClick={() => handleCopy(tournament.roomPassword, 'Password')} className="p-1.5 hover:bg-[#3a494b] text-[#fe6b00] rounded">
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-2 shadow-xl">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#b9cacb] uppercase">
                    <Lock className="w-4 h-4 text-[#fe6b00]" />
                    <span>Room Credentials Protected</span>
                  </div>
                  <p className="text-xs text-[#8e9dae] leading-relaxed">
                    Custom Room ID and Password will be published live to registered squad members prior to match start time.
                  </p>
                </div>
              )}

              {/* Tournament Timeline Tracker */}
              <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-4 shadow-xl">
                <h3 className="font-display-lg text-base font-bold text-white uppercase flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#00f2ff]" />
                  <span>Tournament Timeline Stages</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 bg-[#07090c] rounded border border-[#00f2ff]/40 space-y-1">
                    <span className="text-[9px] text-[#00f2ff] uppercase font-bold block">Stage 1</span>
                    <span className="font-bold text-white block">Slot Registration</span>
                    <span className="text-[10px] text-[#00ff9d]">Active Now</span>
                  </div>
                  <div className="p-3 bg-[#07090c] rounded border border-[#3a494b]/40 space-y-1">
                    <span className="text-[9px] text-[#8e9dae] uppercase font-bold block">Stage 2</span>
                    <span className="font-bold text-white block">Roster Verification</span>
                    <span className="text-[10px] text-[#8e9dae]">Upcoming</span>
                  </div>
                  <div className="p-3 bg-[#07090c] rounded border border-[#3a494b]/40 space-y-1">
                    <span className="text-[9px] text-[#8e9dae] uppercase font-bold block">Stage 3</span>
                    <span className="font-bold text-white block">Room Dispatch</span>
                    <span className="text-[10px] text-[#8e9dae]">Upcoming</span>
                  </div>
                  <div className="p-3 bg-[#07090c] rounded border border-[#3a494b]/40 space-y-1">
                    <span className="text-[9px] text-[#8e9dae] uppercase font-bold block">Stage 4</span>
                    <span className="font-bold text-white block">Live Match Operations</span>
                    <span className="text-[10px] text-[#8e9dae]">Upcoming</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Sidebar Summary & Organizer */}
            <div className="space-y-6">
              <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-4 shadow-xl">
                <h3 className="font-label-caps text-xs font-bold text-white uppercase tracking-widest">Tournament Specs</h3>
                <div className="space-y-3 text-xs font-mono">
                  <div className="flex justify-between py-2 border-b border-[#3a494b]/40">
                    <span className="text-[#8e9dae]">Organizer</span>
                    <span className="text-[#00f2ff] font-bold">{tournament.organizer || 'MJ ESPORTS Official'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#3a494b]/40">
                    <span className="text-[#8e9dae]">Game Title</span>
                    <span className="text-[#00f2ff] font-bold">{tournament.game}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#3a494b]/40">
                    <span className="text-[#8e9dae]">Match Mode</span>
                    <span className="text-white font-semibold">{tournament.format}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#3a494b]/40">
                    <span className="text-[#8e9dae]">Prize Pool</span>
                    <span className="text-[#ffb693] font-extrabold">{tournament.prizePool}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#3a494b]/40">
                    <span className="text-[#8e9dae]">Entry Fee</span>
                    <span className="text-[#00ff9d] font-bold">{tournament.entryFee || 'Free'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRIZE BREAKDOWN */}
        {activeTab === 'prizes' && (
          <div className="space-y-6">
            <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-6 space-y-4 shadow-xl">
              <h3 className="font-display-lg text-lg font-bold text-white uppercase flex items-center gap-2">
                <Award className="w-6 h-6 text-[#fe6b00]" />
                <span>Prize Pool Allocation ({tournament.prizePool})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {prizeBreakdown.map((item, idx) => (
                  <div key={`prize-${idx}`} className="p-5 bg-[#07090c] border border-[#3a494b] rounded-xl text-center space-y-2">
                    <span className="text-xs font-mono font-bold text-[#8e9dae] uppercase block">{item.place}</span>
                    <span className="font-display-lg text-2xl font-extrabold text-[#ffb693] block">{item.amount}</span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-extrabold bg-[#fe6b00]/10 text-[#fe6b00] border border-[#fe6b00]/40 inline-block uppercase">
                      {item.share}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MATCH SCHEDULE & TIMELINE */}
        {activeTab === 'schedule' && (
          <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-6 space-y-4 shadow-xl">
            <h3 className="font-display-lg text-lg font-bold text-white uppercase flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#00f2ff]" />
              <span>Match Schedule Timeline</span>
            </h3>
            <div className="space-y-3 font-mono text-xs">
              <div className="p-4 bg-[#07090c] rounded-lg border border-[#3a494b]/60 flex items-center justify-between">
                <div>
                  <span className="text-[#00f2ff] font-bold block uppercase">Group Stage - Round 1</span>
                  <span className="text-[#8e9dae] text-[11px]">{tournament.startDate} @ {tournament.startTime || '06:00 PM IST'}</span>
                </div>
                <span className="px-2 py-1 rounded bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/40 font-bold uppercase text-[10px]">
                  Scheduled
                </span>
              </div>
              <div className="p-4 bg-[#07090c] rounded-lg border border-[#3a494b]/60 flex items-center justify-between">
                <div>
                  <span className="text-[#00f2ff] font-bold block uppercase">Grand Finals - Championship Match</span>
                  <span className="text-[#8e9dae] text-[11px]">{tournament.startDate} @ 08:30 PM IST</span>
                </div>
                <span className="px-2 py-1 rounded bg-[#fe6b00]/10 text-[#fe6b00] border border-[#fe6b00]/40 font-bold uppercase text-[10px]">
                  Upcoming
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: STANDINGS */}
        {activeTab === 'standings' && <PointsTable teams={tournament.teamsList} />}

        {/* TAB 5: KNOCKOUT BRACKET */}
        {activeTab === 'bracket' && <BracketViewer bracket={tournament.bracketData} />}

        {/* TAB 6: REGISTERED SQUADS */}
        {activeTab === 'teams' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {tournament.teamsList && tournament.teamsList.length > 0 ? (
              tournament.teamsList.map((t, idx) => (
                <div key={`squad-${idx}`} className="p-4 bg-[#151a21] border border-[#3a494b]/60 rounded-xl flex flex-col justify-between space-y-3 text-xs shadow-xl">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 uppercase">
                      {t.mode || 'Squad'} Mode
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                      t.status === 'Confirmed' || t.status === 'Approved'
                        ? 'bg-[#00ff9d]/10 text-[#00ff9d] border-[#00ff9d]/40'
                        : 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40'
                    }`}>
                      {t.status || 'Confirmed'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-white text-sm">{t.name}</h4>
                    <p className="text-[#8e9dae] text-[11px]">Captain: <strong className="text-[#e1e2e7]">{t.captain}</strong></p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full p-8 text-center bg-[#151a21] border border-[#3a494b] rounded-xl text-[#8e9dae] text-xs">
                No teams registered yet. Be the first squad to book a slot!
              </div>
            )}
          </div>
        )}

        {/* TAB 7: RULES & FAQS */}
        {activeTab === 'faqs' && (
          <div className="space-y-6">
            <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-6 space-y-4 shadow-xl">
              <h3 className="font-display-lg text-lg font-bold text-white uppercase flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#00f2ff]" />
                <span>Frequently Asked Questions</span>
              </h3>
              <div className="space-y-3">
                {faqs.map((faq, idx) => (
                  <div key={`faq-${idx}`} className="bg-[#07090c] border border-[#3a494b]/60 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setOpenFaqIndex(openFaqIndex === idx ? -1 : idx)}
                      className="w-full p-4 text-left text-xs font-bold text-white uppercase flex justify-between items-center hover:text-[#00f2ff]"
                    >
                      <span>{faq.q}</span>
                      {openFaqIndex === idx ? <ChevronUp className="w-4 h-4 text-[#00f2ff]" /> : <ChevronDown className="w-4 h-4 text-[#8e9dae]" />}
                    </button>
                    {openFaqIndex === idx && (
                      <div className="p-4 pt-0 text-xs text-[#8e9dae] leading-relaxed border-t border-[#3a494b]/40">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Slot Booking Modal */}
      {showSlotModal && (
        <SlotBookingModal
          tournament={tournament}
          onClose={() => setShowSlotModal(false)}
        />
      )}

    </div>
  )
}
