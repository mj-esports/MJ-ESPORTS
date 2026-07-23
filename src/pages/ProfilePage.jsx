import { useAuth } from '../contexts/AuthContext'
import { User, Mail, Trophy, Shield, Gamepad2, Award, Calendar, ShieldCheck } from 'lucide-react'

export default function ProfilePage() {
  const { user } = useAuth()

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Esports Player'
  const email = user?.email || 'player@example.com'
  const freeFireUid = user?.user_metadata?.freeFireUid || '518920412'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10">
      
      {/* Player Header Banner */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-[2px] shadow-xl shadow-purple-500/20 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <User className="w-7 h-7 sm:w-8 sm:h-8 text-purple-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-3xl font-extrabold text-white">{displayName}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                PRO VERIFIED
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
              <Mail className="w-3.5 h-3.5 text-purple-400" />
              <span>{email}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-4 py-2.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300 font-semibold">
            Status: <span className="text-cyan-400 font-bold">Active Competitor</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Game Accounts & Tournament History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Left Column: Game IDs & Team Roster */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-purple-400" />
              <span>Connected Game Handles</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-semibold">Free Fire UID</span>
                <span className="text-cyan-300 font-bold">{freeFireUid}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-semibold">BGMI Character UID</span>
                <span className="text-cyan-300 font-bold">519284012</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>My Squad Roster</span>
            </h3>
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-white">Phoenix Squad</span>
                <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px] font-bold">Captain</span>
              </div>
              <p className="text-[11px] text-slate-400">4 Active Players &bull; Free Fire & BGMI Roster</p>
            </div>
          </div>
        </div>

        {/* Right Column: Tournament History & Trophy Case */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Tournament Participation History</span>
            </h3>

            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800/80 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-3 pl-4">Tournament</th>
                    <th className="p-3">Game</th>
                    <th className="p-3 text-center">Result</th>
                    <th className="p-3 text-right pr-4">Earnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-3 pl-4 font-bold text-white">Free Fire India Championship 2026</td>
                    <td className="p-3 text-cyan-400">Free Fire</td>
                    <td className="p-3 text-center font-bold text-emerald-400">Rank #1 (Champions)</td>
                    <td className="p-3 text-right pr-4 font-extrabold text-emerald-400">₹5,00,000</td>
                  </tr>
                  <tr className="hover:bg-slate-800/40">
                    <td className="p-3 pl-4 font-bold text-white">BGMI Champions Cup 2026</td>
                    <td className="p-3 text-cyan-400">BGMI</td>
                    <td className="p-3 text-center font-bold text-purple-300">Semi-Finals</td>
                    <td className="p-3 text-right pr-4 font-extrabold text-slate-300">₹1,00,000</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< 768px) */}
            <div className="block md:hidden space-y-3">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-cyan-400 font-bold">Free Fire</span>
                  <span className="font-extrabold text-emerald-400">₹5,00,000</span>
                </div>
                <h4 className="font-extrabold text-white">Free Fire India Championship 2026</h4>
                <p className="text-[11px] text-emerald-400 font-bold">Result: Rank #1 (Champions)</p>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-cyan-400 font-bold">BGMI</span>
                  <span className="font-extrabold text-slate-300">₹1,00,000</span>
                </div>
                <h4 className="font-extrabold text-white">BGMI Champions Cup 2026</h4>
                <p className="text-[11px] text-purple-300 font-bold">Result: Semi-Finals</p>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
