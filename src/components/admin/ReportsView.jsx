import { useState } from 'react'
import { AlertTriangle, ShieldAlert, CheckCircle2, XCircle, Filter } from 'lucide-react'
import AuthAlert from '../common/AuthAlert'

export default function ReportsView() {
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [alert, setAlert] = useState(null)

  const [reports, setReports] = useState([
    { id: 1, category: 'Cheating', reporter: 'Squad Phoenix', target: 'Player #99281', desc: 'Suspicious headshot ratio and auto-aim snapping in Round 2.', status: 'Open', time: '2 hours ago' },
    { id: 2, category: 'Wrong Score', reporter: 'Team Vipers', target: 'Free Fire India Cup', desc: 'Placement points calculated as #4 instead of #3.', status: 'Investigating', time: '5 hours ago' },
    { id: 3, category: 'Fake Registration', reporter: 'System Guard', target: 'Squad Alpha', desc: 'Unregistered Free Fire UID submitted during slot check-in.', status: 'Open', time: '1 day ago' },
  ])

  const handleResolve = (rId) => {
    setReports((prev) => prev.map((r) => (r.id === rId ? { ...r, status: 'Resolved' } : r)))
    setAlert({ type: 'success', message: 'Report marked as Resolved!' })
  }

  const filtered = reports.filter((r) => categoryFilter === 'All' || r.category === categoryFilter)

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3a494b]/60 pb-4">
        <div className="space-y-1">
          <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-[#fe6b00]" />
            <span>INCIDENT & DISPUTE REPORTS</span>
          </h2>
          <p className="text-xs text-[#8e9dae]">
            Investigate cheating claims, score calculation disputes, fake registration UIDs, and player misconduct.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {['All', 'Cheating', 'Wrong Score', 'Fake Registration', 'Abuse', 'Prize Issues'].map((cat) => (
            <button
              key={`cat-${cat}`}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded text-xs font-bold uppercase shrink-0 transition-colors ${
                categoryFilter === cat ? 'bg-[#00f2ff] text-[#00363a] font-extrabold shadow-[0_0_10px_rgba(0,242,255,0.3)]' : 'bg-[#07090c] text-[#8e9dae] border border-[#3a494b]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* Reports Stack */}
      <div className="space-y-4">
        {filtered.map((r) => (
          <div key={`rep-${r.id}`} className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#fe6b00]/10 text-[#fe6b00] border border-[#fe6b00]/40">
                  {r.category}
                </span>
                <span className="font-display-lg text-xs font-extrabold text-white uppercase">{r.target}</span>
              </div>
              <span className="font-mono text-[10px] text-[#8e9dae] font-semibold">{r.time}</span>
            </div>

            <p className="text-xs text-[#e1e2e7] bg-[#07090c] p-3 rounded border border-[#3a494b]/60 leading-relaxed font-mono">
              {r.desc}
            </p>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-[#3a494b]/60">
              <span className="text-[#8e9dae]">Filed by: <strong className="text-[#00f2ff]">{r.reporter}</strong></span>
              
              <div className="flex gap-2">
                <button onClick={() => handleResolve(r.id)} className="px-3 py-1.5 rounded bg-[#00ff9d]/10 hover:bg-[#00ff9d]/20 text-[#00ff9d] border border-[#00ff9d]/40 font-bold uppercase text-[11px] transition-colors">
                  Resolve Dispute
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
