import { useState } from 'react'
import { Swords, ShieldCheck, Trophy, Users, Mail, FileText, Lock, Building2 } from 'lucide-react'

export default function AboutPage() {
  const [activeTab, setActiveTab] = useState('about') // 'about' | 'privacy' | 'terms' | 'contact'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      
      {/* Header Banner */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="w-14 h-14 rounded-full bg-[#00f2ff]/20 border border-[#00f2ff] flex items-center justify-center mx-auto text-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.3)]">
          <Swords className="w-7 h-7" />
        </div>
        <h1 className="font-display-lg text-3xl sm:text-5xl font-extrabold text-white uppercase tracking-tight">
          MJ ESPORTS ARENA
        </h1>
        <p className="text-[#8e9dae] text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
          India's premier tournament platform engineered for competitive gamers, teams, and organizers.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-[#3a494b]/60 overflow-x-auto text-xs font-bold uppercase tracking-wider justify-center font-mono">
        {[
          { id: 'about', label: 'About Platform', icon: Swords },
          { id: 'privacy', label: 'Privacy Policy', icon: Lock },
          { id: 'terms', label: 'Terms of Service', icon: FileText },
          { id: 'contact', label: 'Support & Contact', icon: Mail },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={`about-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 border-b-2 transition-all shrink-0 flex items-center gap-2 ${
                isActive
                  ? 'border-[#00f2ff] text-[#00f2ff] bg-[#00f2ff]/10 font-extrabold'
                  : 'border-transparent text-[#8e9dae] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl mx-auto pt-2">
        {activeTab === 'about' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-6 space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded-lg bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff]">
                <Trophy className="w-5 h-5" />
              </div>
              <h3 className="font-display-lg text-base font-bold text-white uppercase">Pro Tournaments</h3>
              <p className="text-xs text-[#8e9dae] leading-relaxed">Daily and weekly competitive Free Fire MAX and BGMI Mobile matches with real prize pools.</p>
            </div>

            <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-6 space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded-lg bg-[#fe6b00]/10 border border-[#fe6b00]/30 flex items-center justify-center text-[#fe6b00]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-display-lg text-base font-bold text-white uppercase">Fair Play Engine</h3>
              <p className="text-xs text-[#8e9dae] leading-relaxed">Strict anti-cheat verification, character UID tracking, and verified organizer match moderation.</p>
            </div>

            <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-6 space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded-lg bg-[#00ff9d]/10 border border-[#00ff9d]/30 flex items-center justify-center text-[#00ff9d]">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-display-lg text-base font-bold text-white uppercase">Squad Management</h3>
              <p className="text-xs text-[#8e9dae] leading-relaxed">Manage squad rosters, captain approvals, and track seasonal leaderboard points.</p>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-6 sm:p-8 space-y-4 text-xs text-[#e1e2e7] leading-relaxed text-left shadow-xl">
            <h2 className="font-display-lg text-lg font-bold text-white uppercase border-b border-[#3a494b]/60 pb-3">
              PRIVACY POLICY
            </h2>
            <p>
              MJ ESPORTS is committed to protecting user privacy. We collect player account information (username, email, character game UID) strictly to facilitate tournament slot bookings, custom room credentials dispatch, and prize winnings distribution.
            </p>
            <h3 className="font-bold text-white uppercase">Data Security & Encryption</h3>
            <p>
              All user data is encrypted in transit and stored securely using Supabase database infrastructure with Row Level Security (RLS) policies enabled.
            </p>
          </div>
        )}

        {activeTab === 'terms' && (
          <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-6 sm:p-8 space-y-4 text-xs text-[#e1e2e7] leading-relaxed text-left shadow-xl">
            <h2 className="font-display-lg text-lg font-bold text-white uppercase border-b border-[#3a494b]/60 pb-3">
              TERMS OF SERVICE
            </h2>
            <p>
              By registering an account or participating in MJ ESPORTS tournaments, players agree to follow official esports fair play rules. Emulators, third-party auto-aim scripts, or false game UIDs result in immediate disqualification and account suspension.
            </p>
            <h3 className="font-bold text-white uppercase">Tournament Fees & Payouts</h3>
            <p>
              Tournament entry fees are non-refundable after match room creation. Prize pool winnings are disbursed to verified team captains within 24 hours of official referee score confirmation.
            </p>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-6 sm:p-8 space-y-6 text-xs text-[#e1e2e7] text-left shadow-xl">
            <h2 className="font-display-lg text-lg font-bold text-white uppercase border-b border-[#3a494b]/60 pb-3">
              OFFICIAL SUPPORT & CONTACT
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#07090c] rounded-lg border border-[#3a494b]/60 space-y-1">
                <span className="text-[#8e9dae] font-bold uppercase text-[10px] block">Support Email</span>
                <a href="mailto:support.mjesports@gmail.com" className="text-[#00f2ff] font-mono font-bold hover:underline">
                  support.mjesports@gmail.com
                </a>
              </div>

              <div className="p-4 bg-[#07090c] rounded-lg border border-[#3a494b]/60 space-y-1">
                <span className="text-[#8e9dae] font-bold uppercase text-[10px] block">Business Inquiries</span>
                <span className="text-white font-mono font-bold block">partnerships.mjesports@gmail.com</span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
