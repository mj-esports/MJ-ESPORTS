import { Swords, ShieldCheck, Trophy, Users } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-8">
      <div className="space-y-3 max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-full bg-[#00f2ff]/20 border border-[#00f2ff] flex items-center justify-center mx-auto text-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.3)]">
          <Swords className="w-7 h-7" />
        </div>
        <h1 className="font-display-lg text-3xl sm:text-5xl font-extrabold text-white uppercase tracking-tight">
          ABOUT MJ ESPORTS
        </h1>
        <p className="text-[#8e9dae] text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
          MJ ESPORTS is an elite tournament ecosystem engineered to empower competitive gamers, teams, and organizers with automated brackets, instant match schedules, and transparent prize payouts.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-left pt-4">
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-6 space-y-3 shadow-xl">
          <div className="w-10 h-10 rounded-lg bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff]">
            <Trophy className="w-5 h-5" />
          </div>
          <h3 className="font-display-lg text-base font-bold text-white uppercase">Pro Tournaments</h3>
          <p className="text-xs text-[#8e9dae] leading-relaxed">Daily and weekly competitive Free Fire and BGMI matches with real cash prize pools.</p>
        </div>

        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-6 space-y-3 shadow-xl">
          <div className="w-10 h-10 rounded-lg bg-[#fe6b00]/10 border border-[#fe6b00]/30 flex items-center justify-center text-[#fe6b00]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-display-lg text-base font-bold text-white uppercase">Fair Play Engine</h3>
          <p className="text-xs text-[#8e9dae] leading-relaxed">Strict anti-cheat verification, UID tracking, and verified organizer match moderation.</p>
        </div>

        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-6 space-y-3 shadow-xl">
          <div className="w-10 h-10 rounded-lg bg-[#00ff9d]/10 border border-[#00ff9d]/30 flex items-center justify-center text-[#00ff9d]">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-display-lg text-base font-bold text-white uppercase">Squad Management</h3>
          <p className="text-xs text-[#8e9dae] leading-relaxed">Manage squad rosters, captain approvals, and track seasonal leaderboard points.</p>
        </div>
      </div>
    </div>
  )
}
