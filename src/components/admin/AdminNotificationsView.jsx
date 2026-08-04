import { useState } from 'react'
import { Bell, Send, CheckCircle2, AlertTriangle, Info, Shield, Filter, Search, Trash2, Mail } from 'lucide-react'
import FormInput from '../common/FormInput'
import AuthAlert from '../common/AuthAlert'
import LoadingButton from '../common/LoadingButton'
import EmptyState from '../common/EmptyState'

export default function AdminNotificationsView() {
  const [activeSubTab, setActiveSubTab] = useState('BROADCAST') // 'BROADCAST' | 'LOGS'
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [alert, setAlert] = useState(null)
  const [filterType, setFilterType] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'info', // 'info' | 'success' | 'warning' | 'payment' | 'room' | 'prize'
    target: 'ALL_PLAYERS', // 'ALL_PLAYERS' | 'CAPTAINS_ONLY' | 'SPECIFIC_USER'
    targetUserEmail: '',
    link: '',
  })

  // Mock Notification Broadcast Logs
  const [notificationLogs, setNotificationLogs] = useState([
    {
      id: 'notif-1',
      title: '🏆 Free Fire Championship Registration Open',
      message: 'Registrations are now live for Season 4! Total prize pool ₹1,00,000.',
      type: 'prize',
      target: 'ALL_PLAYERS',
      sentAt: '2026-08-04 18:30:00',
      recipientCount: 1420,
    },
    {
      id: 'notif-2',
      title: '🔑 Room Credentials Published for BGMI Pro Scrims',
      message: 'Custom room ID and password have been published. Check your match portal.',
      type: 'room',
      target: 'CAPTAINS_ONLY',
      sentAt: '2026-08-04 17:15:00',
      recipientCount: 32,
    },
    {
      id: 'notif-3',
      title: '✅ Wallet Deposit Verified',
      message: 'Your entry fee deposit of ₹100 has been verified and credited.',
      type: 'payment',
      target: 'SPECIFIC_USER',
      sentAt: '2026-08-04 16:00:00',
      recipientCount: 1,
    },
  ])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleBroadcast = (e) => {
    e.preventDefault()
    setAlert(null)

    if (!form.title.trim()) {
      setAlert({ type: 'error', message: 'Notification Title is required.' })
      return
    }

    if (!form.message.trim()) {
      setAlert({ type: 'error', message: 'Notification Message body is required.' })
      return
    }

    setSending(true)
    setTimeout(() => {
      const newLog = {
        id: 'notif-' + Date.now(),
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        target: form.target,
        sentAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        recipientCount: form.target === 'ALL_PLAYERS' ? 1500 : form.target === 'CAPTAINS_ONLY' ? 48 : 1,
      }

      setNotificationLogs((prev) => [newLog, ...prev])
      setAlert({ type: 'success', message: `Broadcast successfully dispatched to target recipients!` })
      setForm({
        title: '',
        message: '',
        type: 'info',
        target: 'ALL_PLAYERS',
        targetUserEmail: '',
        link: '',
      })
      setSending(false)
    }, 600)
  }

  const handleDeleteLog = (id) => {
    setNotificationLogs((prev) => prev.filter((item) => item.id !== id))
  }

  const filteredLogs = notificationLogs.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.message.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'ALL' || item.type === filterType.toLowerCase()
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      
      {/* Sub-Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00f2ff]/10 border border-[#00f2ff]/30 flex items-center justify-center text-[#00f2ff]">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-headline text-base font-black text-white uppercase tracking-wider">
              Notification Broadcast Manager
            </h2>
            <p className="text-xs text-[#a1a1aa] font-mono">Dispatch real-time in-app alerts and view transmission history</p>
          </div>
        </div>

        <div className="flex items-center bg-[#09090b] p-1 rounded-xl border border-[#27272a] text-xs font-mono font-bold">
          <button
            onClick={() => setActiveSubTab('BROADCAST')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeSubTab === 'BROADCAST' ? 'bg-[#00f2ff] text-black font-extrabold' : 'text-[#a1a1aa] hover:text-white'
            }`}
          >
            Create Broadcast
          </button>
          <button
            onClick={() => setActiveSubTab('LOGS')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeSubTab === 'LOGS' ? 'bg-[#00f2ff] text-black font-extrabold' : 'text-[#a1a1aa] hover:text-white'
            }`}
          >
            Broadcast Logs ({notificationLogs.length})
          </button>
        </div>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* SUB-TAB 1: CREATE BROADCAST */}
      {activeSubTab === 'BROADCAST' && (
        <form onSubmit={handleBroadcast} className="bg-[#18181b]/60 backdrop-blur-md border border-[#27272a] rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
            <h3 className="font-headline text-sm font-bold text-[#00f2ff] uppercase tracking-wider flex items-center gap-2">
              <Send className="w-4 h-4" />
              <span>Compose New In-App Notification</span>
            </h3>
            <span className="text-[10px] font-mono text-[#a1a1aa] uppercase">Target: Instant Push Alert</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Notification Title"
              name="title"
              value={form.title}
              onChange={handleInputChange}
              placeholder="e.g. 🏆 Registration Open for Free Fire Cup"
              required
            />

            <div>
              <label className="block text-xs font-mono font-bold text-[#a1a1aa] uppercase mb-1.5">
                Notification Category / Icon
              </label>
              <select
                name="type"
                value={form.type}
                onChange={handleInputChange}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#00f2ff] focus:outline-none h-[42px] font-mono"
              >
                <option value="info">Information (Blue Icon)</option>
                <option value="success">Success / Verified (Green Icon)</option>

                <option value="warning">Warning / Alert (Amber Icon)</option>
                <option value="payment">Payment Deposit / Fee (Cyan Icon)</option>
                <option value="room">Room Credentials (Orange Icon)</option>
                <option value="prize">Prize Pool / Winnings (Gold Icon)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-[#a1a1aa] uppercase mb-1.5">
              Message Content Body
            </label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleInputChange}
              rows={4}
              placeholder="Type the message body that will be displayed in user notification feed..."
              className="w-full bg-[#09090b] border border-[#27272a] rounded-xl p-3 text-xs text-white placeholder-[#71717a] focus:border-[#00f2ff] focus:outline-none font-mono"
              required
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#27272a]">
            <div>
              <label className="block text-xs font-mono font-bold text-[#a1a1aa] uppercase mb-1.5">
                Audience Target
              </label>
              <select
                name="target"
                value={form.target}
                onChange={handleInputChange}
                className="w-full bg-[#09090b] border border-[#27272a] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#00f2ff] focus:outline-none h-[42px] font-mono"
              >
                <option value="ALL_PLAYERS">All Platform Registered Players (Broadcast)</option>
                <option value="CAPTAINS_ONLY">Squad Captains Only</option>
                <option value="SPECIFIC_USER">Specific Player (Email Lookup)</option>
              </select>
            </div>

            {form.target === 'SPECIFIC_USER' ? (
              <FormInput
                label="Target User Email Address"
                name="targetUserEmail"
                value={form.targetUserEmail}
                onChange={handleInputChange}
                placeholder="player@gmail.com"
                icon={Mail}
                required
              />
            ) : (
              <FormInput
                label="Optional Deep Link URL / Route"
                name="link"
                value={form.link}
                onChange={handleInputChange}
                placeholder="/tournaments/t-101 or /wallet"
              />
            )}
          </div>

          <div className="pt-3">
            <LoadingButton
              type="submit"
              loading={sending}
              className="w-full py-3.5 bg-[#00f2ff] hover:bg-[#00c2cc] text-black font-headline font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Send className="w-4 h-4" />
              <span>Send In-App Notification Broadcast</span>
            </LoadingButton>
          </div>
        </form>
      )}

      {/* SUB-TAB 2: BROADCAST LOGS */}
      {activeSubTab === 'LOGS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#18181b]/60 p-4 rounded-xl border border-[#27272a]">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#a1a1aa] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notification history..."
                className="w-full bg-[#09090b] border border-[#27272a] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#71717a] focus:border-[#00f2ff] focus:outline-none font-mono h-[38px]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-[#a1a1aa]" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-[#09090b] border border-[#27272a] rounded-lg px-3 py-2 text-xs text-white focus:border-[#00f2ff] focus:outline-none font-mono h-[38px] w-full sm:w-auto"
              >
                <option value="ALL">All Categories</option>
                <option value="PRIZE">Prize</option>
                <option value="ROOM">Room</option>
                <option value="PAYMENT">Payment</option>
                <option value="INFO">Info</option>
              </select>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <EmptyState
              type="notifications"
              sentence="No broadcast notifications found matching your search filter."
              ctaText="Compose Broadcast"
              onCtaClick={() => setActiveSubTab('BROADCAST')}
            />
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-[#18181b]/60 border border-[#27272a] hover:border-[#00f2ff]/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-md"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-headline font-bold text-sm text-white">{log.title}</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30">
                        {log.target}
                      </span>
                      <span className="text-[10px] font-mono text-[#a1a1aa]">
                        {log.sentAt}
                      </span>
                    </div>
                    <p className="text-xs text-[#a1a1aa] font-mono leading-relaxed">{log.message}</p>
                    <span className="text-[10px] text-[#00ff9d] font-mono font-bold block">
                      Recipients reached: {log.recipientCount} Users
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteLog(log.id)}
                    className="p-2 rounded-lg bg-[#09090b] border border-[#27272a] hover:border-[#ef4444] text-[#a1a1aa] hover:text-[#ef4444] transition-colors shrink-0"
                    title="Delete Notification Log"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
