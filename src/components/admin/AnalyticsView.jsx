import { TrendingUp, Users, Trophy, Gamepad2, Activity } from 'lucide-react'

export default function AnalyticsView() {
  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="space-y-1 border-b border-slate-800 pb-4">
        <h2 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-cyan-400" />
          <span>TOURNAMENT & PLAYER TELEMETRY ANALYTICS</span>
        </h2>
        <p className="text-xs text-slate-400">
          Track registration fill rates, active player trends, peak registration times, and game popularity metrics.
        </p>
      </div>

      {/* Metric Visual Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Tournament Fill Rate Meter */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Tournament Slot Fill Rate</h3>
            <span className="text-xs font-extrabold text-emerald-400">89.5% Avg</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-4 p-0.5 border border-slate-800">
            <div className="bg-gradient-to-r from-purple-500 to-cyan-400 h-full rounded-full w-[89.5%]"></div>
          </div>
          <p className="text-xs text-slate-400">Free Fire tournaments fill within 45 minutes of registration opening.</p>
        </div>

        {/* Game Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Game Popularity Split</h3>
          <div className="space-y-2 text-xs">
            <div>
              <div className="flex justify-between font-bold text-white mb-1">
                <span>Free Fire</span>
                <span>65%</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full w-[65%]"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between font-bold text-white mb-1">
                <span>BGMI</span>
                <span>35%</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div className="bg-cyan-400 h-full w-[35%]"></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Peak Times Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-yellow-400" />
          <span>Peak Registration Time Insights</span>
        </h3>
        <p className="text-xs text-slate-300">
          Peak squad registration volume occurs between <strong>06:00 PM IST – 09:00 PM IST</strong> on Fridays and Saturdays.
        </p>
      </div>

    </div>
  )
}
