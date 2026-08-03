import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTournaments } from '../contexts/TournamentContext'
import { useToast } from '../contexts/ToastContext'
import {
  User,
  Copy,
  Trophy,
  Swords,
  Flame,
  Target,
  Edit3,
  ChevronDown,
  CheckCircle2,
  Medal,
  Award,
  ShieldCheck,
  ArrowRight,
  X
} from 'lucide-react'

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const { tournaments, isUserRegistered } = useTournaments()
  const { showSuccess, showError } = useToast()

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const [uidInput, setUidInput] = useState('')
  const [avatarInput, setAvatarInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Esports Player'
  const freeFireUid = user?.user_metadata?.freeFireUid || user?.user_metadata?.game_uid || '1092837482'
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.avatarUrl || ''

  // Current active / registered tournaments
  const userRegistrations = useMemo(() => {
    return tournaments.filter((t) =>
      isUserRegistered(t.id, user?.email || user?.id || user?.user_metadata?.username)
    )
  }, [tournaments, isUserRegistered, user])

  const currentTournament = userRegistrations[0] || null

  // Statistics calculation
  const stats = useMemo(() => {
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
    }
  }, [userRegistrations])

  const handleCopyUid = () => {
    if (!freeFireUid) return
    navigator.clipboard.writeText(freeFireUid)
    showSuccess(`Game UID ${freeFireUid} copied!`, 'Copied')
  }

  const openEditModal = () => {
    setUsernameInput(displayName)
    setUidInput(freeFireUid)
    setAvatarInput(avatarUrl)
    setIsEditModalOpen(true)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      if (updateProfile) {
        await updateProfile({
          username: usernameInput,
          freeFireUid: uidInput,
          avatar_url: avatarInput,
        })
      }
      showSuccess('Profile updated successfully!', 'Saved')
      setIsEditModalOpen(false)
    } catch (err) {
      showError(err.message || 'Failed to update profile', 'Update Error')
    } finally {
      setIsSaving(false)
    }
  }

  const achievementBadges = [
    { name: 'Verified Competitor', icon: ShieldCheck, color: 'text-[#00ff9d] bg-[#00ff9d]/10 border-[#00ff9d]/40' },
    { name: 'Apex Fragger', icon: Flame, color: 'text-[#fe6b00] bg-[#fe6b00]/10 border-[#fe6b00]/40' },
    { name: 'Tournament Winner', icon: Trophy, color: 'text-[#ffb693] bg-[#ffb693]/10 border-[#ffb693]/40' },
    { name: 'Fair Play Certified', icon: Award, color: 'text-[#00f2ff] bg-[#00f2ff]/10 border-[#00f2ff]/40' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 isolate relative">

      {/* 1. HEADER: PHOTO, PLAYER NAME, UID & EDIT BUTTON */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
          {/* Profile Photo */}
          <div className="w-20 h-20 rounded-full bg-[#00f2ff]/20 border-2 border-[#00f2ff] flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,242,255,0.35)] overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-[#00f2ff]" />
            )}
          </div>

          <div className="space-y-1">
            {/* Player Name */}
            <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
              <h1 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight">
                {displayName}
              </h1>
              <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/40 uppercase tracking-widest flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> VERIFIED
              </span>
            </div>

            {/* Game UID */}
            <div className="flex items-center gap-2 justify-center sm:justify-start font-mono text-xs text-[#8e9dae]">
              <span>UID: <strong className="text-[#00f2ff]">{freeFireUid}</strong></span>
              <button
                onClick={handleCopyUid}
                title="Copy UID"
                className="p-1 hover:bg-[#07090c] rounded text-[#00f2ff] transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Edit Profile Button */}
        <button
          onClick={openEditModal}
          className="btn-cyber-primary text-xs w-full sm:w-auto min-h-[44px] shrink-0"
        >
          <Edit3 className="w-4 h-4" />
          <span>Edit Profile</span>
        </button>
      </div>

      {/* 2. CURRENT TOURNAMENT */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 sm:p-5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-2.5">
          <h2 className="font-display-lg text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#fe6b00]" />
            <span>CURRENT TOURNAMENT</span>
          </h2>
          <span className="text-[10px] font-mono text-[#00ff9d] font-bold">
            {currentTournament ? 'ACTIVE MATCH' : 'NO MATCH JOINED'}
          </span>
        </div>

        {currentTournament ? (
          <div className="p-3.5 bg-[#07090c] rounded-lg border border-[#00f2ff]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30">
                {currentTournament.game}
              </span>
              <h3 className="font-extrabold text-white text-sm uppercase">{currentTournament.title}</h3>
              <p className="text-xs text-[#8e9dae]">Prize Pool: <strong className="text-[#ffb693]">{currentTournament.prizePool}</strong></p>
            </div>

            <Link
              to={`/tournaments/${currentTournament.id}`}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#00f2ff] text-[#00363a] font-extrabold text-xs hover:bg-[#74f5ff] transition-all flex items-center justify-center gap-1.5 uppercase min-h-[44px] shrink-0"
            >
              <span>View Match Room</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="p-4 bg-[#07090c] rounded-lg border border-[#3a494b]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <p className="text-xs text-[#8e9dae]">You are not currently registered in any active tournament.</p>
            <Link to="/tournaments" className="btn-cyber-primary text-xs shrink-0 min-h-[44px] w-full sm:w-auto">
              Browse Tournaments
            </Link>
          </div>
        )}
      </div>

      {/* 3. STATISTICS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 text-center space-y-1 shadow-lg">
          <span className="text-[10px] text-[#8e9dae] uppercase block flex items-center justify-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-[#00ff9d]" /> Wins
          </span>
          <span className="font-display-lg text-2xl font-extrabold text-[#00ff9d] block">{stats.wins}</span>
        </div>

        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 text-center space-y-1 shadow-lg">
          <span className="text-[10px] text-[#8e9dae] uppercase block flex items-center justify-center gap-1">
            <Swords className="w-3.5 h-3.5 text-[#00f2ff]" /> Matches
          </span>
          <span className="font-display-lg text-2xl font-extrabold text-white block">{stats.matchesPlayed}</span>
        </div>

        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 text-center space-y-1 shadow-lg">
          <span className="text-[10px] text-[#8e9dae] uppercase block flex items-center justify-center gap-1">
            <Flame className="w-3.5 h-3.5 text-[#fe6b00]" /> Kills
          </span>
          <span className="font-display-lg text-2xl font-extrabold text-[#fe6b00] block">{stats.kills}</span>
        </div>

        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-4 text-center space-y-1 shadow-lg">
          <span className="text-[10px] text-[#8e9dae] uppercase block flex items-center justify-center gap-1">
            <Target className="w-3.5 h-3.5 text-[#ffb693]" /> Win Rate
          </span>
          <span className="font-display-lg text-2xl font-extrabold text-[#ffb693] block">{stats.winRate}</span>
        </div>
      </div>

      {/* 4. EXPANDABLE SECONDARY INFORMATION */}
      <div className="space-y-3">
        {/* Secondary Info 1: Tournament History (Collapsible) */}
        <details className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl group overflow-hidden transition-all shadow-md">
          <summary className="p-4 cursor-pointer font-display-lg text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between select-none hover:text-[#00f2ff]">
            <span className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#00f2ff]" />
              <span>Tournament Participation History ({userRegistrations.length})</span>
            </span>
            <ChevronDown className="w-4 h-4 text-[#8e9dae] transition-transform group-open:rotate-180" />
          </summary>

          <div className="p-4 pt-0 border-t border-[#3a494b]/40">
            {userRegistrations.length === 0 ? (
              <p className="text-xs text-[#8e9dae] py-3 text-center">No past tournament participation records found.</p>
            ) : (
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-[#07090c] border-b border-[#3a494b]/60 text-[#00f2ff]">
                      <th className="p-2.5">Tournament</th>
                      <th className="p-2.5">Game</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5 text-right">Prize Pool</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3a494b]/40">
                    {userRegistrations.map((t) => (
                      <tr key={`profile-hist-${t.id}`} className="hover:bg-[#1d232c]">
                        <td className="p-2.5 font-bold text-white">{t.title}</td>
                        <td className="p-2.5 text-[#00f2ff]">{t.game}</td>
                        <td className="p-2.5 text-center text-[#00ff9d]">{t.status}</td>
                        <td className="p-2.5 text-right text-[#ffb693]">{t.prizePool}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </details>

        {/* Secondary Info 2: Player Achievements & Badges (Collapsible) */}
        <details className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl group overflow-hidden transition-all shadow-md">
          <summary className="p-4 cursor-pointer font-display-lg text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between select-none hover:text-[#00f2ff]">
            <span className="flex items-center gap-2">
              <Medal className="w-4 h-4 text-[#ffb693]" />
              <span>Player Achievements & Badges ({achievementBadges.length})</span>
            </span>
            <ChevronDown className="w-4 h-4 text-[#8e9dae] transition-transform group-open:rotate-180" />
          </summary>

          <div className="p-4 pt-2 border-t border-[#3a494b]/40">
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-3">
              {achievementBadges.map((badge, idx) => {
                const Icon = badge.icon
                return (
                  <div key={`badge-item-${idx}`} className={`p-3 rounded-xl border ${badge.color} flex items-center gap-2.5`}>
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-[11px] font-extrabold uppercase font-mono truncate">{badge.name}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </details>
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#151a21] border border-[#00f2ff]/40 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
              <h3 className="font-display-lg text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#00f2ff]" />
                <span>EDIT PLAYER PROFILE</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-[#8e9dae] hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-[#8e9dae] uppercase font-bold block">Display Player Name</label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="input-cyber w-full"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#8e9dae] uppercase font-bold block">Free Fire / Game UID</label>
                <input
                  type="text"
                  value={uidInput}
                  onChange={(e) => setUidInput(e.target.value)}
                  className="input-cyber w-full"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#8e9dae] uppercase font-bold block">Avatar Photo URL</label>
                <input
                  type="url"
                  value={avatarInput}
                  onChange={(e) => setAvatarInput(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="input-cyber w-full"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-[#07090c] border border-[#3a494b] text-[#8e9dae] hover:text-white rounded-lg uppercase font-bold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-cyber-primary uppercase font-bold min-h-[44px]"
                >
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
