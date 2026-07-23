import { Users, Trophy, DollarSign, Award } from 'lucide-react'

const STATS = [
  {
    icon: Users,
    value: '50,000+',
    label: 'REGISTERED PLAYERS',
    color: 'text-purple-400',
  },
  {
    icon: Trophy,
    value: '1,200+',
    label: 'TOURNAMENTS HOSTED',
    color: 'text-cyan-400',
  },
  {
    icon: DollarSign,
    value: '$500,000+',
    label: 'PRIZE POOL DISTRIBUTED',
    color: 'text-emerald-400',
  },
  {
    icon: Award,
    value: '350+',
    label: 'VERIFIED TEAMS',
    color: 'text-yellow-400',
  },
]

export default function StatsSection() {
  return (
    <section className="py-16 bg-slate-900/60 border-y border-slate-800/80 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat, idx) => {
            const Icon = stat.icon
            return (
              <div key={idx} className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 mb-2">
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
                  {stat.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
