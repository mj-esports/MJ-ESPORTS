import { useState } from 'react'
import { Shield, Search, Filter, Clock, User, AlertTriangle, FileText, CheckCircle2, RefreshCw, Lock, ArrowDownToLine } from 'lucide-react'
import EmptyState from '../common/EmptyState'

export default function AdminAuditLogsView() {
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState('ALL') // 'ALL' | 'INFO' | 'WARNING' | 'CRITICAL'
  const [categoryFilter, setCategoryFilter] = useState('ALL') // 'ALL' | 'TOURNAMENT' | 'PAYMENT' | 'MATCH' | 'SECURITY'

  const [auditLogs, setAuditLogs] = useState([
    {
      id: 'audit-101',
      timestamp: '2026-08-04 18:42:10',
      admin: 'mjesports.team@gmail.com',
      action: 'PUBLISH_ROOM_CREDENTIALS',
      category: 'MATCH',
      severity: 'INFO',
      details: 'Published Room ID: 984102, Pass: 7781 for tournament "BGMI Pro Scrims T1".',
      ip: '103.24.12.89',
    },
    {
      id: 'audit-102',
      timestamp: '2026-08-04 18:15:30',
      admin: 'mjesports.team@gmail.com',
      action: 'APPROVE_PAYMENT_PROOF',
      category: 'PAYMENT',
      severity: 'INFO',
      details: 'Approved payment proof transaction ID TXN-998214 for squad "Team SouL".',
      ip: '103.24.12.89',
    },
    {
      id: 'audit-103',
      timestamp: '2026-08-04 17:50:00',
      admin: 'mjesports.team@gmail.com',
      action: 'START_MATCH_LOBBY',
      category: 'MATCH',
      severity: 'INFO',
      details: 'Updated match status to LIVE for tournament "Weekly Showdown #45".',
      ip: '103.24.12.89',
    },
    {
      id: 'audit-104',
      timestamp: '2026-08-04 16:30:12',
      admin: 'mjesports.team@gmail.com',
      action: 'SUSPEND_PLAYER_ACCOUNT',
      category: 'SECURITY',
      severity: 'WARNING',
      details: 'Suspended player account UID: 88210349 for toxic chat violation.',
      ip: '103.24.12.89',
    },
    {
      id: 'audit-105',
      timestamp: '2026-08-04 15:10:45',
      admin: 'mjesports.team@gmail.com',
      action: 'REJECT_PAYMENT_PROOF',
      category: 'PAYMENT',
      severity: 'WARNING',
      details: 'Rejected unverified UPI payment screenshot for user player392@gmail.com.',
      ip: '103.24.12.89',
    },
    {
      id: 'audit-106',
      timestamp: '2026-08-04 14:00:00',
      admin: 'SYSTEM_AUTOSCALER',
      action: 'ADMIN_PROMOTION_VERIFIED',
      category: 'SECURITY',
      severity: 'CRITICAL',
      details: 'Verified RBAC admin privileges for mjesports.team@gmail.com in public.user_roles.',
      ip: '127.0.0.1',
    },
  ])

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.admin.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSeverity = severityFilter === 'ALL' || log.severity === severityFilter
    const matchesCategory = categoryFilter === 'ALL' || log.category === categoryFilter
    return matchesSearch && matchesSeverity && matchesCategory
  })

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/40'
      case 'WARNING':
        return 'bg-[#fe6b00]/10 text-[#fe6b00] border-[#fe6b00]/40'
      default:
        return 'bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/40'
    }
  }

  const exportAuditCSV = () => {
    const headers = ['ID,Timestamp,Admin,Action,Category,Severity,Details,IP']
    const rows = filteredLogs.map((l) =>
      `"${l.id}","${l.timestamp}","${l.admin}","${l.action}","${l.category}","${l.severity}","${l.details.replace(/"/g, '""')}","${l.ip}"`
    )
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `mj_esports_audit_logs_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-headline text-base font-black text-white uppercase tracking-wider">
              Administrative Audit Telemetry
            </h2>
            <p className="text-xs text-[#a1a1aa] font-mono">Immutable audit record of all administrative actions & security events</p>
          </div>
        </div>

        <button
          onClick={exportAuditCSV}
          className="px-4 py-2 bg-[#09090b] hover:bg-[#27272a] text-[#00f2ff] border border-[#27272a] hover:border-[#00f2ff] rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 min-h-[44px]"
        >
          <ArrowDownToLine className="w-4 h-4" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#18181b]/60 p-4 rounded-xl border border-[#27272a]">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#a1a1aa] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audit actions or admins..."
            className="w-full bg-[#09090b] border border-[#27272a] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#71717a] focus:border-[#00f2ff] focus:outline-none font-mono h-[38px]"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-[#00f2ff] focus:outline-none font-mono h-[38px] w-full sm:w-auto"
          >
            <option value="ALL">All Categories</option>
            <option value="MATCH">Match Ops</option>
            <option value="PAYMENT">Payment Verification</option>
            <option value="SECURITY">Security & RBAC</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-[#00f2ff] focus:outline-none font-mono h-[38px] w-full sm:w-auto"
          >
            <option value="ALL">All Severities</option>
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table / Cards */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          type="search"
          sentence="No administrative audit records match your filter criteria."
          ctaText="Reset Audit Filters"
          onCtaClick={() => {
            setSearchQuery('')
            setSeverityFilter('ALL')
            setCategoryFilter('ALL')
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="bg-[#18181b]/60 border border-[#27272a] hover:border-[#00f2ff]/40 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all shadow-md font-mono"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(log.severity)}`}>
                    {log.severity}
                  </span>
                  <span className="font-extrabold text-xs text-white uppercase">{log.action}</span>
                  <span className="text-[10px] text-[#a1a1aa]">&bull; {log.category}</span>
                </div>
                <p className="text-xs text-[#a1a1aa] leading-relaxed">{log.details}</p>
                <div className="flex items-center gap-4 text-[10px] text-[#71717a] pt-1">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-[#00f2ff]" />
                    {log.admin}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#a1a1aa]" />
                    {log.timestamp}
                  </span>
                  <span>IP: {log.ip}</span>
                </div>
              </div>

              <div className="shrink-0">
                <span className="text-[10px] text-[#00ff9d] font-bold bg-[#00ff9d]/10 border border-[#00ff9d]/30 px-2.5 py-1 rounded">
                  LOGGED
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
