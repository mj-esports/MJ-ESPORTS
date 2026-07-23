import {
  Zap,
  Calendar,
  ClipboardList,
  CheckCircle2,
  Users,
  Gamepad2,
  AlertTriangle,
  Activity,
  PlusCircle,
  Radio,
  BarChart3,
  ArrowRight,
  ShieldAlert,
  Clock,
  Bell
} from 'lucide-react'

export default function DashboardOverview({ tournaments, setActiveTab }) {
  const liveCount = tournaments.filter((t) => t.status === 'Live Now').length
  const upcomingCount = tournaments.filter((t) => t.status === 'Registration Open').length
  const totalRegistrations = tournaments.reduce((acc, t) => acc + (t.registeredTeams || 0), 0)
  const totalPlayers = totalRegistrations * 4

  const recentActivities = [
    { id: 1, title: 'Room ID Published', desc: 'Custom Room ID #49281 published for FF Championship Round 1', time: '10 mins ago', type: 'live' },
    { id: 2, title: 'Squad Approved', desc: 'Total Gaming squad approved for BGMI Champions Cup', time: '25 mins ago', type: 'reg' },
    { id: 3, title: 'Score Updated', desc: 'Round 2 standings updated for Free Fire India Cup', time: '1 hour ago', type: 'score' },
    { id: 4, title: 'Cheating Report Filed', desc: 'Player #51892 reported for suspicious headshot accuracy', time: '2 hours ago', type: 'report' },
  ]

  const upcomingSchedule = [
    { id: 'sc-1', match: 'Free Fire India Cup - Semi Finals', time: '06:00 PM IST', teams: '12 Squads', status: 'Room Ready' },
    { id: 'sc-2', match: 'BGMI Champions Cup - Final Showdown', time: '08:30 PM IST', teams: '16 Squads', status: 'Registration Open' },
  ]

  return (
    <div className="space-y-6">
      
      {/* 8 Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        <div
          onClick={() => setActiveTab('live-ops')}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 cursor-pointer hover:border-purple-500/50 transition-colors shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Live Tournaments</span>
            <Zap className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-extrabold text-white flex items-center gap-2">
            <span>{liveCount}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
              ACTIVE NOW
            </span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('tournaments')}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 cursor-pointer hover:border-purple-500/50 transition-colors shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Upcoming Today</span>
            <Calendar className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{upcomingCount}</div>
        </div>

        <div
          onClick={() => setActiveTab('registrations')}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 cursor-pointer hover:border-purple-500/50 transition-colors shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Pending Regs</span>
            <ClipboardList className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-2xl font-extrabold text-yellow-400">5 Squads</div>
        </div>

        <div
          onClick={() => setActiveTab('leaderboards')}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 cursor-pointer hover:border-purple-500/50 transition-colors shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Results Pending</span>
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-400">1 Match</div>
        </div>

        <div
          onClick={() => setActiveTab('players')}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 cursor-pointer hover:border-purple-500/50 transition-colors shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Players</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">{totalPlayers}+</div>
        </div>

        <div
          onClick={() => setActiveTab('matches')}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 cursor-pointer hover:border-purple-500/50 transition-colors shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Today's Matches</span>
            <Gamepad2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">4 Lobbies</div>
        </div>

        <div
          onClick={() => setActiveTab('reports')}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 cursor-pointer hover:border-purple-500/50 transition-colors shadow-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Open Reports</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400">1 Report</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">System Status</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 pt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>All Services Operational</span>
          </div>
        </div>

      </div>

      {/* Quick Operations Actions Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-3 shadow-xl">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <PlusCircle className="w-4 h-4 text-purple-400" />
          <span>Quick Operational Actions</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => setActiveTab('tournaments')}
            className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-left hover:border-purple-500/50 transition-colors space-y-1"
          >
            <span className="text-xs font-bold text-white block">+ Create Tournament</span>
            <span className="text-[10px] text-slate-400 block">Launch new competition</span>
          </button>

          <button
            onClick={() => setActiveTab('matches')}
            className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-left hover:border-purple-500/50 transition-colors space-y-1"
          >
            <span className="text-xs font-bold text-white block">Generate Room ID</span>
            <span className="text-[10px] text-slate-400 block">Create custom match lobby</span>
          </button>

          <button
            onClick={() => setActiveTab('registrations')}
            className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-left hover:border-purple-500/50 transition-colors space-y-1"
          >
            <span className="text-xs font-bold text-white block">Review Registrations</span>
            <span className="text-[10px] text-slate-400 block">Approve/Reject squad slots</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboards')}
            className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-left hover:border-purple-500/50 transition-colors space-y-1"
          >
            <span className="text-xs font-bold text-white block">Publish Points Table</span>
            <span className="text-[10px] text-slate-400 block">Update live tournament standings</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Activity Log & Upcoming Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Activity Log */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Real-Time Audit Log</span>
            </h3>
            <span className="text-[10px] font-semibold text-slate-500">Live Updates</span>
          </div>

          <div className="space-y-3">
            {recentActivities.map((act) => (
              <div key={act.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-white block">{act.title}</span>
                  <p className="text-[11px] text-slate-400">{act.desc}</p>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap shrink-0">{act.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Today Lobbies */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span>Today's Tournament Lobbies</span>
            </h3>
            <button onClick={() => setActiveTab('matches')} className="text-[10px] font-bold text-purple-400 hover:text-purple-300">
              Manage Lobbies &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {upcomingSchedule.map((item) => (
              <div key={item.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="font-bold text-white">{item.match}</h4>
                  <p className="text-[11px] text-slate-400">Scheduled: {item.time} &bull; {item.teams}</p>
                </div>
                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800 shrink-0">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  )
}
