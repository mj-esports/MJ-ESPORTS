import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTournaments } from '../contexts/TournamentContext'
import {
  Trophy,
  Flame,
  ArrowLeft,
  Gamepad2,
  Activity,
  Award,
  ShieldCheck,
  TrendingUp,
  User,
  Users
} from 'lucide-react'

export default function StatisticsPage() {
  const { user } = useAuth()
  const { tournaments, isUserRegistered } = useTournaments()
  const [activeGameTab, setActiveGameTab] = useState('BGMI')

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Neo_Striker'

  // User registered tournaments count
  const userRegistrations = useMemo(() => {
    return tournaments.filter((t) =>
      isUserRegistered(t.id, user?.email || user?.id || user?.user_metadata?.username)
    )
  }, [tournaments, isUserRegistered, user])

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
            <Activity className="w-5 h-5 text-[#00f2ff]" />
            <span>Player Telemetry & Stats</span>
          </h2>
          <p className="text-[#A0A0A0] text-[10.5px] mt-1 font-sans">
            Real-time combat metrics, leaderboard rankings, and competitive win ratios for {displayName}.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Rank & Tier Summary Card */}
          <div className="col-span-12 md:col-span-5 space-y-6">
            <div className="bg-[#0A0A0A] rounded-2xl p-6 border border-[#27272a] shadow-xl relative overflow-hidden group">
              <h3 className="font-headline font-bold text-xs text-[#A0A0A0] uppercase tracking-wider mb-4">Rank Tier</h3>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff]">
                  <Trophy className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-lg font-black font-headline text-[#00f2ff]">GRANDMASTER I</div>
                  <div className="text-xs text-[#A0A0A0] mt-0.5">Top 0.5% Global</div>
                </div>
              </div>
              <div className="mt-5">
                <div className="flex justify-between text-[11px] text-[#A0A0A0] mb-2">
                  <span>Season RP</span>
                  <span className="text-[#00f2ff] font-bold">8,450 / 10,000</span>
                </div>
                <div className="h-1.5 w-full bg-[#18181b] rounded-full overflow-hidden border border-[#27272a]">
                  <div className="h-full bg-[#00f2ff] w-[84.5%]" style={{ width: '84.5%' }}></div>
                </div>
              </div>
            </div>

            <div className="bg-[#0A0A0A] rounded-2xl p-6 border border-[#27272a] shadow-xl">
              <h3 className="font-headline font-bold text-xs text-[#A0A0A0] uppercase tracking-wider mb-4">Overall Performance</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-[#09090b] p-3.5 rounded-xl border border-[#27272a]">
                  <span className="text-[10px] text-[#A0A0A0] block uppercase font-bold">Win Rate</span>
                  <span className="text-lg font-black text-white">68.4%</span>
                </div>
                <div className="bg-[#09090b] p-3.5 rounded-xl border border-[#27272a]">
                  <span className="text-[10px] text-[#A0A0A0] block uppercase font-bold">K/D Ratio</span>
                  <span className="text-lg font-black text-[#00ff9d]">4.2</span>
                </div>
                <div className="bg-[#09090b] p-3.5 rounded-xl border border-[#27272a]">
                  <span className="text-[10px] text-[#A0A0A0] block uppercase font-bold">Lobbies</span>
                  <span className="text-lg font-black text-white">{userRegistrations.length || 12}</span>
                </div>
                <div className="bg-[#09090b] p-3.5 rounded-xl border border-[#27272a]">
                  <span className="text-[10px] text-[#A0A0A0] block uppercase font-bold">MVPs</span>
                  <span className="text-lg font-black text-[#fe6b00]">4</span>
                </div>
              </div>
            </div>
          </div>

          {/* Game breakdown panel */}
          <div className="col-span-12 md:col-span-7 space-y-6">
            <div className="bg-[#0A0A0A] rounded-2xl p-1.5 border border-[#27272a] flex gap-2">
              <button
                onClick={() => setActiveGameTab('BGMI')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeGameTab === 'BGMI'
                    ? 'bg-[#18181b] border border-[#00f2ff]/40 text-[#00f2ff]'
                    : 'text-[#A0A0A0] hover:text-white'
                }`}
              >
                <Gamepad2 className="w-4 h-4" />
                <span>BGMI</span>
              </button>

              <button
                onClick={() => setActiveGameTab('FREE FIRE')}
                className={`flex-1 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeGameTab === 'FREE FIRE'
                    ? 'bg-[#18181b] border border-[#fe6b00]/40 text-[#fe6b00]'
                    : 'text-[#A0A0A0] hover:text-white'
                }`}
              >
                <Flame className="w-4 h-4" />
                <span>Free Fire MAX</span>
              </button>
            </div>

            <div className="bg-[#0A0A0A] rounded-2xl p-6 border border-[#27272a] shadow-xl space-y-6">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <h4 className="text-base font-headline font-black text-white uppercase">
                    {activeGameTab === 'BGMI' ? 'Battlegrounds Mobile India' : 'Free Fire MAX Pro League'}
                  </h4>
                  <p className="text-[#A0A0A0] text-xs">Role: Assaulter / Team Captain</p>
                </div>
                <div className="text-right text-xs">
                  <span className="block font-bold text-white">Top 500 Global</span>
                  <span className="block text-[#fe6b00] font-bold">Conqueror Tier</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-[#09090b] p-4 rounded-xl border border-[#27272a]">
                  <span className="text-[9px] text-[#A0A0A0] uppercase block">Headshots</span>
                  <span className="text-base font-bold text-white">42.8%</span>
                </div>
                <div className="bg-[#09090b] p-4 rounded-xl border border-[#27272a]">
                  <span className="text-[9px] text-[#A0A0A0] uppercase block">Avg Survive</span>
                  <span className="text-base font-bold text-white">18m 42s</span>
                </div>
                <div className="bg-[#09090b] p-4 rounded-xl border border-[#27272a]">
                  <span className="text-[9px] text-[#A0A0A0] uppercase block">Max Kills</span>
                  <span className="text-base font-bold text-[#00f2ff]">24</span>
                </div>
              </div>

              <div className="p-4 bg-[#09090b] border border-[#27272a] rounded-xl flex items-center justify-between text-[11px]">
                <span className="text-[#A0A0A0]">Average Match Rating</span>
                <span className="text-[#00ff9d] font-bold">9.2 / 10 &bull; S-Tier</span>
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  )
}
