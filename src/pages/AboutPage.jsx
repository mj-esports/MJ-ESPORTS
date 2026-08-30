import { useState, useEffect } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { Swords, ShieldCheck, Trophy, Users, Mail, FileText, Lock } from 'lucide-react'

export default function AboutPage({ defaultTab = 'about' }) {
  const location = useLocation()
  const [searchParams] = useSearchParams()

  const resolveInitialTab = () => {
    if (location.pathname.includes('/privacy')) return 'privacy'
    if (location.pathname.includes('/terms')) return 'terms'
    const tabParam = searchParams.get('tab')
    if (tabParam && ['about', 'privacy', 'terms', 'contact'].includes(tabParam)) {
      return tabParam
    }
    return defaultTab || 'about'
  }

  const [activeTab, setActiveTab] = useState(resolveInitialTab)

  useEffect(() => {
    setActiveTab(resolveInitialTab())
  }, [location.pathname, searchParams, defaultTab])

  const tabs = [
    { id: 'about', label: 'Platform & Rules', icon: Swords },
    { id: 'privacy', label: 'Privacy Policy', icon: Lock },
    { id: 'terms', label: 'Terms of Service', icon: FileText },
    { id: 'contact', label: 'Support & Contact', icon: Mail },
  ]

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8">
      
      {/* Header Banner */}
      <div className="text-center space-y-2.5 max-w-2xl mx-auto">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#00f2ff]/20 border border-[#00f2ff] flex items-center justify-center mx-auto text-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.3)]">
          <Swords className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <h1 className="font-display-lg text-2xl sm:text-4xl md:text-5xl font-extrabold text-white uppercase tracking-tight">
          MJ ESPORTS ARENA
        </h1>
        <p className="text-[#8e9dae] text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
          India's premier tournament platform engineered for competitive gamers, teams, and organizers.
        </p>
      </div>

      {/* Category Navigation (Responsive 2-col on mobile, flex on sm+, NO horizontal clipping) */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2 border-b border-[#27272a] pb-4 font-headline text-xs font-bold uppercase tracking-wider max-w-2xl mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={`about-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2.5 rounded border transition-all duration-200 flex items-center justify-center gap-2 min-h-[44px] cursor-pointer ${
                isActive
                  ? 'border-[#00f2ff] text-[#00363a] bg-[#00f2ff] font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.3)]'
                  : 'border-[#27272a] bg-[#141416] text-[#8e9dae] hover:text-white hover:border-[#3f3f46]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="max-w-4xl mx-auto pt-2">
        {activeTab === 'about' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 text-left">
            <div className="bg-[#141416] border border-[#27272a] rounded p-5 sm:p-6 space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff]">
                <Trophy className="w-5 h-5" />
              </div>
              <h3 className="font-headline text-base font-bold text-white uppercase">Pro Tournaments</h3>
              <p className="text-xs text-[#8e9dae] leading-relaxed">Daily and weekly competitive Free Fire MAX and BGMI Mobile matches with real prize pools.</p>
            </div>

            <div className="bg-[#141416] border border-[#27272a] rounded p-5 sm:p-6 space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded bg-[#ff5e07]/10 border border-[#ff5e07]/30 flex items-center justify-center text-[#ff5e07]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-headline text-base font-bold text-white uppercase">Fair Play Engine</h3>
              <p className="text-xs text-[#8e9dae] leading-relaxed">Strict anti-cheat verification, character UID tracking, and verified organizer match moderation.</p>
            </div>

            <div className="bg-[#141416] border border-[#27272a] rounded p-5 sm:p-6 space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded bg-[#10b981]/10 border border-[#10b981]/30 flex items-center justify-center text-[#10b981]">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-headline text-base font-bold text-white uppercase">Squad Management</h3>
              <p className="text-xs text-[#8e9dae] leading-relaxed">Manage squad rosters, captain approvals, and track seasonal leaderboard points.</p>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="bg-[#141416] border border-[#27272a] rounded p-5 sm:p-8 space-y-4 text-xs sm:text-sm text-[#e1e2e7] leading-relaxed text-left shadow-xl break-words">
            <h2 className="font-headline text-lg sm:text-xl font-bold text-white uppercase border-b border-[#27272a] pb-3 text-[#00f2ff]">
              PRIVACY POLICY
            </h2>
            <p>
              MJ ESPORTS is committed to protecting user privacy. We collect player account information (username, email, character game UID) strictly to facilitate tournament slot bookings, custom room credentials dispatch, and prize winnings distribution.
            </p>
            <h3 className="font-headline font-bold text-white uppercase pt-2">Data Security & Encryption</h3>
            <p>
              All user data is encrypted in transit and stored securely using Supabase database infrastructure with Row Level Security (RLS) policies enabled. We never sell or share player contact details with third-party marketers.
            </p>
            <h3 className="font-headline font-bold text-white uppercase pt-2">In-Game Identity & Verification</h3>
            <p>
              In-game character UIDs and nicknames are publicly displayed on tournament match rosters and official leaderboards for tournament verification purposes.
            </p>
          </div>
        )}

        {activeTab === 'terms' && (
          <div className="bg-[#141416] border border-[#27272a] rounded p-5 sm:p-8 space-y-4 text-xs sm:text-sm text-[#e1e2e7] leading-relaxed text-left shadow-xl break-words">
            <h2 className="font-headline text-lg sm:text-xl font-bold text-white uppercase border-b border-[#27272a] pb-3 text-[#00f2ff]">
              TERMS OF SERVICE
            </h2>
            <p>
              By registering an account or participating in MJ ESPORTS tournaments, players agree to follow official esports fair play rules. Emulators, third-party auto-aim scripts, or false game UIDs result in immediate disqualification and account suspension.
            </p>
            <h3 className="font-headline font-bold text-white uppercase pt-2">Tournament Fees & Payouts</h3>
            <p>
              Tournament entry fees are non-refundable after match room creation. Prize pool winnings are disbursed to verified team captains within 24 hours of official referee score confirmation.
            </p>
            <h3 className="font-headline font-bold text-white uppercase pt-2">Player Conduct</h3>
            <p>
              Toxic behavior, intentional feeding, match-fixing, or harassment will result in immediate bans from all competitive seasons across MJ ESPORTS.
            </p>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="bg-[#141416] border border-[#27272a] rounded p-5 sm:p-8 space-y-6 text-xs sm:text-sm text-[#e1e2e7] text-left shadow-xl break-words">
            <h2 className="font-headline text-lg sm:text-xl font-bold text-white uppercase border-b border-[#27272a] pb-3 text-[#00f2ff]">
              OFFICIAL SUPPORT & CONTACT
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#1c1b1c] rounded border border-[#27272a] space-y-1">
                <span className="text-[#8e9dae] font-bold uppercase text-[10px] block">Support Email</span>
                <a href="mailto:support.mjesports@gmail.com?subject=MJ%20ESPORTS%20Support%20Request" className="text-[#00f2ff] font-mono font-bold hover:underline break-all">
                  support.mjesports@gmail.com
                </a>
              </div>

              <div className="p-4 bg-[#1c1b1c] rounded border border-[#27272a] space-y-1">
                <span className="text-[#8e9dae] font-bold uppercase text-[10px] block">Community & Disputes</span>
                <a href="mailto:support.mjesports@gmail.com?subject=MJ%20ESPORTS%20Match%20Dispute" className="text-[#00f2ff] font-mono font-bold hover:underline break-all">
                  support.mjesports@gmail.com
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
