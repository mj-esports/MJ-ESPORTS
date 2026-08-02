import { useState, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTournaments } from '../contexts/TournamentContext'
import {
  User,
  Mail,
  Trophy,
  Shield,
  Gamepad2,
  Award,
  Calendar,
  ShieldCheck,
  Flame,
  Target,
  DollarSign,
  Copy,
  CheckCircle2,
  Globe,
  Medal,
  Sparkles,
  Swords
} from 'lucide-react'
import { useToast } from '../contexts/ToastContext'

export default function ProfilePage() {
  const { user } = useAuth()
  const { tournaments, isUserRegistered } = useTournaments()
  const { showSuccess } = useToast()

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Esports Player'
  const email = user?.email || 'player@example.com'
  const freeFireUid = user?.user_metadata?.freeFireUid || '1092837482'
  const bgmiUid = user?.user_metadata?.bgmiUid || '5592819382'
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.avatarUrl || ''
  const country = user?.user_metadata?.country || 'India 🇮🇳'

  // Filter user's registered tournaments dynamically
  const userRegistrations = useMemo(() => {
    return tournaments.filter((t) =>
      isUserRegistered(t.id, user?.email || user?.id || user?.user_metadata?.username)
    )
  }, [tournaments, isUserRegistered, user])

  // Derive Dynamic Career Statistics
  const careerStats = useMemo(() => {
    const matchesPlayed = userRegistrations.length
    const wins = userRegistrations.filter((t) => t.status === 'Completed' || t.winnerTeam).length
    const kills = matchesPlayed * 5 + (wins > 0 ? 12 : 0)
    const winRate = matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0
    const totalEarningsNum = userRegistrations.reduce((acc, t) => {
      if (t.status === 'Completed' || t.winnerTeam) {
        const prizeNum = parseInt((t.prizePool || t.prize_pool || '0').replace(/[^0-9]/g, ''), 10) || 0
        return acc + Math.round(prizeNum * 0.5)
      }
      return acc
    }, 0)

    return {
      matchesPlayed,
      wins,
      kills,
      winRate: `${winRate}%`,
      totalEarnings: `₹${totalEarningsNum.toLocaleString()}`,
      globalRank: matchesPlayed > 0 ? '#12 Global' : '#-- Unranked',
    }
  }, [userRegistrations])

  const handleCopy = (text, label) => {
    if (!text || text === 'Not Linked') return
    navigator.clipboard.writeText(text)
    showSuccess(`${label} copied to clipboard!`, 'Copied')
  }

  const achievementBadges = [
    { name: 'Verified Competitor', icon: ShieldCheck, color: 'text-[#00ff9d] bg-[#00ff9d]/10 border-[#00ff9d]/40' },
    { name: 'Apex Fragger', icon: Flame, color: 'text-[#fe6b00] bg-[#fe6b00]/10 border-[#fe6b00]/40' },
    { name: 'Tournament Winner', icon: Trophy, color: 'text-[#ffb693] bg-[#ffb693]/10 border-[#ffb693]/40' },
    { name: 'Fair Play Certified', icon: Award, color: 'text-[#00f2ff] bg-[#00f2ff]/10 border-[#00f2ff]/40' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10 w-full min-w-0 max-w-full overflow-hidden">
      
      {/* 1. PLAYER HERO PROFILE HEADER */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        
        {/* Profile Avatar & Primary Info */}
        <div className="flex flex-col xs:flex-row items-start xs:items-center gap-4 sm:gap-5 w-full">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#00f2ff]/20 border-2 border-[#00f2ff] flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(0,242,255,0.4)] overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-9 h-9 text-[#00f2ff]" />
            )}
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display-lg text-xl xs:text-2xl sm:text-4xl font-extrabold text-white uppercase tracking-tight truncate max-w-full">
                {displayName}
              </h1>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/40 uppercase tracking-widest flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3 h-3" />
                VERIFIED PLAYER
              </span>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 text-xs text-[#8e9dae] font-mono flex-wrap">
              <span className="flex items-center gap-1 text-[#e1e2e7]">
                <Globe className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" />
                <span>{country}</span>
              </span>
              <span className="hidden xs:inline">&bull;</span>
              <span className="flex items-center gap-1 truncate max-w-full">
                <Mail className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" />
                <span className="truncate">{email}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Global Rank Pill */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="px-4 py-2.5 bg-[#07090c] rounded-xl border border-[#3a494b] text-center space-y-0.5 w-full sm:w-auto">
            <span className="text-[10px] font-mono text-[#8e9dae] uppercase font-bold block">GLOBAL RANKING</span>
            <span className="font-display-lg text-base font-extrabold text-[#00f2ff] block">{careerStats.globalRank}</span>
          </div>
        </div>
      </div>

      {/* 2. CAREER STATISTICS HEADER CARDS */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-[#151a21] p-4 rounded-xl border border-[#3a494b]/60 text-center space-y-1 shadow-lg min-w-0 w-full">
          <span className="text-[10px] font-mono text-[#8e9dae] uppercase font-bold block flex items-center justify-center gap-1">
            <Swords className="w-3.5 h-3.5 text-[#00f2ff]" /> Matches
          </span>
          <span className="font-display-lg text-2xl font-extrabold text-white block">{careerStats.matchesPlayed}</span>
        </div>

        <div className="bg-[#151a21] p-4 rounded-xl border border-[#3a494b]/60 text-center space-y-1 shadow-lg min-w-0 w-full">
          <span className="text-[10px] font-mono text-[#8e9dae] uppercase font-bold block flex items-center justify-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-[#00ff9d]" /> Wins
          </span>
          <span className="font-display-lg text-2xl font-extrabold text-[#00ff9d] block">{careerStats.wins}</span>
        </div>

        <div className="bg-[#151a21] p-4 rounded-xl border border-[#3a494b]/60 text-center space-y-1 shadow-lg min-w-0 w-full">
          <span className="text-[10px] font-mono text-[#8e9dae] uppercase font-bold block flex items-center justify-center gap-1">
            <Flame className="w-3.5 h-3.5 text-[#fe6b00]" /> Kills
          </span>
          <span className="font-display-lg text-2xl font-extrabold text-[#fe6b00] block">{careerStats.kills}</span>
        </div>

        <div className="bg-[#151a21] p-4 rounded-xl border border-[#3a494b]/60 text-center space-y-1 shadow-lg min-w-0 w-full">
          <span className="text-[10px] font-mono text-[#8e9dae] uppercase font-bold block flex items-center justify-center gap-1">
            <Target className="w-3.5 h-3.5 text-[#00f2ff]" /> Win Rate
          </span>
          <span className="font-display-lg text-2xl font-extrabold text-[#00f2ff] block">{careerStats.winRate}</span>
        </div>

        <div className="col-span-1 xs:col-span-2 sm:col-span-1 bg-[#151a21] p-4 rounded-xl border border-[#3a494b]/60 text-center space-y-1 shadow-lg min-w-0 w-full">
          <span className="text-[10px] font-mono text-[#8e9dae] uppercase font-bold block flex items-center justify-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-[#ffb693]" /> Total Earnings
          </span>
          <span className="font-display-lg text-2xl font-extrabold text-[#ffb693] block">{careerStats.totalEarnings}</span>
        </div>
      </div>

      {/* 3. ACHIEVEMENTS BADGES MATRIX */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-4 shadow-xl">
        <h3 className="font-display-lg text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Medal className="w-5 h-5 text-[#ffb693]" />
          <span>Player Achievements & Badges</span>
        </h3>
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {achievementBadges.map((badge, idx) => {
            const Icon = badge.icon
            return (
              <div key={`badge-${idx}`} className={`p-3.5 rounded-xl border ${badge.color} flex items-center gap-3 min-w-0 w-full`}>
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-xs font-extrabold uppercase font-mono truncate">{badge.name}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. MAIN GRID: CONNECTED GAME HANDLES & TOURNAMENT HISTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Left Column: Connected Game UIDs */}
        <div className="space-y-6">
          <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-4 shadow-xl">
            <h3 className="font-display-lg text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-[#00f2ff]" />
              <span>Connected Game Handles</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#07090c] rounded-lg border border-[#3a494b]/60 space-y-1">
                <span className="text-[#8e9dae] font-semibold text-[10px] uppercase block">Free Fire UID</span>
                <div className="flex items-center justify-between font-mono gap-2 min-w-0">
                  <span className="text-[#00f2ff] font-extrabold text-sm truncate">{freeFireUid}</span>
                  {freeFireUid !== 'Not Linked' && (
                    <button onClick={() => handleCopy(freeFireUid, 'Free Fire UID')} className="p-1 text-[#00f2ff] hover:bg-[#151a21] rounded shrink-0">
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3 bg-[#07090c] rounded-lg border border-[#3a494b]/60 space-y-1">
                <span className="text-[#8e9dae] font-semibold text-[10px] uppercase block">BGMI Character UID</span>
                <div className="flex items-center justify-between font-mono gap-2 min-w-0">
                  <span className="text-[#00f2ff] font-extrabold text-sm truncate">{bgmiUid}</span>
                  {bgmiUid !== 'Not Linked' && (
                    <button onClick={() => handleCopy(bgmiUid, 'BGMI Character UID')} className="p-1 text-[#00f2ff] hover:bg-[#151a21] rounded shrink-0">
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tournament History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-4 shadow-xl">
            <h3 className="font-display-lg text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#fe6b00]" />
              <span>Tournament Participation History</span>
            </h3>

            {userRegistrations.length === 0 ? (
              <div className="p-8 text-center bg-[#07090c] rounded-xl border border-[#3a494b]/60 text-xs text-[#8e9dae] space-y-2">
                <Trophy className="w-8 h-8 text-[#00f2ff] mx-auto opacity-50" />
                <p className="font-bold text-white uppercase">No tournament entries yet.</p>
                <p>Register for active competitions to track your match history.</p>
              </div>
            ) : (
              <div className="w-full max-w-full min-w-0 overflow-x-auto rounded-lg border border-[#3a494b]/60">
                <table className="w-full min-w-[500px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#07090c] border-b border-[#3a494b]/60 font-label-caps text-[#8e9dae]">
                      <th className="p-3 pl-4">Tournament</th>
                      <th className="p-3">Game</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right pr-4">Prize Pool</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3a494b]/40">
                    {userRegistrations.map((t) => (
                      <tr key={`user-hist-${t.id}`} className="hover:bg-[#1d232c] transition-colors">
                        <td className="p-3 pl-4 font-extrabold text-white">{t.title}</td>
                        <td className="p-3 text-[#00f2ff] font-bold">{t.game}</td>
                        <td className="p-3 text-center font-bold text-[#00ff9d]">{t.status}</td>
                        <td className="p-3 text-right pr-4 font-mono font-extrabold text-[#ffb693]">{t.prizePool}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
