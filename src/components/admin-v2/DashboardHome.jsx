import React from 'react'
import {
  Trophy,
  Users,
  Wallet,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Zap,
  Clock,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react'

const stats = [
  {
    title: 'Total Platform Revenue',
    value: '₹4,85,250',
    change: '+14.2%',
    isPositive: true,
    icon: Wallet,
    color: 'from-emerald-500/20 to-teal-500/5',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-400'
  },
  {
    title: 'Active Tournaments',
    value: '18 Active',
    change: '+3 this week',
    isPositive: true,
    icon: Trophy,
    color: 'from-cyan-500/20 to-blue-500/5',
    borderColor: 'border-cyan-500/30',
    textColor: 'text-cyan-400'
  },
  {
    title: 'Registered Esports Players',
    value: '2,480 Players',
    change: '+128 new',
    isPositive: true,
    icon: Users,
    color: 'from-purple-500/20 to-indigo-500/5',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-400'
  },
  {
    title: 'Wallet Transactions',
    value: '₹82,400',
    change: '8 pending approvals',
    isPositive: false,
    icon: Activity,
    color: 'from-amber-500/20 to-orange-500/5',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400'
  }
]

const recentActivities = [
  {
    id: 1,
    title: 'Free Fire Premier Cup 2026',
    action: 'Created New Tournament',
    time: '12 mins ago',
    type: 'tournament',
    icon: Zap
  },
  {
    id: 2,
    title: 'User #MJ-9042 Wallet Topup',
    action: 'Approved ₹1,500 Deposit',
    time: '25 mins ago',
    type: 'wallet',
    icon: CheckCircle2
  },
  {
    id: 3,
    title: 'Squad Registration Verified',
    action: 'Team Alpha Gaming joined Cup #4',
    time: '1 hour ago',
    type: 'user',
    icon: ShieldCheck
  }
]

export default function DashboardHome() {
  return (
    <div className="space-y-6">
      {/* Banner / Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 p-6 border border-cyan-500/20 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                PROD ENVIRONMENT
              </span>
              <span className="text-xs text-slate-400 font-mono">v2.0.0-beta</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-wide">
              Welcome back, <span className="text-cyan-400">Admin</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Overview of tournament metrics, system health diagnostics, player registrations, and platform wallet flows.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Quick Action
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              className={`p-5 rounded-2xl bg-slate-900/60 backdrop-blur-sm border ${stat.borderColor} relative overflow-hidden group hover:border-slate-700 transition-all`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">{stat.title}</span>
                <div className={`p-2 rounded-xl bg-slate-800/80 ${stat.textColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-xl font-extrabold text-white tracking-tight">{stat.value}</span>
                <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${stat.textColor}`}>
                  <TrendingUp className="w-3 h-3" />
                  {stat.change}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Activity & System Health Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Recent System Activity
            </h3>
            <span className="text-xs text-cyan-400 font-semibold cursor-pointer hover:underline">
              View All
            </span>
          </div>

          <div className="space-y-3">
            {recentActivities.map((act) => {
              const Icon = act.icon
              return (
                <div
                  key={act.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{act.title}</h4>
                      <p className="text-[11px] text-slate-400">{act.action}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{act.time}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Diagnostics Widget */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            Infrastructure V2 Status
          </h3>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Database Connection</span>
                <span className="text-emerald-400 font-semibold">100% Operational</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="w-full h-full bg-emerald-400 rounded-full" />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">API Latency</span>
                <span className="text-cyan-400 font-semibold">24ms</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="w-4/5 h-full bg-cyan-400 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
