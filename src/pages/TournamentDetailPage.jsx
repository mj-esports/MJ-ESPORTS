import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Trophy, Calendar, Clock, Users, ShieldCheck, Swords, Radio, ArrowLeft, Gamepad2, CheckCircle2 } from 'lucide-react'
import { useTournaments } from '../contexts/TournamentContext'
import { useAuth } from '../contexts/AuthContext'
import { DetailSkeleton } from '../components/common/SkeletonLoader'
import SlotBookingModal from '../components/tournament/SlotBookingModal'
import PointsTable from '../components/bracket/PointsTable'
import BracketViewer from '../components/bracket/BracketViewer'

export default function TournamentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getTournamentById, isUserRegistered, loading } = useTournaments()
  const { user, isAuthenticated } = useAuth()

  const tournament = getTournamentById(id)

  const [activeTab, setActiveTab] = useState('overview')
  const [showSlotModal, setShowSlotModal] = useState(false)

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

  const isFull = (tournament.registeredTeams || 0) >= (tournament.maxTeams || 64)
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8">
      
      {/* Back Button */}
      <Link to="/tournaments" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8e9dae] hover:text-[#00f2ff] uppercase tracking-wider transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Tournaments</span>
      </Link>

      {/* Hero Banner Card */}
      <div className="p-6 sm:p-10 rounded-xl bg-[#151a21] border border-[#3a494b]/60 space-y-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="px-3 py-1 rounded text-xs font-bold uppercase tracking-wider bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 flex items-center gap-1.5 shrink-0">
            <Gamepad2 className="w-4 h-4" />
            {tournament.game}
          </span>
          
          {/* Registration Status Badge */}
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
              {tournament.status}
            </span>
          </div>
        </div>

        {/* Tournament Name & Organizer */}
        <div className="space-y-2">
          <h1 className="font-display-lg text-2xl sm:text-5xl font-extrabold text-white tracking-tight uppercase leading-tight">
            {tournament.title}
          </h1>
          <p className="text-[#8e9dae] text-xs sm:text-sm max-w-2xl flex items-center gap-2 flex-wrap">
            <span>{tournament.format}</span>
            <span>&bull;</span>
            <span>Organizer: <strong className="text-[#00f2ff]">{tournament.organizer || 'MJ ESPORTS Official'}</strong></span>
          </p>
        </div>

        {/* Detail Fields Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 border-t border-[#3a494b]/60 text-xs">
          <div className="bg-[#07090c] p-3 rounded border border-[#3a494b]/60">
            <span className="font-label-caps text-[#8e9dae] text-[10px] uppercase block">Game</span>
            <span className="text-[#00f2ff] font-extrabold text-sm sm:text-base">{tournament.game}</span>
          </div>
          <div className="bg-[#07090c] p-3 rounded border border-[#3a494b]/60">
            <span className="font-label-caps text-[#8e9dae] text-[10px] uppercase block">Mode</span>
            <span className="text-white font-extrabold text-sm sm:text-base">{tournament.format}</span>
          </div>
          <div className="bg-[#07090c] p-3 rounded border border-[#3a494b]/60">
            <span className="font-label-caps text-[#8e9dae] text-[10px] uppercase block">Prize Pool</span>
            <span className="font-mono text-[#ffb693] font-extrabold text-sm sm:text-base">{tournament.prizePool}</span>
          </div>
          <div className="bg-[#07090c] p-3 rounded border border-[#3a494b]/60">
            <span className="font-label-caps text-[#8e9dae] text-[10px] uppercase block">Slots</span>
            <span className="font-mono text-[#00f2ff] font-extrabold text-sm sm:text-base">{tournament.registeredTeams} / {tournament.maxTeams}</span>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-[#07090c] p-3 rounded border border-[#3a494b]/60">
            <span className="font-label-caps text-[#8e9dae] text-[10px] uppercase block">Date & Time</span>
            <span className="text-[#e1e2e7] font-bold text-xs flex items-center gap-1 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" />
              {tournament.startDate} ({tournament.startTime || '06:00 PM IST'})
            </span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="pt-4 flex flex-wrap gap-4">
          <button
            onClick={handleRegisterClick}
            disabled={isRegistrationDisabled}
            className="btn-cyber-primary text-xs flex-1 sm:flex-none justify-center py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Tabs Bar */}
      <div className="flex border-b border-[#3a494b]/60 overflow-x-auto text-xs font-bold uppercase tracking-wider scrollbar-hide">
        {[
          { id: 'overview', label: 'Overview & Rules' },
          { id: 'standings', label: 'Points Table' },
          { id: 'bracket', label: 'Knockout Bracket' },
          { id: 'teams', label: `Registered Teams (${tournament.teamsList?.length || 0})` },
        ].map((tab) => (
          <button
            key={`detail-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3.5 border-b-2 transition-all shrink-0 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[#00f2ff] text-[#00f2ff] bg-[#00f2ff]/10 font-extrabold'
                : 'border-transparent text-[#8e9dae] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pt-4">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-3">
                <h3 className="font-display-lg text-base sm:text-lg font-bold text-white uppercase">About the Tournament</h3>
                <p className="text-[#8e9dae] text-xs leading-relaxed">{tournament.description}</p>
              </div>

              {/* Tournament Rules List */}
              <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-3">
                <h3 className="font-display-lg text-base sm:text-lg font-bold text-white flex items-center gap-2 uppercase">
                  <ShieldCheck className="w-5 h-5 text-[#00ff9d]" />
                  <span>Official Tournament Rules</span>
                </h3>
                <ul className="space-y-2 text-xs text-[#e1e2e7] list-disc pl-5">
                  {tournament.rules?.map((rule, idx) => (
                    <li key={`rule-${idx}`} className="leading-relaxed">{rule}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sidebar Summary */}
            <div className="space-y-6">
              <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-4">
                <h3 className="font-label-caps text-xs font-bold text-white uppercase tracking-widest">Tournament Summary</h3>
                <div className="space-y-3 text-xs">
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
                    <span className="text-[#e1e2e7] font-semibold">{tournament.format}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#3a494b]/40">
                    <span className="text-[#8e9dae]">Prize Pool</span>
                    <span className="font-mono text-[#ffb693] font-extrabold">{tournament.prizePool}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#3a494b]/40">
                    <span className="text-[#8e9dae]">Date</span>
                    <span className="text-[#e1e2e7] font-semibold">{tournament.startDate}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[#3a494b]/40">
                    <span className="text-[#8e9dae]">Time</span>
                    <span className="text-[#e1e2e7] font-semibold">{tournament.startTime || '06:00 PM IST'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-[#8e9dae]">Status</span>
                    <span className="text-[#00f2ff] font-bold">{tournament.status}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'standings' && <PointsTable teams={tournament.teamsList} />}

        {activeTab === 'bracket' && <BracketViewer bracket={tournament.bracketData} />}

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
                        : t.status === 'Pending'
                        ? 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40'
                        : 'bg-red-950 text-red-400 border-red-800'
                    }`}>
                      {t.status || 'Confirmed'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-white text-sm">{t.name}</h4>
                    <p className="text-[#8e9dae] text-[11px]">Captain: <strong className="text-[#e1e2e7]">{t.captain}</strong></p>
                    {t.freeFireUid && (
                      <p className="text-[#8e9dae] font-mono text-[10px]">UID: <span className="text-[#00f2ff]">{t.freeFireUid}</span></p>
                    )}
                  </div>

                  {t.teammates && t.teammates.length > 0 && (
                    <div className="pt-2 border-t border-[#3a494b]/60 text-[10px] text-[#8e9dae] flex items-center justify-between">
                      <span>Roster: 1 Captain + {t.teammates.length} Players</span>
                      <span className="font-mono font-extrabold text-[#00f2ff]">#{idx + 1}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full p-8 text-center bg-[#151a21] border border-[#3a494b] rounded-xl text-[#8e9dae] text-xs">
                No teams registered yet. Be the first squad to book a slot!
              </div>
            )}
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
