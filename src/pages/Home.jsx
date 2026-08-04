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
  Flame,
  Search,
  Bell
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
      <main className="max-w-md mx-auto sm:max-w-xl lg:max-w-4xl pt-4 px-4 flex flex-col gap-6">

        {/* 1. STITCH WELCOME BANNER CARD */}
        <section className="rounded-[12px] p-5 relative overflow-hidden bg-[#131b2e] border border-[#3a494b]/40 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00f2ff]/20 to-transparent opacity-50 z-0 pointer-events-none"></div>
          <div className="relative z-10 space-y-3">
            <h1 className="text-[28px] font-bold text-[#dae2fd] leading-tight font-headline">
              Welcome back,<br />
              <span className="text-[#00f2ff]">{displayName}</span>
            </h1>
            <p className="text-[14px] font-normal text-[#b9cacb]">
              Ready to dominate the arena today?
            </p>
            <Link
              to="/tournaments"
              className="bg-[#00f2ff] text-[#00363a] px-6 py-2.5 rounded-full font-semibold text-[14px] hover:bg-[#74f5ff] transition-all min-h-[44px] inline-flex items-center justify-center shadow-md font-headline"
            >
              View Daily Missions
            </Link>
          </div>
        </section>

        {/* 2. STITCH CIRCULAR QUICK ACTIONS BAR */}
        <section className="flex overflow-x-auto gap-4 no-scrollbar py-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <Link
            to="/tournaments"
            className="flex flex-col items-center gap-2 shrink-0 min-w-[80px] group min-h-[44px]"
          >
            <div className="w-12 h-12 rounded-full bg-[#171f33] border border-[#3a494b] flex items-center justify-center group-hover:border-[#00f2ff] transition-colors shadow-sm">
              <Swords className="w-6 h-6 text-[#00f2ff]" />
            </div>
            <span className="text-[12px] font-semibold text-[#b9cacb] group-hover:text-white font-headline">
              Join Battle
            </span>
          </Link>

          <Link
            to="/dashboard"
            className="flex flex-col items-center gap-2 shrink-0 min-w-[80px] group min-h-[44px]"
          >
            <div className="w-12 h-12 rounded-full bg-[#171f33] border border-[#3a494b] flex items-center justify-center group-hover:border-[#00f2ff] transition-colors shadow-sm">
              <Wallet className="w-6 h-6 text-[#00f2ff]" />
            </div>
            <span className="text-[12px] font-semibold text-[#b9cacb] group-hover:text-white font-headline">
              Add Funds
            </span>
          </Link>

          <Link
            to="/leaderboard"
            className="flex flex-col items-center gap-2 shrink-0 min-w-[80px] group min-h-[44px]"
          >
            <div className="w-12 h-12 rounded-full bg-[#171f33] border border-[#3a494b] flex items-center justify-center group-hover:border-[#00f2ff] transition-colors shadow-sm">
              <BarChart3 className="w-6 h-6 text-[#00f2ff]" />
            </div>
            <span className="text-[12px] font-semibold text-[#b9cacb] group-hover:text-white font-headline">
              Rankings
            </span>
          </Link>

          <a
            href="mailto:support.mjesports@gmail.com"
            className="flex flex-col items-center gap-2 shrink-0 min-w-[80px] group min-h-[44px]"
          >
            <div className="w-12 h-12 rounded-full bg-[#171f33] border border-[#3a494b] flex items-center justify-center group-hover:border-[#00f2ff] transition-colors shadow-sm">
              <HelpCircle className="w-6 h-6 text-[#00f2ff]" />
            </div>
            <span className="text-[12px] font-semibold text-[#b9cacb] group-hover:text-white font-headline">
              Get Help
            </span>
          </a>
        </section>

        {/* 3. STITCH FEATURED EVENT CARD */}
        <section className="space-y-2">
          <div className="flex justify-between items-end mb-2">
            <h2 className="text-[20px] font-semibold text-[#dae2fd] font-headline">
              Featured Event
            </h2>
          </div>

          <div className="rounded-[12px] overflow-hidden group border border-[#3a494b]/60 bg-[#131b2e] shadow-md">
            <div className="h-[160px] sm:h-[200px] w-full relative">
              <img
                className="w-full h-full object-cover"
                alt="Cyberpunk Arena Banner"
                src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#171f33] via-transparent to-transparent"></div>
              <div className="absolute top-[8px] right-[8px] bg-[#0b1326]/80 backdrop-blur-sm px-[8px] py-[4px] rounded text-[12px] font-semibold text-[#00f2ff] border border-[#00f2ff]/30 font-headline">
                {featuredTournament?.status || 'Registration Open'}
              </div>
            </div>

            <div className="p-4 space-y-3">
              <h3 className="text-[16px] font-semibold text-[#dae2fd] font-headline">
                {featuredTournament?.title || 'Global Championship Qualifiers'}
              </h3>
              
              <div className="flex items-center gap-[8px] text-[14px] font-normal text-[#b9cacb]">
                <Calendar className="w-4 h-4 text-[#00f2ff]" />
                <span>Starts in 2d 14h 30m</span>
                <span className="text-[#00f2ff] font-semibold ml-auto font-mono">
                  {featuredTournament?.prizePool || '₹4,200,000 Prize'}
                </span>
              </div>

              <Link
                to={featuredTournament ? `/tournaments/${featuredTournament.id}` : '/tournaments'}
                className="w-full bg-[#00f2ff] text-[#00363a] py-3 rounded-full font-semibold text-[14px] hover:bg-[#74f5ff] transition-all text-center min-h-[44px] flex items-center justify-center shadow-md font-headline uppercase tracking-wide"
              >
                Join Tournament
              </Link>
            </div>
          </div>
        </section>

        {/* 4. STITCH LIVE TOURNAMENTS SECTION */}
        <section className="space-y-2">
          <div className="flex justify-between items-end mb-2">
            <h2 className="font-semibold text-[#dae2fd] flex items-center gap-[8px] text-[20px] font-headline">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffb4ab] animate-pulse"></span>
              <span>Live Now</span>
            </h2>
            <Link to="/tournaments" className="text-[12px] font-semibold text-[#00f2ff] hover:underline font-headline">
              View All
            </Link>
          </div>

          <div className="flex overflow-x-auto gap-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-2">
            {/* Live Card 1 */}
            <div className="rounded-[12px] min-w-[260px] sm:min-w-[280px] p-4 flex flex-col gap-[8px] bg-[#131b2e] border border-[#3a494b]/40 shadow-md">
              <div className="flex justify-between items-center text-[12px] font-semibold text-[#b9cacb]">
                <span>{liveMatches[0]?.title || 'Valorant Pro League'}</span>
                <span className="flex items-center gap-1 text-[#ffb4ab]">
                  <Eye className="w-3.5 h-3.5" /> 12.4k
                </span>
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-[#222a3d] flex items-center justify-center font-bold text-xs text-[#00f2ff]">
                    T1
                  </div>
                  <span className="text-[14px] font-semibold text-white">T1</span>
                </div>
                <span className="text-[20px] font-semibold text-[#00f2ff] font-mono">2</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-[#222a3d] flex items-center justify-center font-bold text-xs text-[#b9cacb]">
                    PRX
                  </div>
                  <span className="text-[14px] font-semibold text-white">PRX</span>
                </div>
                <span className="text-[20px] font-semibold text-[#b9cacb] font-mono">1</span>
              </div>

              <button
                onClick={() => setIsStreamModalOpen(true)}
                className="w-full mt-2 py-2 rounded-lg bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 text-xs font-semibold hover:bg-[#00f2ff]/20 transition-all min-h-[38px] flex items-center justify-center gap-1.5"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Watch Stream</span>
              </button>
            </div>

            {/* Live Card 2 */}
            <div className="rounded-[12px] min-w-[260px] sm:min-w-[280px] p-4 flex flex-col gap-[8px] bg-[#131b2e] border border-[#3a494b]/40 shadow-md">
              <div className="flex justify-between items-center text-[12px] font-semibold text-[#b9cacb]">
                <span>{liveMatches[1]?.title || 'CS2 Major Semi-Final'}</span>
                <span className="flex items-center gap-1 text-[#ffb4ab]">
                  <Eye className="w-3.5 h-3.5" /> 89k
                </span>
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-[#222a3d] flex items-center justify-center font-bold text-xs text-[#b9cacb]">
                    NAVI
                  </div>
                  <span className="text-[14px] font-semibold text-white">NAVI</span>
                </div>
                <span className="text-[20px] font-semibold text-[#b9cacb] font-mono">1</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-[#222a3d] flex items-center justify-center font-bold text-xs text-[#00f2ff]">
                    VIT
                  </div>
                  <span className="text-[14px] font-semibold text-white">VIT</span>
                </div>
                <span className="text-[20px] font-semibold text-[#00f2ff] font-mono">1</span>
              </div>

              <button
                onClick={() => setIsStreamModalOpen(true)}
                className="w-full mt-2 py-2 rounded-lg bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 text-xs font-semibold hover:bg-[#00f2ff]/20 transition-all min-h-[38px] flex items-center justify-center gap-1.5"
              >
                <Radio className="w-3.5 h-3.5" />
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
