import { useState } from 'react'
import { Bell, Send, MessageSquare, Radio, FileText } from 'lucide-react'
import FormInput from '../common/FormInput'
import AuthAlert from '../common/AuthAlert'

export default function NotificationsView() {
  const [broadcastType, setBroadcastType] = useState('Global Announcement')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [alert, setAlert] = useState(null)

  const templates = [
    { title: 'Room Published', body: 'Custom Room ID & Password have been published for your upcoming match. Check your dashboard!' },
    { title: 'Match Starting', body: 'Match starts in 10 minutes! Join the room lobby immediately to avoid DQ.' },
    { title: 'Results Published', body: 'Official points table & final standings have been updated.' },
    { title: 'Scheduled Maintenance', body: 'Platform maintenance scheduled for 02:00 AM IST. All matches will pause.' },
  ]

  const handleApplyTemplate = (tpl) => {
    setTitle(tpl.title)
    setMessage(tpl.body)
  }

  const handleSend = (e) => {
    e.preventDefault()
    if (!title || !message) return
    setAlert({ type: 'success', message: `${broadcastType} broadcasted successfully to all active players!` })
    setTitle('')
    setMessage('')
  }

  return (
    <div className="space-y-6 max-w-3xl">
      
      {/* Header */}
      <div className="space-y-1 border-b border-slate-800 pb-4">
        <h2 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
          <Bell className="w-6 h-6 text-purple-400" />
          <span>ANNOUNCEMENT & NOTIFICATION CENTER</span>
        </h2>
        <p className="text-xs text-slate-400">
          Send global broadcasts, tournament-wide alerts, or direct player notifications using operational templates.
        </p>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* Preset Operational Templates */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Quick Presets & Templates</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {templates.map((tpl, i) => (
            <button
              key={`tpl-${i}`}
              onClick={() => handleApplyTemplate(tpl)}
              className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-left hover:border-purple-500/50 transition-colors text-xs font-bold text-white space-y-1"
            >
              <div className="text-purple-400 text-[10px] uppercase font-bold flex items-center gap-1">
                <FileText className="w-3 h-3 text-purple-400" />
                <span>{tpl.title}</span>
              </div>
              <p className="text-[10px] text-slate-400 font-normal line-clamp-2">{tpl.body}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSend} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300 uppercase">Broadcast Audience Target</label>
          <select
            value={broadcastType}
            onChange={(e) => setBroadcastType(e.target.value)}
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
          >
            <option value="Global Announcement">Global Announcement (All Registered Users)</option>
            <option value="Tournament Announcement">Tournament Announcement (Active Live Participants)</option>
            <option value="Individual Notification">Individual Direct Message</option>
          </select>
        </div>

        <FormInput label="Notification Subject / Title" value={title} onChange={(e) => setTitle(e.target.value)} required />

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300 uppercase">Message Content</label>
          <textarea
            rows="4"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type announcement broadcast body..."
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            required
          />
        </div>

        <button type="submit" className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 min-h-[44px]">
          <Send className="w-4 h-4" />
          <span>Send Live Broadcast</span>
        </button>
      </form>

    </div>
  )
}
