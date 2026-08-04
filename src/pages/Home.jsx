import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTournaments } from '../contexts/TournamentContext'
import { useAuth } from '../contexts/AuthContext'
import {
  Swords,
  Gamepad2,
  Wallet,
  Trophy,
  ArrowRight,
  Star,
  Calendar,
  Users
} from 'lucide-react'

export default function Home() {
  const { tournaments } = useTournaments()
  const { user } = useAuth()

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'PlayerOne'

  // Upcoming Tournaments List
  const upcomingTournaments = useMemo(() => {
    return tournaments.filter((t) => t.status !== 'Completed').slice(0, 2)
  }, [tournaments])

  return (
    <main className="flex-grow flex flex-col w-full bg-[#0B0E11] text-white font-body antialiased selection:bg-[#00F2FF]/30 selection:text-[#00F2FF]">
      
      {/* 1. HERO SECTION (STITCH SCREEN c10bc5e9f31f497593ec2ad21cbe1504) */}
      <section className="relative w-full h-[500px] md:h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            className="w-full h-full object-cover opacity-60"
            alt="Two esports characters facing off in a dark arena with dramatic cyan spotlighting"
            src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=2000&q=80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0E11] via-[#0B0E11]/60 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0E11] via-transparent to-[#0B0E11] hidden md:block"></div>
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto flex flex-col items-center">
          <span className="px-4 py-1.5 rounded-full bg-[#1C232B]/80 border border-[#00F2FF]/30 text-[#00F2FF] font-label text-sm font-semibold tracking-wide mb-6 uppercase flex items-center gap-2 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[#00F2FF] animate-pulse"></span>
            Season 4 Registrations Open &bull; Welcome {displayName}
          </span>

          <h1 className="font-headline font-black text-5xl md:text-7xl lg:text-8xl tracking-tighter text-white mb-4 uppercase drop-shadow-2xl leading-none">
            Elevate Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F2FF] to-[#00C2CC]">Game</span>
          </h1>

          <p className="font-body text-[#9CA3AF] text-lg md:text-xl max-w-2xl mx-auto mb-8 font-medium">
            Compete in daily tournaments. Climb the ranks. Claim your share of the <span className="text-[#FE6B00] font-bold">₹50,000+</span> monthly prize pool.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link
              to="/tournaments"
              className="px-8 py-4 bg-[#00F2FF] text-[#0B0E11] font-headline font-bold text-lg rounded-lg hover:bg-[#00C2CC] transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_20px_rgba(0,242,255,0.4)] flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <span>Browse Tournaments</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/leaderboard"
              className="px-8 py-4 bg-[#2A3441] text-white font-headline font-bold text-lg rounded-lg hover:bg-[#1C232B] transition-all duration-300 border border-[#374151] flex items-center justify-center gap-2 uppercase tracking-wider"
            >
              <span>View Leaderboard</span>
              <Trophy className="w-5 h-5 text-[#FE6B00]" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. MAIN CONTAINER GRID (STITCH SCREEN c10bc5e9f31f497593ec2ad21cbe1504) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full -mt-16 relative z-20 pb-20 space-y-12">

        {/* Quick Actions */}
        <section className="grid grid-cols-4 gap-4 md:gap-8">
          <Link to="/tournaments" className="flex flex-col items-center gap-3 group">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[#1C232B] border border-[#374151]/50 flex items-center justify-center group-hover:bg-[#00F2FF]/10 group-hover:border-[#00F2FF]/50 transition-all duration-300 shadow-lg">
              <Swords className="w-8 h-8 md:w-10 md:h-10 text-[#00F2FF] group-hover:scale-110 transition-transform" />
            </div>
            <span className="font-label text-sm font-semibold text-[#9CA3AF] group-hover:text-white transition-colors text-center leading-tight">
              Join<br />Tournament
            </span>
          </Link>

          <Link to="/dashboard" className="flex flex-col items-center gap-3 group">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[#1C232B] border border-[#374151]/50 flex items-center justify-center group-hover:bg-[#FE6B00]/10 group-hover:border-[#FE6B00]/50 transition-all duration-300 shadow-lg">
              <Gamepad2 className="w-8 h-8 md:w-10 md:h-10 text-[#FE6B00] group-hover:scale-110 transition-transform" />
            </div>
            <span className="font-label text-sm font-semibold text-[#9CA3AF] group-hover:text-white transition-colors text-center leading-tight">
              My<br />Matches
            </span>
          </Link>

          <Link to="/dashboard" className="flex flex-col items-center gap-3 group">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[#1C232B] border border-[#374151]/50 flex items-center justify-center group-hover:bg-[#00F2FF]/10 group-hover:border-[#00F2FF]/50 transition-all duration-300 shadow-lg">
              <Wallet className="w-8 h-8 md:w-10 md:h-10 text-[#00F2FF] group-hover:scale-110 transition-transform" />
            </div>
            <span className="font-label text-sm font-semibold text-[#9CA3AF] group-hover:text-white transition-colors text-center leading-tight">
              Wallet
            </span>
          </Link>

          <Link to="/leaderboard" className="flex flex-col items-center gap-3 group">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[#1C232B] border border-[#374151]/50 flex items-center justify-center group-hover:bg-[#FE6B00]/10 group-hover:border-[#FE6B00]/50 transition-all duration-300 shadow-lg">
              <Trophy className="w-8 h-8 md:w-10 md:h-10 text-[#FE6B00] group-hover:scale-110 transition-transform" />
            </div>
            <span className="font-label text-sm font-semibold text-[#9CA3AF] group-hover:text-white transition-colors text-center leading-tight">
              Leaderboard
            </span>
          </Link>
        </section>

        {/* Platform Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#1C232B] rounded-xl p-6 border border-[#374151]/30">
          <div className="flex flex-col items-center text-center">
            <span className="text-3xl font-display font-bold text-[#00F2FF] mb-1">12</span>
            <span className="text-xs text-[#9CA3AF] uppercase font-semibold tracking-wider">Active Tournaments</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-3xl font-display font-bold text-white mb-1">24</span>
            <span className="text-xs text-[#9CA3AF] uppercase font-semibold tracking-wider">Open Registrations</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-3xl font-display font-bold text-[#FE6B00] mb-1">₹1.2L+</span>
            <span className="text-xs text-[#9CA3AF] uppercase font-semibold tracking-wider">Total Prize Pool</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-3xl font-display font-bold text-white mb-1">15k+</span>
            <span className="text-xs text-[#9CA3AF] uppercase font-semibold tracking-wider">Registered Players</span>
          </div>
        </section>

        {/* Featured Tournament Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-headline font-black text-2xl uppercase tracking-wider text-white flex items-center gap-3">
              <Star className="w-6 h-6 text-[#00F2FF]" />
              <span>Featured Tournament</span>
            </h2>
          </div>

          <div className="rounded-2xl p-1 relative overflow-hidden group bg-[#1C232B]/60 backdrop-blur-md border border-white/5">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FE6B00]/20 to-[#00F2FF]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>

            <div className="bg-[#1C232B] rounded-xl p-6 relative z-10 flex flex-col md:flex-row items-center gap-8 border border-[#374151]/30">
              <div className="w-full md:w-1/3 aspect-video rounded-lg overflow-hidden relative shadow-lg">
                <img
                  className="w-full h-full object-cover"
                  alt="Gameplay screenshot of BGMI showing intense firefight"
                  src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80"
                />
                <div className="absolute top-2 left-2 px-3 py-1 bg-emerald-600 text-white font-headline text-xs font-bold rounded uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  <span>REGISTRATION OPEN</span>
                </div>
              </div>

              <div className="flex-1 flex flex-col w-full">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-headline font-bold text-xl text-white mb-1">
                      {upcomingTournaments[0]?.title || 'BGMI Pro Scrims T1'}
                    </h3>
                    <p className="text-[#9CA3AF] text-sm flex items-center gap-2">
                      <Gamepad2 className="w-4 h-4 text-[#00F2FF]" /> Battlegrounds Mobile India
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#9CA3AF] uppercase font-semibold mb-1">Prize Pool</p>
                    <p className="font-headline font-bold text-[#FE6B00] text-lg">₹10,000</p>
                  </div>
                </div>

                <div className="flex justify-between my-3 text-sm">
                  <div className="flex flex-col">
                    <span className="text-xs text-[#9CA3AF] uppercase mb-1 font-semibold">Entry Fee</span>
                    <span className="font-headline font-bold text-[#00F2FF]">₹100 / Team</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-[#9CA3AF] uppercase mb-1 font-semibold">Registration Closes</span>
                    <span className="font-headline font-bold text-white">Today, 10:00 PM</span>
                  </div>
                </div>

                <div className="bg-[#2A3441]/50 rounded-lg p-3 border border-[#374151]/30 mb-4">
                  <p className="text-xs text-[#9CA3AF] uppercase mb-1 font-semibold">Slots Filled</p>
                  <div className="flex items-center gap-2">
                    <p className="font-display font-bold text-lg text-white tracking-wider">42/50</p>
                    <div className="flex-1 h-1.5 bg-[#0B0E11] rounded-full overflow-hidden">
                      <div className="h-full bg-[#FE6B00] w-[84%]"></div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Link
                    to="/tournaments"
                    className="flex-1 py-3 bg-[#00F2FF] hover:bg-[#00C2CC] text-[#0B0E11] font-headline font-bold uppercase tracking-wider rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-center"
                  >
                    Register Now
                  </Link>
                  <Link
                    to="/tournaments"
                    className="flex-1 py-3 bg-[#2A3441] hover:bg-[#1C232B] text-white font-headline font-bold uppercase tracking-wider rounded-lg transition-all duration-300 border border-[#374151] hover:border-[#00F2FF] flex items-center justify-center gap-2 text-center"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Layout Grid for Upcoming & Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Upcoming Tournaments */}
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline font-black text-2xl uppercase tracking-wider text-white flex items-center gap-3">
                <Calendar className="w-6 h-6 text-[#00F2FF]" />
                <span>Upcoming Tournaments</span>
              </h2>
              <Link to="/tournaments" className="text-sm font-label text-[#00F2FF] hover:text-[#00C2CC] transition-colors flex items-center gap-1 font-semibold uppercase">
                <span>View All</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tournament Card 1 */}
              <div className="bg-[#1C232B] rounded-lg border border-[#374151]/30 overflow-hidden hover:border-[#00F2FF]/50 transition-colors group flex flex-col">
                <div className="h-32 relative overflow-hidden">
                  <img
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                    alt="Free Fire Max promotional banner"
                    src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1C232B] to-transparent"></div>
                  <div className="absolute bottom-3 left-4 flex gap-2">
                    <span className="px-2 py-0.5 bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/30 text-[10px] font-bold uppercase rounded backdrop-blur">Squad</span>
                    <span className="px-2 py-0.5 bg-[#FE6B00]/20 text-[#FE6B00] border border-[#FE6B00]/30 text-[10px] font-bold uppercase rounded backdrop-blur">Erangel</span>
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="font-headline font-bold text-lg text-white mb-1">Weekly Showdown #45</h3>
                  <p className="text-xs text-[#9CA3AF] mb-4">Free Fire MAX</p>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#9CA3AF] uppercase font-semibold">Entry Fee</span>
                      <span className="font-bold text-white text-sm">₹50 / Player</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-[#9CA3AF] uppercase font-semibold">Prize Pool</span>
                      <span className="font-bold text-[#FE6B00] text-sm">₹5,000</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-[#9CA3AF] mb-2 font-medium">
                    <span>Closes in: 2h 15m</span>
                  </div>

                  <div className="mb-4 mt-auto">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#9CA3AF]">Registration</span>
                      <span className="text-[#00F2FF] font-bold">18/25 Teams</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#2A3441] rounded-full overflow-hidden">
                      <div className="h-full bg-[#00F2FF] w-[72%]"></div>
                    </div>
                  </div>

                  <Link
                    to="/tournaments"
                    className="w-full py-2.5 bg-[#2A3441] hover:bg-[#00F2FF]/20 text-white hover:text-[#00F2FF] font-headline font-bold text-sm uppercase tracking-wider rounded transition-colors border border-[#374151] hover:border-[#00F2FF]/50 text-center block"
                  >
                    Register Now
                  </Link>
                </div>
              </div>

              {/* Tournament Card 2 */}
              <div className="bg-[#1C232B] rounded-lg border border-[#374151]/30 overflow-hidden hover:border-[#00F2FF]/50 transition-colors group flex flex-col">
                <div className="h-32 relative overflow-hidden">
                  <img
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                    alt="BGMI stylized artwork"
                    src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1C232B] to-transparent"></div>
                  <div className="absolute bottom-3 left-4 flex gap-2">
                    <span className="px-2 py-0.5 bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/30 text-[10px] font-bold uppercase rounded backdrop-blur">Solo</span>
                    <span className="px-2 py-0.5 bg-[#FE6B00]/20 text-[#FE6B00] border border-[#FE6B00]/30 text-[10px] font-bold uppercase rounded backdrop-blur">Miramar</span>
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="font-headline font-bold text-lg text-white mb-1">Midnight Brawlers</h3>
                  <p className="text-xs text-[#9CA3AF] mb-4">BGMI</p>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#9CA3AF] uppercase font-semibold">Entry Fee</span>
                      <span className="font-bold text-[#00F2FF] text-sm">FREE</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-[#9CA3AF] uppercase font-semibold">Prize Pool</span>
                      <span className="font-bold text-[#FE6B00] text-sm">₹2,000</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-[#9CA3AF] mb-2 font-medium">
                    <span>Closes in: 5h 30m</span>
                  </div>

                  <div className="mb-4 mt-auto">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#9CA3AF]">Registration</span>
                      <span className="text-[#00F2FF] font-bold">85/100 Players</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#2A3441] rounded-full overflow-hidden">
                      <div className="h-full bg-[#00F2FF] w-[85%]"></div>
                    </div>
                  </div>

                  <Link
                    to="/tournaments"
                    className="w-full py-2.5 bg-[#2A3441] hover:bg-[#00F2FF]/20 text-white hover:text-[#00F2FF] font-headline font-bold text-sm uppercase tracking-wider rounded transition-colors border border-[#374151] hover:border-[#00F2FF]/50 text-center block"
                  >
                    Register Now
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Leaderboard Widget */}
          <section className="lg:col-span-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline font-black text-2xl uppercase tracking-wider text-white flex items-center gap-3">
                <Trophy className="w-6 h-6 text-[#FE6B00]" />
                <span>Top Players</span>
              </h2>
            </div>

            <div className="bg-[#1C232B] rounded-lg border border-[#374151]/30 p-1 space-y-1">
              <div className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-transparent border-l-2 border-yellow-500 mb-1">
                <div className="w-10 h-10 rounded-full border-2 border-yellow-500 overflow-hidden relative bg-[#2A3441] flex items-center justify-center font-bold text-yellow-500">
                  1
                </div>
                <div className="flex-1">
                  <h4 className="font-headline font-bold text-sm text-yellow-500">Ninja_Killer</h4>
                  <p className="text-[10px] text-[#9CA3AF] uppercase">142 Kills</p>
                </div>
                <div className="text-right">
                  <span className="font-headline font-bold text-lg text-white font-mono">2450</span>
                  <p className="text-[10px] text-[#9CA3AF] uppercase font-semibold">PTS</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-gray-400/10 to-transparent border-l-2 border-gray-400 mb-1">
                <div className="w-10 h-10 rounded-full border-2 border-gray-400 overflow-hidden relative bg-[#2A3441] flex items-center justify-center font-bold text-gray-300">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="font-headline font-bold text-sm text-gray-300">ToxicVenom</h4>
                  <p className="text-[10px] text-[#9CA3AF] uppercase">128 Kills</p>
                </div>
                <div className="text-right">
                  <span className="font-headline font-bold text-lg text-white font-mono">2180</span>
                  <p className="text-[10px] text-[#9CA3AF] uppercase font-semibold">PTS</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-amber-700/10 to-transparent border-l-2 border-amber-700 mb-2">
                <div className="w-10 h-10 rounded-full border-2 border-amber-700 overflow-hidden relative bg-[#2A3441] flex items-center justify-center font-bold text-amber-600">
                  3
                </div>
                <div className="flex-1">
                  <h4 className="font-headline font-bold text-sm text-amber-600">ShadowStriker</h4>
                  <p className="text-[10px] text-[#9CA3AF] uppercase">115 Kills</p>
                </div>
                <div className="text-right">
                  <span className="font-headline font-bold text-lg text-white font-mono">1950</span>
                  <p className="text-[10px] text-[#9CA3AF] uppercase font-semibold">PTS</p>
                </div>
              </div>

              <Link
                to="/leaderboard"
                className="w-full py-3 text-xs font-label uppercase tracking-wider text-[#9CA3AF] hover:text-[#00F2FF] transition-colors border-t border-[#374151]/30 mt-2 block text-center font-bold"
              >
                View Full Rankings
              </Link>
            </div>
          </section>

        </div>
      </div>
    </main>
  )
}



