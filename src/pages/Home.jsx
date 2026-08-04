import { useState, useMemo, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { useTournaments } from '../contexts/TournamentContext'
import { useAuth } from '../contexts/AuthContext'
import {
  Swords,
  Wallet,
  BarChart3,
  HelpCircle,
  Radio,
  Eye,
  Calendar,
  ArrowRight,
  Sparkles,
  Trophy,
  Users
} from 'lucide-react'

const LiveStreamModal = lazy(() => import('../components/stitch/LiveStreamModal'))

export default function Home() {
  const { tournaments } = useTournaments()
  const { user } = useAuth()
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false)

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'PlayerOne'

  // 1. Live Matches Data (Stitch Live Now section)
  const liveMatches = useMemo(() => {
    return tournaments.filter((t) => t.status === 'Live Now')
  }, [tournaments])

  // 2. Featured Tournament Data (Stitch Featured Event section)
  const featuredTournament = useMemo(() => {
    const openTourneys = tournaments.filter((t) => t.status === 'Registration Open')
    if (openTourneys.length > 0) {
      return openTourneys.reduce((max, curr) => {
        const p1 = parseInt((curr.prizePool || curr.prize_pool || '0').replace(/[^0-9]/g, ''), 10) || 0
        const p2 = parseInt((max.prizePool || max.prize_pool || '0').replace(/[^0-9]/g, ''), 10) || 0
        return p1 > p2 ? curr : max
      }, openTourneys[0])
    }
    return tournaments[0] || null
  }, [tournaments])

  return (
    <div className="w-full min-h-screen bg-[#0b1326] text-[#dae2fd] pb-24 font-body antialiased">
      <main className="max-w-7xl mx-auto pt-4 px-4 sm:px-6 lg:px-8 flex flex-col gap-8">

        {/* 1. STITCH WELCOME BANNER CARD */}
        <section className="rounded-xl p-6 sm:p-10 relative overflow-hidden bg-[#131b2e] border border-[#3a494b]/60 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00f2ff]/15 via-transparent to-[#fe6b00]/10 pointer-events-none z-0"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded text-[10px] font-extrabold uppercase tracking-widest bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 font-headline">
                  ELEVATE YOUR GAME
                </span>
                <span className="px-3 py-1 rounded text-[10px] font-extrabold uppercase tracking-widest bg-[#fe6b00]/10 text-[#fe6b00] border border-[#fe6b00]/30 font-headline">
                  FREE FIRE & BGMI
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight font-headline uppercase tracking-tight">
                WELCOME BACK, <br />
                <span className="text-[#00f2ff]">{displayName}</span>
              </h1>
              
              <p className="text-xs sm:text-sm font-normal text-[#b9cacb] max-w-lg">
                Compete in daily tournaments, climb top rank leaderboards, and win real cash rewards.
              </p>

              <div className="flex items-center gap-6 pt-2 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-[#8e9dae] uppercase block font-headline">Total Arena Prize Pool</span>
                  <span className="text-base font-extrabold text-[#00f2ff]">₹50,000+ Pool</span>
                </div>
                <div className="w-px h-8 bg-[#3a494b]/60"></div>
                <div>
                  <span className="text-[10px] text-[#8e9dae] uppercase block font-headline">Active Players</span>
                  <span className="text-base font-extrabold text-white">1,240 Verified</span>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  to="/tournaments"
                  className="bg-[#00f2ff] text-[#00363a] px-6 py-3 rounded-xl font-extrabold text-xs hover:bg-[#74f5ff] transition-all min-h-[44px] inline-flex items-center justify-center shadow-lg font-headline uppercase tracking-wider gap-2"
                >
                  <span>Browse Tournaments</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 2. STITCH CIRCULAR QUICK ACTIONS BAR */}
        <section className="bg-[#131b2e] border border-[#3a494b]/60 rounded-xl p-4 sm:p-5 shadow-xl">
          <div className="grid grid-cols-2 xs:grid-cols-4 gap-4">
            <Link
              to="/tournaments"
              className="flex flex-col items-center justify-center p-3 rounded-lg bg-[#0b1326] border border-[#3a494b]/40 hover:border-[#00f2ff] transition-all group min-h-[72px]"
            >
              <div className="w-10 h-10 rounded-full bg-[#00f2ff]/10 border border-[#00f2ff]/40 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <Swords className="w-5 h-5 text-[#00f2ff]" />
              </div>
              <span className="text-xs font-bold text-[#b9cacb] group-hover:text-white font-headline uppercase tracking-wider">
                Join Battle
              </span>
            </Link>

            <Link
              to="/dashboard"
              className="flex flex-col items-center justify-center p-3 rounded-lg bg-[#0b1326] border border-[#3a494b]/40 hover:border-[#00f2ff] transition-all group min-h-[72px]"
            >
              <div className="w-10 h-10 rounded-full bg-[#fe6b00]/10 border border-[#fe6b00]/40 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <Wallet className="w-5 h-5 text-[#fe6b00]" />
              </div>
              <span className="text-xs font-bold text-[#b9cacb] group-hover:text-white font-headline uppercase tracking-wider">
                Add Funds
              </span>
            </Link>

            <Link
              to="/leaderboard"
              className="flex flex-col items-center justify-center p-3 rounded-lg bg-[#0b1326] border border-[#3a494b]/40 hover:border-[#00f2ff] transition-all group min-h-[72px]"
            >
              <div className="w-10 h-10 rounded-full bg-[#00f2ff]/10 border border-[#00f2ff]/40 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-5 h-5 text-[#00f2ff]" />
              </div>
              <span className="text-xs font-bold text-[#b9cacb] group-hover:text-white font-headline uppercase tracking-wider">
                Rankings
              </span>
            </Link>

            <a
              href="mailto:support.mjesports@gmail.com"
              className="flex flex-col items-center justify-center p-3 rounded-lg bg-[#0b1326] border border-[#3a494b]/40 hover:border-[#00f2ff] transition-all group min-h-[72px]"
            >
              <div className="w-10 h-10 rounded-full bg-[#00f2ff]/10 border border-[#00f2ff]/40 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                <HelpCircle className="w-5 h-5 text-[#00f2ff]" />
              </div>
              <span className="text-xs font-bold text-[#b9cacb] group-hover:text-white font-headline uppercase tracking-wider">
                Get Help
              </span>
            </a>
          </div>
        </section>

        {/* 3. STITCH FEATURED EVENT CARD */}
        <section className="space-y-3">
          <div className="flex justify-between items-end">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white font-headline uppercase tracking-tight">
              FEATURED EVENT
            </h2>
          </div>

          <div className="rounded-xl overflow-hidden group border border-[#3a494b]/60 bg-[#131b2e] shadow-2xl">
            <div className="h-[200px] sm:h-[280px] w-full relative">
              <img
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                alt="Cyberpunk Arena Banner"
                src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1600&q=80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#131b2e] via-[#131b2e]/60 to-transparent"></div>
              <div className="absolute top-4 right-4 bg-[#0b1326]/90 backdrop-blur-md px-3 py-1 rounded-md text-xs font-extrabold text-[#00f2ff] border border-[#00f2ff]/40 font-headline uppercase">
                {featuredTournament?.status || 'Registration Open'}
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-xl font-extrabold text-white font-headline uppercase">
                  {featuredTournament?.title || 'Global Championship Qualifiers'}
                </h3>
                <span className="text-base font-extrabold text-[#00f2ff] font-mono">
                  {featuredTournament?.prizePool || '₹25,000 Prize Pool'}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-[#b9cacb]">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#00f2ff]" />
                  <span>{featuredTournament?.startDate || 'Today 8:00 PM'}</span>
                </div>
                <span>&bull;</span>
                <span>Squad Mode</span>
              </div>

              <Link
                to={featuredTournament ? `/tournaments/${featuredTournament.id}` : '/tournaments'}
                className="w-full bg-[#00f2ff] text-[#00363a] py-3.5 rounded-xl font-extrabold text-xs hover:bg-[#74f5ff] transition-all text-center min-h-[46px] flex items-center justify-center shadow-lg font-headline uppercase tracking-wider gap-1.5"
              >
                <span>Join Tournament</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* 4. STITCH LIVE TOURNAMENTS SECTION */}
        <section className="space-y-3">
          <div className="flex justify-between items-end">
            <h2 className="font-extrabold text-white flex items-center gap-2 text-xl sm:text-2xl font-headline uppercase tracking-tight">
              <span className="w-3 h-3 rounded-full bg-[#ef4444] animate-pulse"></span>
              <span>LIVE NOW</span>
            </h2>
            <Link to="/tournaments" className="text-xs font-bold text-[#00f2ff] hover:underline font-headline uppercase tracking-wider">
              View All
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Live Card 1 */}
            <div className="rounded-xl p-5 flex flex-col justify-between gap-4 bg-[#131b2e] border border-[#3a494b]/60 shadow-xl">
              <div className="flex justify-between items-center text-xs font-bold text-[#b9cacb]">
                <span className="font-headline uppercase">{liveMatches[0]?.title || 'Free Fire Pro Championship'}</span>
                <span className="flex items-center gap-1 text-[#ef4444] font-mono font-extrabold">
                  <Eye className="w-3.5 h-3.5" /> 12.4k Viewers
                </span>
              </div>

              <div className="space-y-2 bg-[#0b1326] p-3 rounded-lg border border-[#3a494b]/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/40 flex items-center justify-center font-extrabold text-xs text-[#00f2ff]">
                      T1
                    </div>
                    <span className="text-xs font-bold text-white">T1 Esports</span>
                  </div>
                  <span className="text-base font-extrabold text-[#00f2ff] font-mono">2 Kills</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-[#fe6b00]/10 border border-[#fe6b00]/40 flex items-center justify-center font-extrabold text-xs text-[#fe6b00]">
                      PRX
                    </div>
                    <span className="text-xs font-bold text-white">Paper Rex</span>
                  </div>
                  <span className="text-base font-extrabold text-[#b9cacb] font-mono">1 Kill</span>
                </div>
              </div>

              <button
                onClick={() => setIsStreamModalOpen(true)}
                className="w-full py-2.5 rounded-xl bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 text-xs font-headline font-extrabold hover:bg-[#00f2ff]/20 transition-all min-h-[42px] flex items-center justify-center gap-1.5 uppercase tracking-wider"
              >
                <Radio className="w-4 h-4 text-[#ef4444]" />
                <span>Watch Stream</span>
              </button>
            </div>

            {/* Live Card 2 */}
            <div className="rounded-xl p-5 flex flex-col justify-between gap-4 bg-[#131b2e] border border-[#3a494b]/60 shadow-xl">
              <div className="flex justify-between items-center text-xs font-bold text-[#b9cacb]">
                <span className="font-headline uppercase">{liveMatches[1]?.title || 'BGMI Masters Series'}</span>
                <span className="flex items-center gap-1 text-[#ef4444] font-mono font-extrabold">
                  <Eye className="w-3.5 h-3.5" /> 89k Viewers
                </span>
              </div>

              <div className="space-y-2 bg-[#0b1326] p-3 rounded-lg border border-[#3a494b]/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/40 flex items-center justify-center font-extrabold text-xs text-[#b9cacb]">
                      NV
                    </div>
                    <span className="text-xs font-bold text-white">Natus Vincere</span>
                  </div>
                  <span className="text-base font-extrabold text-[#b9cacb] font-mono">1 Kill</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/40 flex items-center justify-center font-extrabold text-xs text-[#00f2ff]">
                      VIT
                    </div>
                    <span className="text-xs font-bold text-white">Team Vitality</span>
                  </div>
                  <span className="text-base font-extrabold text-[#00f2ff] font-mono">3 Kills</span>
                </div>
              </div>

              <button
                onClick={() => setIsStreamModalOpen(true)}
                className="w-full py-2.5 rounded-xl bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 text-xs font-headline font-extrabold hover:bg-[#00f2ff]/20 transition-all min-h-[42px] flex items-center justify-center gap-1.5 uppercase tracking-wider"
              >
                <Radio className="w-4 h-4 text-[#ef4444]" />
                <span>Watch Stream</span>
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* Live Stream Modal */}
      {isStreamModalOpen && (
        <Suspense fallback={null}>
          <LiveStreamModal onClose={() => setIsStreamModalOpen(false)} />
        </Suspense>
      )}

    </div>
  )
}

