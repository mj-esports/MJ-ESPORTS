import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTournaments } from '../contexts/TournamentContext'
import {
  Trophy,
  ArrowLeft,
  Award,
  ShieldCheck,
  Zap,
  Target,
  Lock,
  Unlock,
  Crosshair,
  Timer
} from 'lucide-react'

export default function AchievementsPage() {
  const { user } = useAuth()
  const { tournaments, isUserRegistered } = useTournaments()
  const [filterTab, setFilterTab] = useState('ALL') // 'ALL' | 'UNLOCKED' | 'LOCKED'

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Neo_Striker'

  // User registered tournaments list
  const userRegistrations = useMemo(() => {
    return tournaments.filter((t) =>
      isUserRegistered(t.id, user?.email || user?.id || user?.user_metadata?.username)
    )
  }, [tournaments, isUserRegistered, user])

  // Pre-configured list of esports achievements (Dynamic unlock statuses based on DB registrations)
  const achievements = useMemo(() => {
    const hasRegistrations = userRegistrations.length > 0
    const wonTournament = userRegistrations.some(
      (t) =>
        t.winnerCaptain?.toLowerCase() === user?.email?.toLowerCase() ||
        t.winner_captain?.toLowerCase() === user?.email?.toLowerCase() ||
        t.winnerTeam?.toLowerCase() === user?.user_metadata?.username?.toLowerCase()
    )

    return [
      {
        id: 'first-blood',
        title: 'First Blood',
        description: 'Confirm your first registered match kill in a tournament lobby.',
        icon: Crosshair,
        color: 'text-[#fe6b00] border-[#fe6b00]/30 bg-[#fe6b00]/10',
        unlocked: hasRegistrations,
        date: hasRegistrations ? 'Recent' : null,
        points: 100
      },
      {
        id: 'winner-winner',
        title: 'Apex Champion',
        description: 'Secure first place in a Battlegrounds Mobile India tournament.',
        icon: Trophy,
        color: 'text-[#fbbf24] border-[#fbbf24]/30 bg-[#fbbf24]/10',
        unlocked: wonTournament,
        date: wonTournament ? 'Recent' : null,
        points: 500
      },
      {
        id: 'survivalist',
        title: 'Survivalist',
        description: 'Stay alive for more than 18 minutes in a single match lobby.',
        icon: Timer,
        color: 'text-[#00ff9d] border-[#00ff9d]/30 bg-[#00ff9d]/10',
        unlocked: hasRegistrations,
        date: hasRegistrations ? 'Recent' : null,
        points: 250
      },
      {
        id: 'fair-play',
        title: 'Honor Code',
        description: 'Complete 5 consecutive tournament lobbies with zero behavior reports.',
        icon: ShieldCheck,
        color: 'text-[#00f2ff] border-[#00f2ff]/30 bg-[#00f2ff]/10',
        unlocked: hasRegistrations,
        date: hasRegistrations ? 'Recent' : null,
        points: 150
      },
      {
        id: 'squad-goals',
        title: 'Squad Goals',
        description: 'Register and play a match with a full roster of 4 teammates.',
        icon: Zap,
        color: 'text-[#a855f7] border-[#a855f7]/30 bg-[#a855f7]/10',
        unlocked: userRegistrations.some((t) => t.teamSize === 4),
        date: userRegistrations.some((t) => t.teamSize === 4) ? 'Recent' : null,
        points: 200
      },
      {
        id: 'mvp-fragger',
        title: 'MVP Fragger',
        description: 'Achieve the highest total kills in a single tournament event.',
        icon: Target,
        color: 'text-[#ec4899] border-[#ec4899]/30 bg-[#ec4899]/10',
        unlocked: false,
        date: null,
        points: 400
      }
    ]
  }, [userRegistrations, user])

  // Filter achievements list
  const filteredAchievements = useMemo(() => {
    return achievements.filter((a) => {
      if (filterTab === 'UNLOCKED') return a.unlocked
      if (filterTab === 'LOCKED') return !a.unlocked
      return true
    })
  }, [achievements, filterTab])

  // Count metrics
  const unlockedCount = useMemo(() => achievements.filter(a => a.unlocked).length, [achievements])
  const progressPercent = useMemo(() => Math.round((unlockedCount / achievements.length) * 100), [unlockedCount, achievements])

  return (
    <div className="bg-[#050505] text-white font-body min-h-screen pb-20 antialiased font-mono text-xs">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* Back Navigation */}
        <div className="flex items-center gap-2">
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 text-[#A0A0A0] hover:text-[#00f2ff] font-bold uppercase transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Profile</span>
          </Link>
        </div>

        {/* Section Title */}
        <div className="border-b border-[#27272a]/60 pb-3">
          <h2 className="font-headline text-lg sm:text-xl font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Award className="w-5 h-5 text-[#fbbf24]" />
            <span>Trophy Cabinet & Badges</span>
          </h2>
          <p className="text-[#A0A0A0] text-[10.5px] mt-1 font-sans">
            Track achievements, claim seasonal rewards, and customize your badge collection for {displayName}.
          </p>
        </div>

        {/* Achievement Progress Header Card */}
        <div className="bg-[#0A0A0A] rounded-2xl p-5 border border-[#27272a] shadow-xl flex flex-col md:flex-row justify-between items-center gap-5">
          <div className="w-full md:w-auto space-y-2 text-center md:text-left">
            <span className="text-[10px] text-[#A0A0A0] block uppercase font-bold tracking-wider">Completion Progress</span>
            <div className="flex items-baseline justify-center md:justify-start gap-1">
              <span className="text-2xl font-black font-headline text-[#fbbf24]">{unlockedCount}</span>
              <span className="text-xs text-[#A0A0A0]">/ {achievements.length} Badges Unlocked</span>
            </div>
          </div>

          <div className="flex-1 w-full max-w-md">
            <div className="flex justify-between text-[10.5px] text-[#A0A0A0] mb-2 font-mono">
              <span>Overall Achievement XP</span>
              <span className="text-[#fbbf24] font-bold">{progressPercent}% Completed</span>
            </div>
            <div className="h-2 w-full bg-[#18181b] rounded-full overflow-hidden border border-[#27272a]">
              <div className="h-full bg-[#fbbf24] transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="flex items-center justify-start bg-[#0A0A0A] p-1 rounded-xl border border-[#27272a] text-[11px] font-bold w-fit">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterTab === 'ALL' ? 'bg-[#fbbf24] text-black font-extrabold' : 'text-[#A0A0A0] hover:text-white'
            }`}
          >
            All Badges
          </button>
          <button
            onClick={() => setFilterTab('UNLOCKED')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterTab === 'UNLOCKED' ? 'bg-[#fbbf24] text-black font-extrabold' : 'text-[#A0A0A0] hover:text-white'
            }`}
          >
            Unlocked
          </button>
          <button
            onClick={() => setFilterTab('LOCKED')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterTab === 'LOCKED' ? 'bg-[#fbbf24] text-black font-extrabold' : 'text-[#A0A0A0] hover:text-white'
            }`}
          >
            Locked
          </button>
        </div>

        {/* Grid List */}
        {filteredAchievements.length === 0 ? (
          <div className="py-16 text-center border border-[#27272a]/60 bg-[#0A0A0A] rounded-2xl p-6 space-y-3 font-sans">
            <Award className="w-10 h-10 text-[#A0A0A0] mx-auto animate-pulse" />
            <p className="text-xs font-bold text-white uppercase">No achievements unlocked yet.</p>
            <p className="text-[10px] text-[#A0A0A0]">
              Complete tournament lobbies and earn wins to unlock badges and awards.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAchievements.map((badge) => {
              const Icon = badge.icon
              return (
                <div
                  key={badge.id}
                  className={`border rounded-2xl p-5 shadow-xl transition-all relative overflow-hidden flex flex-col justify-between min-h-[160px] ${
                    badge.unlocked
                      ? 'bg-[#0A0A0A] border-[#27272a] hover:border-[#fbbf24]/50'
                      : 'bg-[#0A0A0A]/40 border-[#27272a]/40 opacity-60'
                  }`}
                >
                  {/* Badge top elements */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                        badge.unlocked ? badge.color : 'text-[#71717a] border-[#27272a] bg-[#18181b]'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="flex items-center gap-1.5">
                        {badge.unlocked ? (
                          <span className="flex items-center gap-0.5 text-[9px] text-[#fbbf24] font-bold uppercase">
                            <Unlock className="w-3 h-3" />
                            <span>Unlocked</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 text-[9px] text-[#71717a] font-bold uppercase">
                            <Lock className="w-3 h-3" />
                            <span>Locked</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className={`font-headline text-xs font-black uppercase ${badge.unlocked ? 'text-white' : 'text-[#71717a]'}`}>
                        {badge.title}
                      </h4>
                      <p className="text-[10px] text-[#A0A0A0] leading-relaxed font-sans">
                        {badge.description}
                      </p>
                    </div>
                  </div>

                  {/* Badge bottom elements */}
                  <div className="pt-3 border-t border-[#27272a]/30 flex justify-between items-center text-[9px] mt-3">
                    <span className="text-[#A0A0A0]">
                      {badge.unlocked && badge.date ? `Claimed: ${badge.date}` : 'Not unlocked'}
                    </span>
                    <span className={`font-bold px-1.5 py-0.5 rounded ${badge.unlocked ? 'bg-[#fbbf24]/10 text-[#fbbf24]' : 'bg-[#18181b] text-[#71717a]'}`}>
                      +{badge.points} XP
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </main>
    </div>
  )
}
