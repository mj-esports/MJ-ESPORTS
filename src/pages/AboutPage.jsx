import { Swords } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center mx-auto text-indigo-400">
        <Swords className="w-6 h-6" />
      </div>
      <h1 className="text-3xl font-extrabold text-white uppercase tracking-tight">
        About MJ ESPORTS
      </h1>
      <p className="text-slate-400 text-sm max-w-md mx-auto">
        MJ ESPORTS is an elite tournament ecosystem engineered to empower esports teams, streamers, and organizers with automated brackets and secure prize payouts.
      </p>
    </div>
  )
}
