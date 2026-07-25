import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Trophy, Calendar, Clock, Users, ShieldCheck, Swords, Radio, ArrowLeft, Gamepad2, CheckCircle2 } from 'lucide-react'
import { useTournaments } from '../contexts/TournamentContext'
import { useAuth } from '../contexts/AuthContext'
import SlotBookingModal from '../components/tournament/SlotBookingModal'
import PointsTable from '../components/bracket/PointsTable'
import BracketViewer from '../components/bracket/BracketViewer'

export default function TournamentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getTournamentById, isUserRegistered } = useTournaments()
  const { user, isAuthenticated } = useAuth()

  const tournament = getTournamentById(id)

  const [activeTab, setActiveTab] = useState('overview')
  const [showSlotModal, setShowSlotModal] = useState(false)

  if (!tournament) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
        <h2 className="text-2xl font-bold text-white">Tournament Not Found</h2>
        <p className="text-xs text-slate-400">The tournament ID you requested does not exist or has been removed.</p>
        <Link to="/tournaments" className="inline-block px-4 py-2.5 bg-purple-600 text-white font-bold rounded-xl text-xs">
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
      <Link to="/tournaments" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to All Tournaments</span>
      </Link>

      {/* Hero Banner Card */}
      <div className="p-5 sm:p-10 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide bg-slate-950 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 shrink-0">
            <Gamepad2 className="w-4 h-4" />
            {tournament.game}
          </span>
          
          {/* Registration Status Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            {isAlreadyRegistered && (
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>You Are Registered</span>
              </span>
            )}

            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shrink-0 ${
              tournament.status === 'Live Now'
                ? 'bg-red-950 text-red-400 border-red-800'
                : tournament.status === 'Registration Open'
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                : 'bg-purple-950 text-purple-400 border-purple-800'
            }`}>
              {tournament.status}
            </span>
          </div>
        </div>

        {/* Tournament Name & Organizer */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-5xl font-extrabold text-white tracking-tight uppercase leading-tight">
            {tournament.title}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl flex items-center gap-2 flex-wrap">
            <span>{tournament.format}</span>
            <span>&bull;</span>
            <span>Organizer: <strong className="text-purple-400">{tournament.organizer || 'MJ ESPORTS Official'}</strong></span>
          </p>
        </div>

        {/* Detail Fields Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 border-t border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Game</span>
            <span className="text-cyan-300 font-extrabold text-sm sm:text-base">{tournament.game}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Mode</span>
            <span className="text-white font-extrabold text-sm sm:text-base">{tournament.format}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Prize Pool</span>
            <span className="text-emerald-400 font-extrabold text-sm sm:text-base">{tournament.prizePool}</span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Slots</span>
            <span className="text-purple-300 font-extrabold text-sm sm:text-base">{tournament.registeredTeams} / {tournament.maxTeams}</span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Date & Time</span>
            <span className="text-slate-200 font-bold text-xs flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3 text-purple-400 shrink-0" />
              {tournament.startDate} ({tournament.startTime || '06:00 PM IST'})
            </span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="pt-4 flex flex-wrap gap-4">
          <button
            onClick={handleRegisterClick}
            disabled={isRegistrationDisabled}
            className="px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 text-slate-950 font-extrabold rounded-xl hover:brightness-110 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs flex items-center justify-center gap-2 min-h-[44px] flex-1 sm:flex-none"
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
            className="px-6 py-3.5 sm:py-4 bg-slate-950 border border-slate-800 text-purple-300 hover:text-white font-bold rounded-xl transition-colors text-xs flex items-center justify-center gap-2 min-h-[44px] flex-1 sm:flex-none"
          >
            <Radio className="w-4 h-4 text-red-500" />
            <span>Watch Live Stream</span>
          </Link>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 overflow-x-auto text-xs font-bold uppercase tracking-wider no-scrollbar">
        {[
          { id: 'overview', label: 'Overview & Rules' },
          { id: 'standings', label: 'Points Table' },
          { id: 'bracket', label: 'Knockout Bracket' },
          { id: 'teams', label: `Registered Teams (${tournament.teamsList?.length || 0})` },
        ].map((tab) => (
          <button
            key={`detail-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 sm:px-6 py-3.5 sm:py-4 border-b-2 transition-colors shrink-0 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-purple-500 text-purple-400 bg-purple-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
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
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-white">About the Tournament</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{tournament.description}</p>
              </div>

              {/* Tournament Rules List */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>Official Tournament Rules</span>
                </h3>
                <ul className="space-y-2 text-xs text-slate-300 list-disc pl-5">
                  {tournament.rules?.map((rule, idx) => (
                    <li key={`rule-${idx}`} className="leading-relaxed">{rule}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sidebar Summary */}
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Tournament Summary</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Organizer</span>
                    <span className="text-purple-400 font-bold">{tournament.organizer || 'MJ ESPORTS Official'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Game Title</span>
                    <span className="text-cyan-400 font-bold">{tournament.game}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Match Mode</span>
                    <span className="text-slate-200 font-semibold">{tournament.format}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Prize Pool</span>
                    <span className="text-emerald-400 font-extrabold">{tournament.prizePool}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Date</span>
                    <span className="text-slate-200 font-semibold">{tournament.startDate}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Time</span>
                    <span className="text-slate-200 font-semibold">{tournament.startTime || '06:00 PM IST'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Status</span>
                    <span className="text-purple-300 font-bold">{tournament.status}</span>
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
                <div key={`squad-${idx}`} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-3 text-xs shadow-xl">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-950 text-purple-300 border border-purple-800/50 uppercase">
                      {t.mode || 'Squad'} Mode
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                      t.status === 'Confirmed' || t.status === 'Approved'
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : t.status === 'Pending'
                        ? 'bg-amber-950 text-amber-400 border-amber-800'
                        : 'bg-red-950 text-red-400 border-red-800'
                    }`}>
                      {t.status || 'Confirmed'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-white text-sm">{t.name}</h4>
                    <p className="text-slate-400 text-[11px]">Captain: <strong className="text-slate-200">{t.captain}</strong></p>
                    {t.freeFireUid && (
                      <p className="text-slate-500 font-mono text-[10px]">UID: <span className="text-cyan-400">{t.freeFireUid}</span></p>
                    )}
                  </div>

                  {t.teammates && t.teammates.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Roster: 1 Captain + {t.teammates.length} Players</span>
                      <span className="font-extrabold text-purple-400">#{idx + 1}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
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
