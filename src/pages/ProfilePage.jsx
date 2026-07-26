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
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#00f2ff]/20 border border-[#00f2ff] flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,242,255,0.3)]">
            <User className="w-7 h-7 sm:w-8 sm:h-8 text-[#00f2ff]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display-lg text-xl sm:text-3xl font-extrabold text-white uppercase">{displayName}</h1>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/40 uppercase tracking-widest">
                PRO VERIFIED
              </span>
            </div>
            <p className="text-xs text-[#8e9dae] flex items-center gap-1.5 mt-1 font-mono">
              <Mail className="w-3.5 h-3.5 text-[#00f2ff]" />
              <span>{email}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-4 py-2.5 bg-[#07090c] rounded border border-[#3a494b] text-[#e1e2e7] font-semibold">
            Status: <span className="text-[#00f2ff] font-bold">Active Competitor</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Game Accounts & Tournament History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Left Column: Game IDs & Team Roster */}
        <div className="space-y-6">
          <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-4 shadow-xl">
            <h3 className="font-display-lg text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-[#00f2ff]" />
              <span>Connected Game Handles</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 bg-[#07090c] rounded border border-[#3a494b]/60">
                <span className="text-[#8e9dae] font-semibold">Free Fire UID</span>
                <span className="font-mono text-[#00f2ff] font-bold">{freeFireUid}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[#07090c] rounded border border-[#3a494b]/60">
                <span className="text-[#8e9dae] font-semibold">BGMI Character UID</span>
                <span className="font-mono text-[#00f2ff] font-bold">519284012</span>
              </div>
            </div>
          </div>

          <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-4 shadow-xl">
            <h3 className="font-display-lg text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#00ff9d]" />
              <span>My Squad Roster</span>
            </h3>
            <div className="p-4 bg-[#07090c] rounded border border-[#3a494b]/60 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-white">Phoenix Squad</span>
                <span className="px-2 py-0.5 rounded bg-[#00f2ff]/10 text-[#00f2ff] text-[10px] font-bold uppercase">Captain</span>
              </div>
              <p className="text-[11px] text-[#8e9dae]">4 Active Players &bull; Free Fire & BGMI Roster</p>
            </div>
          </div>
        </div>

        {/* Right Column: Tournament History & Trophy Case */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-4 shadow-xl">
            <h3 className="font-display-lg text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#fe6b00]" />
              <span>Tournament Participation History</span>
            </h3>

            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#07090c] border-b border-[#3a494b]/60 font-label-caps text-[#8e9dae]">
                    <th className="p-3 pl-4">Tournament</th>
                    <th className="p-3">Game</th>
                    <th className="p-3 text-center">Result</th>
                    <th className="p-3 text-right pr-4">Earnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3a494b]/40">
                  <tr className="hover:bg-[#1d232c]">
                    <td className="p-3 pl-4 font-bold text-white">Free Fire India Championship 2026</td>
                    <td className="p-3 text-[#00f2ff] font-bold">Free Fire</td>
                    <td className="p-3 text-center font-bold text-[#00ff9d]">Rank #1 (Champions)</td>
                    <td className="p-3 text-right pr-4 font-mono font-extrabold text-[#ffb693]">₹5,00,000</td>
                  </tr>
                  <tr className="hover:bg-[#1d232c]">
                    <td className="p-3 pl-4 font-bold text-white">BGMI Champions Cup 2026</td>
                    <td className="p-3 text-[#00f2ff] font-bold">BGMI</td>
                    <td className="p-3 text-center font-bold text-[#00f2ff]">Semi-Finals</td>
                    <td className="p-3 text-right pr-4 font-mono font-extrabold text-[#e1e2e7]">₹1,00,000</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< 768px) */}
            <div className="block md:hidden space-y-3">
              <div className="p-4 bg-[#07090c] rounded-xl border border-[#3a494b]/60 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#00f2ff] font-bold">Free Fire</span>
                  <span className="font-mono font-extrabold text-[#ffb693]">₹5,00,000</span>
                </div>
                <h4 className="font-extrabold text-white">Free Fire India Championship 2026</h4>
                <p className="text-[11px] text-[#00ff9d] font-bold">Result: Rank #1 (Champions)</p>
              </div>

              <div className="p-4 bg-[#07090c] rounded-xl border border-[#3a494b]/60 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#00f2ff] font-bold">BGMI</span>
                  <span className="font-mono font-extrabold text-[#e1e2e7]">₹1,00,000</span>
                </div>
                <h4 className="font-extrabold text-white">BGMI Champions Cup 2026</h4>
                <p className="text-[11px] text-[#00f2ff] font-bold">Result: Semi-Finals</p>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  )
}
