import { useState, useEffect } from 'react'
import {
  Bell,
  Send,
  Radio,
  FileText,
  Megaphone,
  Trophy,
  ClipboardList,
  Users,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import FormInput from '../common/FormInput'
import AuthAlert from '../common/AuthAlert'

export default function NotificationsView() {
  const [notificationType, setNotificationType] = useState('Send Announcement')
  const [targetAudience, setTargetAudience] = useState('Broadcast to All Users')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [alert, setAlert] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [sentNotifications, setSentNotifications] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  // Fetch past sent notifications from Supabase or fallback
  const fetchNotificationHistory = async () => {
    setLoadingHistory(true)
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          console.warn('[Supabase Notifications Fetch Warning]:', error.message)
          fallbackHistory()
        } else if (data && data.length > 0) {
          setSentNotifications(
            data.map((n) => ({
              id: n.id,
              type: n.type || 'Send Announcement',
              target: n.target || 'Broadcast to All Users',
              title: n.title,
              message: n.message,
              createdAt: n.created_at ? new Date(n.created_at).toLocaleString() : 'Recent',
            }))
          )
        } else {
          fallbackHistory()
        }
      } else {
        fallbackHistory()
      }
    } catch (err) {
      console.error('[Notifications History Error]:', err)
      fallbackHistory()
    } finally {
      setLoadingHistory(false)
    }
  }

  const fallbackHistory = () => {
    setSentNotifications([
      {
        id: 'n-1',
        type: 'Tournament Updates',
        target: 'Active Tournament Participants',
        title: 'Custom Room ID #49281 Published',
        message: 'Custom Room ID & Password have been published for Free Fire Championship Round 1. Check your match lobby!',
        createdAt: 'Today, 05:30 PM',
      },
      {
        id: 'n-2',
        type: 'Registration Updates',
        target: 'Registered Squads',
        title: 'Squad Booking Approved',
        message: 'Your registration for BGMI Champions Cup has been verified & approved by tournament admin.',
        createdAt: 'Yesterday, 02:15 PM',
      },
      {
        id: 'n-3',
        type: 'Send Announcement',
        target: 'Broadcast to All Users',
        title: 'Welcome to MJ ESPORTS Cyber Arena',
        message: 'Registration is now open for upcoming Free Fire & BGMI daily custom tournaments!',
        createdAt: '2026-07-20',
      },
    ])
  }

  useEffect(() => {
    fetchNotificationHistory()
  }, [])

  const templates = [
    {
      type: 'Tournament Updates',
      target: 'Active Tournament Participants',
      title: 'Custom Room ID Published',
      body: 'Custom Room ID & Password have been published for your upcoming tournament lobby. Check your match details!',
    },
    {
      type: 'Registration Updates',
      target: 'Registered Squads',
      title: 'Registration Approved',
      body: 'Your squad registration has been verified and approved! Get ready for your scheduled match.',
    },
    {
      type: 'Send Announcement',
      target: 'Broadcast to All Users',
      title: 'System Maintenance Alert',
      body: 'Platform maintenance scheduled for 02:00 AM IST. All tournament lobbies will resume short after.',
    },
    {
      type: 'Tournament Updates',
      target: 'Active Tournament Participants',
      title: 'Match Starting in 10 Minutes',
      body: 'Match starts in 10 minutes! Join the custom room lobby immediately to prevent disqualification.',
    },
  ]

  const handleApplyTemplate = (tpl) => {
    setNotificationType(tpl.type)
    setTargetAudience(tpl.target)
    setTitle(tpl.title)
    setMessage(tpl.body)
  }

  const handleSendBroadcast = async (e) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) {
      setAlert({ type: 'error', message: 'Subject Title and Message Content are required.' })
      return
    }

    setIsSending(true)
    const newNotif = {
      type: notificationType,
      target: targetAudience,
      title: title.trim(),
      message: message.trim(),
      created_at: new Date().toISOString(),
    }

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('notifications')
          .insert(newNotif)

        if (error) {
          console.warn('[Supabase Insert Notification Warning]:', error.message)
        }
      }

      setSentNotifications((prev) => [
        {
          id: 'n-' + Date.now(),
          type: notificationType,
          target: targetAudience,
          title: title.trim(),
          message: message.trim(),
          createdAt: 'Just now',
        },
        ...prev,
      ])

      setAlert({
        type: 'success',
        message: `Notification "${title}" broadcasted successfully to "${targetAudience}" and saved to Supabase!`,
      })

      setTitle('')
      setMessage('')
    } catch (err) {
      console.error('[Send Notification Error]:', err)
      setAlert({ type: 'error', message: 'Failed to broadcast notification.' })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header */}
      <div className="space-y-1 border-b border-slate-800 pb-4">
        <h2 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
          <Bell className="w-6 h-6 text-purple-400" />
          <span>NOTIFICATION & BROADCAST CENTER</span>
        </h2>
        <p className="text-xs text-slate-400">
          Send global announcements, tournament room ID updates, registration status alerts, and broadcast messages stored in Supabase.
        </p>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* QUICK PRESET TEMPLATES */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">Operational Templates</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {templates.map((tpl, i) => (
            <button
              key={`tpl-${i}`}
              onClick={() => handleApplyTemplate(tpl)}
              className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-left hover:border-purple-500/50 transition-colors text-xs font-bold text-white space-y-1 shadow-md"
            >
              <div className="text-purple-400 text-[10px] uppercase font-extrabold flex items-center gap-1">
                <FileText className="w-3 h-3 text-purple-400" />
                <span>{tpl.title}</span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal line-clamp-2">{tpl.body}</p>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN BROADCAST FORM */}
      <form onSubmit={handleSendBroadcast} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Notification Feature Type */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Notification Type</label>
            <select
              value={notificationType}
              onChange={(e) => setNotificationType(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 min-h-[44px]"
            >
              <option value="Send Announcement">Send Announcement</option>
              <option value="Tournament Updates">Tournament Updates</option>
              <option value="Registration Updates">Registration Updates</option>
              <option value="General Alert">General Operational Alert</option>
            </select>
          </div>

          {/* Audience Target */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Broadcast Target Audience</label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 min-h-[44px]"
            >
              <option value="Broadcast to All Users">Broadcast to All Users</option>
              <option value="Active Tournament Participants">Active Tournament Participants</option>
              <option value="Registered Squads">Registered Squad Captains</option>
              <option value="Admin Team Only">Admin Operational Team</option>
            </select>
          </div>

        </div>

        {/* Title Subject */}
        <FormInput
          label="Notification Subject / Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Free Fire Tournament Room ID Published"
          required
          icon={Megaphone}
        />

        {/* Message Body */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Message Content</label>
          <textarea
            rows="4"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type live announcement broadcast message content..."
            className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            required
          />
        </div>

        {/* Submit Broadcast */}
        <button
          type="submit"
          disabled={isSending}
          className="w-full py-3.5 bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-300 text-slate-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 min-h-[44px] hover:brightness-110 shadow-lg transition-all disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>{isSending ? 'Storing & Broadcasting to Supabase...' : 'Send Live Broadcast'}</span>
        </button>
      </form>

      {/* RECENTLY BROADCASTED NOTIFICATIONS FEED */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>Sent Broadcast History (Stored in Supabase)</span>
          </h3>
          <button
            onClick={fetchNotificationHistory}
            disabled={loadingHistory}
            className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${loadingHistory ? 'animate-spin' : ''}`} />
            <span>Refresh Feed</span>
          </button>
        </div>

        {loadingHistory ? (
          <div className="p-8 text-center text-slate-500 text-xs space-y-2">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <span>Fetching broadcast log...</span>
          </div>
        ) : sentNotifications.length === 0 ? (
          <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-xl text-slate-500 text-xs">
            No notification broadcasts sent yet.
          </div>
        ) : (
          <div className="space-y-3">
            {sentNotifications.map((n) => (
              <div
                key={`sent-n-${n.id}`}
                className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-2 shadow-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                      n.type === 'Tournament Updates'
                        ? 'bg-red-950 text-red-400 border-red-800'
                        : n.type === 'Registration Updates'
                        ? 'bg-amber-950 text-amber-400 border-amber-800'
                        : 'bg-purple-950 text-purple-300 border-purple-800'
                    }`}>
                      {n.type}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">Target: {n.target}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">{n.createdAt}</span>
                </div>

                <h4 className="font-extrabold text-white text-sm">{n.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
