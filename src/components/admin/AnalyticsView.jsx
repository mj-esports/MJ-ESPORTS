import { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp,
  Users,
  Trophy,
  Gamepad2,
  Activity,
  BarChart2,
  DollarSign,
  PieChart,
  Shield,
  ArrowUpRight,
  Sparkles,
  Calendar,
  Percent,
  Layers
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

export default function AnalyticsView({ tournaments = [] }) {
  const [loading, setLoading] = useState(true)
  const [dbPlayersCount, setDbPlayersCount] = useState(0)
  const [dbTeamsCount, setDbTeamsCount] = useState(0)
  const [dbRegistrations, setDbRegistrations] = useState([])

  const fetchAnalyticsData = async () => {
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        const [{ count: pCount }, { count: tCount }, { data: rData }] = await Promise.all([
          supabase.from('user_roles').select('*', { count: 'exact', head: true }),
          supabase.from('teams').select('*', { count: 'exact', head: true }),
          supabase.from('tournament_registrations').select('*'),
        ])

        setDbPlayersCount(pCount || 0)
        setDbTeamsCount(tCount || 0)
        setDbRegistrations(rData || [])
      }
    } catch (err) {
      console.warn('[Analytics Fetch Warning]:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  // 1. Executive Telemetry Metrics Calculation
  const telemetry = useMemo(() => {
    const totalTournaments = tournaments.length
    const completedTournaments = tournaments.filter((t) => t.status === 'Completed').length
    const liveTournaments = tournaments.filter((t) => t.status === 'Live Now').length

    let totalSlots = 0
    let totalRegisteredSlots = 0
    let totalRevenue = 0

    tournaments.forEach((t) => {
      const maxSlots = Number(t.maxTeams || t.max_teams || 32)
      const regCount = Number(t.registeredTeams || t.registered_teams || 0)
      const entryFeeNum = parseInt((t.entryFee || t.entry_fee || '0').replace(/[^0-9]/g, ''), 10) || 0

      totalSlots += maxSlots
      totalRegisteredSlots += regCount
      totalRevenue += entryFeeNum * regCount
    })

    const fillRatePct = totalSlots > 0 ? Math.min(100, Math.round((totalRegisteredSlots / totalSlots) * 100)) : 0
    const gatewayFees = Math.round(totalRevenue * 0.02)
    const netRevenue = totalRevenue - gatewayFees

    return {
      totalTournaments,
      completedTournaments,
      liveTournaments,
      totalSlots,
      totalRegisteredSlots,
      fillRatePct,
      totalRevenue: `₹${totalRevenue.toLocaleString()}`,
      gatewayFees: `₹${gatewayFees.toLocaleString()}`,
      netRevenue: `₹${netRevenue.toLocaleString()}`,
      playersCount: dbPlayersCount || totalRegisteredSlots * 4,
      teamsCount: dbTeamsCount || totalRegisteredSlots,
    }
  }, [tournaments, dbPlayersCount, dbTeamsCount])

  // 2. Game Popularity Split (Free Fire vs BGMI)
  const gameSplit = useMemo(() => {
    let ffCount = 0
    let bgmiCount = 0

    tournaments.forEach((t) => {
      const gameName = (t.game || '').toLowerCase()
      if (gameName.includes('free fire')) ffCount += 1
      else if (gameName.includes('bgmi')) bgmiCount += 1
    })

    const totalGames = ffCount + bgmiCount
    const ffPct = totalGames > 0 ? Math.round((ffCount / totalGames) * 100) : 50
    const bgmiPct = totalGames > 0 ? Math.round((bgmiCount / totalGames) * 100) : 50

    return { ffCount, bgmiCount, ffPct, bgmiPct }
  }, [tournaments])

  // 3. Dynamic Registration Trend Bars
  const registrationTrends = useMemo(() => {
    return [
      { label: 'Mon', count: Math.round(telemetry.totalRegisteredSlots * 0.15) },
      { label: 'Tue', count: Math.round(telemetry.totalRegisteredSlots * 0.2) },
      { label: 'Wed', count: Math.round(telemetry.totalRegisteredSlots * 0.25) },
      { label: 'Thu', count: Math.round(telemetry.totalRegisteredSlots * 0.1) },
      { label: 'Fri', count: Math.round(telemetry.totalRegisteredSlots * 0.3) },
      { label: 'Sat', count: Math.round(telemetry.totalRegisteredSlots * 0.4) },
      { label: 'Sun', count: Math.round(telemetry.totalRegisteredSlots * 0.5) },
    ]
  }, [telemetry.totalRegisteredSlots])

  const maxTrendCount = useMemo(() => {
    return Math.max(1, ...registrationTrends.map((t) => t.count))
  }, [registrationTrends])

  const hasActivity = tournaments.length > 0 || telemetry.totalRegisteredSlots > 0

  return (
    <div className="space-y-6">
      
      {/* 1. MODULE HEADER */}
      <div className="space-y-1 border-b border-[#3a494b]/60 pb-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] text-xs font-mono font-bold uppercase">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>ENTERPRISE TELEMETRY ENGINE</span>
        </div>
        <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
          <span>REAL-TIME PLATFORM & BUSINESS ANALYTICS</span>
        </h2>
      </div>

      {/* 2. EXACT REQUIRED EMPTY STATE */}
      {!hasActivity ? (
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-12 text-center space-y-3 shadow-xl my-6">
          <BarChart2 className="w-12 h-12 text-[#00f2ff] mx-auto opacity-50 animate-pulse" />
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-display-lg text-base sm:text-lg font-bold text-white uppercase tracking-wider">
              Data will appear after live tournament activity.
            </h3>
            <p className="text-xs text-[#8e9dae]">
              Telemetry analytics, slot fill rates, and peak time insights will populate as players register for active competitions.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 3. EXECUTIVE KPI METRICS GRID */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-[#151a21] p-4 rounded-xl border border-[#3a494b]/60 space-y-1 shadow-lg">
              <span className="text-[10px] font-mono text-[#8e9dae] uppercase font-bold block flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-[#00f2ff]" /> Competitions
              </span>
              <span className="font-display-lg text-2xl font-extrabold text-white block">{telemetry.totalTournaments}</span>
            </div>

            <div className="bg-[#151a21] p-4 rounded-xl border border-[#3a494b]/60 space-y-1 shadow-lg">
              <span className="text-[10px] font-mono text-[#8e9dae] uppercase font-bold block flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#00ff9d]" /> Total Players
              </span>
              <span className="font-display-lg text-2xl font-extrabold text-[#00ff9d] block">{telemetry.playersCount}</span>
            </div>

            <div className="bg-[#151a21] p-4 rounded-xl border border-[#3a494b]/60 space-y-1 shadow-lg">
              <span className="text-[10px] font-mono text-[#8e9dae] uppercase font-bold block flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-[#fe6b00]" /> Active Squads
              </span>
              <span className="font-display-lg text-2xl font-extrabold text-[#fe6b00] block">{telemetry.teamsCount}</span>
            </div>

            <div className="bg-[#151a21] p-4 rounded-xl border border-[#3a494b]/60 space-y-1 shadow-lg">
              <span className="text-[10px] font-mono text-[#8e9dae] uppercase font-bold block flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-[#00f2ff]" /> Fill Rate %
              </span>
              <span className="font-display-lg text-2xl font-extrabold text-[#00f2ff] block">{telemetry.fillRatePct}%</span>
            </div>

            <div className="bg-[#151a21] p-4 rounded-xl border border-[#3a494b]/60 space-y-1 shadow-lg">
              <span className="text-[10px] font-mono text-[#8e9dae] uppercase font-bold block flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-[#ffb693]" /> Gross Revenue
              </span>
              <span className="font-display-lg text-xl font-extrabold text-[#ffb693] block truncate">{telemetry.totalRevenue}</span>
            </div>

            <div className="bg-[#151a21] p-4 rounded-xl border border-[#3a494b]/60 space-y-1 shadow-lg">
              <span className="text-[10px] font-mono text-[#8e9dae] uppercase font-bold block flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-[#00ff9d]" /> Net Inflow
              </span>
              <span className="font-display-lg text-xl font-extrabold text-[#00ff9d] block truncate">{telemetry.netRevenue}</span>
            </div>
          </div>

          {/* 4. INTERACTIVE CHARTS: REGISTRATION TRENDS & GAME PARTICIPATION */}
          <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-6 shadow-xl text-center">
            <h3 className="font-display-lg text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 justify-center border-b border-[#3a494b]/60 pb-3 mb-4">
              <BarChart2 className="w-4 h-4 text-[#00f2ff]" />
              <span>Registration Velocity & Weekly Trends</span>
            </h3>
            <div className="py-12 text-[#a1a1aa] font-mono text-xs">
              No analytics data available.
            </div>
          </div>

        </>
      )}

    </div>
  )
}
