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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <span>INCIDENT & DISPUTE REPORTS</span>
          </h2>
          <p className="text-xs text-slate-400">
            Investigate cheating claims, score calculation disputes, fake registration UIDs, and player misconduct.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
          {['All', 'Cheating', 'Wrong Score', 'Fake Registration', 'Abuse', 'Prize Issues'].map((cat) => (
            <button
              key={`cat-${cat}`}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                categoryFilter === cat ? 'bg-purple-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'
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
          <div key={`rep-${r.id}`} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-950 text-amber-400 border border-amber-800">
                  {r.category}
                </span>
                <span className="text-xs font-extrabold text-white">{r.target}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">{r.time}</span>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
              {r.desc}
            </p>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
              <span className="text-slate-400">Filed by: <strong className="text-purple-300">{r.reporter}</strong></span>
              
              <div className="flex gap-2">
                <button onClick={() => handleResolve(r.id)} className="px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
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
