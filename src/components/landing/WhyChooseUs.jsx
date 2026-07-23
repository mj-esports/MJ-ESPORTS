import { ShieldCheck, Zap, Radio, Lock } from 'lucide-react'

const FEATURES = [
  {
    icon: ShieldCheck,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-950/60 border-emerald-800/50',
    title: 'Fair Play Enforcement',
    description: 'Automated anti-cheat verification, ID checks, and strict referee monitoring to ensure clean competition.',
  },
  {
    icon: Zap,
    iconColor: 'text-yellow-400',
    iconBg: 'bg-yellow-950/60 border-yellow-800/50',
    title: 'Fast Registration',
    description: 'Register your team in under 60 seconds with instant slot confirmation and automatic bracket seeding.',
  },
  {
    icon: Radio,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-950/60 border-purple-800/50',
    title: 'Live Results & Streams',
    description: 'Track real-time points tables, live match scores, kill logs, and official high-definition broadcasts.',
  },
  {
    icon: Lock,
    iconColor: 'text-cyan-400',
    iconBg: 'bg-cyan-950/60 border-cyan-800/50',
    title: 'Secure Platform',
    description: 'Automated escrow prize pool management for guaranteed, transparent, and swift payout distributions.',
  },
]

export default function WhyChooseUs() {
  return (
    <section className="py-20 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
            Built For Competitors
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight uppercase">
            WHY CHOOSE MJ ESPORTS
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            We deliver the most reliable, transparent, and high-octane tournament environment for gamers of all skill levels.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon
            return (
              <div
                key={idx}
                className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 hover:border-slate-700 transition-all hover:-translate-y-1 space-y-4"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${feature.iconBg}`}>
                  <Icon className={`w-6 h-6 ${feature.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold text-white">{feature.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
