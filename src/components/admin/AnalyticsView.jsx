import { TrendingUp, Users, Trophy, Gamepad2, Activity } from 'lucide-react'

export default function AnalyticsView() {
  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="space-y-1 border-b border-[#3a494b]/60 pb-4">
        <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-[#00f2ff]" />
          <span>TOURNAMENT & PLAYER TELEMETRY ANALYTICS</span>
        </h2>
        <p className="text-xs text-[#8e9dae]">
          Track registration fill rates, active player trends, peak registration times, and game popularity metrics.
        </p>
      </div>

      {/* Metric Visual Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Tournament Fill Rate Meter */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-display-lg text-sm font-bold text-white uppercase tracking-wider">Tournament Slot Fill Rate</h3>
            <span className="font-mono text-xs font-extrabold text-[#00ff9d]">89.5% Avg</span>
          </div>
          <div className="w-full bg-[#07090c] rounded-full h-4 p-0.5 border border-[#3a494b]/60">
            <div className="bg-[#00f2ff] h-full rounded-full w-[89.5%] shadow-[0_0_12px_rgba(0,242,255,0.4)]"></div>
          </div>
          <p className="text-xs text-[#8e9dae]">Free Fire tournaments fill within 45 minutes of registration opening.</p>
        </div>

        {/* Game Distribution */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-4 shadow-xl">
          <h3 className="font-display-lg text-sm font-bold text-white uppercase tracking-wider">Game Popularity Split</h3>
          <div className="space-y-2 text-xs">
            <div>
              <div className="flex justify-between font-bold text-white mb-1">
                <span>Free Fire</span>
                <span className="font-mono text-[#00f2ff]">65%</span>
              </div>
              <div className="w-full bg-[#07090c] h-2 rounded-full overflow-hidden">
                <div className="bg-[#00f2ff] h-full w-[65%]"></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between font-bold text-white mb-1">
                <span>BGMI</span>
                <span className="font-mono text-[#fe6b00]">35%</span>
              </div>
              <div className="w-full bg-[#07090c] h-2 rounded-full overflow-hidden">
                <div className="bg-[#fe6b00] h-full w-[35%]"></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Peak Times Card */}
      <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-3 shadow-xl">
        <h3 className="font-display-lg text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#ffb800]" />
          <span>Peak Registration Time Insights</span>
        </h3>
        <p className="text-xs text-[#e1e2e7] leading-relaxed">
          Peak squad registration volume occurs between <strong className="text-[#00f2ff]">06:00 PM IST – 09:00 PM IST</strong> on Fridays and Saturdays.
        </p>
      </div>

    </div>
  )
}
