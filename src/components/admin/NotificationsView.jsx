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

  const handleSendNotification = async (e) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) {
      setAlert({ type: 'error', message: 'Notification Headline Title and Message Body are required.' })
      return
    }

    setIsSending(true)
    const payload = {
      type: notificationType,
      target: targetAudience,
      title: title.trim(),
      message: message.trim(),
      created_at: new Date().toISOString(),
    }

    try {
      if (isSupabaseConfigured) {
        await supabase.from('notifications').insert([payload])
      }

      setSentNotifications((prev) => [
        {
          id: 'n-new-' + Date.now(),
          type: notificationType,
          target: targetAudience,
          title: title.trim(),
          message: message.trim(),
          createdAt: 'Just Now',
        },
        ...prev,
      ])

      setAlert({
        type: 'success',
        message: `Notification broadcast sent successfully to target: "${targetAudience}"!`,
      })
      setTitle('')
      setMessage('')
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to dispatch notification.' })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#3a494b]/60 pb-4">
        <div className="space-y-1">
          <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#00f2ff]" />
            <span>COMMUNICATION & BROADCAST CENTER</span>
          </h2>
          <p className="text-xs text-[#8e9dae]">
            Dispatch platform announcements, tournament room ID alerts, and registration status notifications.
          </p>
        </div>

        <button
          onClick={fetchNotificationHistory}
          className="px-3.5 py-2.5 bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] rounded text-xs font-bold text-[#e1e2e7] hover:text-[#00f2ff] transition-all flex items-center gap-1.5 uppercase min-h-[44px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#00f2ff] ${loadingHistory ? 'animate-spin' : ''}`} />
          <span>Sync Log</span>
        </button>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* MAIN LAYOUT: Form + History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* DISPATCH NOTIFICATION FORM */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-5 shadow-xl">
          <div className="flex items-center gap-2 border-b border-[#3a494b]/60 pb-3">
            <Megaphone className="w-4 h-4 text-[#fe6b00]" />
            <h3 className="font-display-lg text-sm font-bold text-white uppercase tracking-wider">
              Dispatch Broadcast Notification
            </h3>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-4 text-xs">
            {/* Category Type Picker */}
            <div className="space-y-1.5">
              <label className="font-label-caps text-[11px] font-bold text-[#8e9dae] uppercase">
                Notification Category Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Send Announcement', icon: Megaphone },
                  { label: 'Tournament Updates', icon: Trophy },
                  { label: 'Registration Updates', icon: ClipboardList },
                ].map((item) => {
                  const Icon = item.icon
                  const selected = notificationType === item.label
                  return (
                    <button
                      key={`nt-${item.label}`}
                      type="button"
                      onClick={() => setNotificationType(item.label)}
                      className={`p-2.5 rounded border text-[11px] font-bold uppercase transition-all flex flex-col items-center gap-1.5 min-h-[50px] ${
                        selected
                          ? 'bg-[#00f2ff] text-[#00363a] border-[#00f2ff] font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.4)]'
                          : 'bg-[#07090c] text-[#8e9dae] border-[#3a494b] hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] text-center leading-tight">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Target Audience Dropdown */}
            <div className="space-y-1.5">
              <label className="font-label-caps text-[11px] font-bold text-[#8e9dae] uppercase">
                Target Recipient Audience
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full p-3 bg-[#07090c] border border-[#3a494b] rounded text-white text-xs font-bold focus:outline-none focus:border-[#00f2ff]"
              >
                <option value="Broadcast to All Users">Broadcast to All Users (Global Announcement)</option>
                <option value="Active Tournament Participants">Active Tournament Participants Only</option>
                <option value="Registered Squads">Registered Squad Captains Only</option>
              </select>
            </div>

            <FormInput
              label="Notification Headline / Title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Free Fire Tournament Room Credentials Published"
              required
            />

            <div className="space-y-1.5">
              <label className="font-label-caps text-[11px] font-bold text-[#8e9dae] uppercase">
                Notification Message Body
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your notification broadcast message..."
                required
                className="w-full p-3 bg-[#07090c] border border-[#3a494b] rounded text-white text-xs placeholder-[#8e9dae] focus:outline-none focus:border-[#00f2ff]"
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="btn-cyber-primary w-full justify-center py-3.5 min-h-[44px]"
            >
              {isSending ? (
                <span>Dispatching Broadcast...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Notification Broadcast</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* BROADCAST LOG & SENT HISTORY */}
        <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-5 sm:p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#3a494b]/60 pb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#00ff9d]" />
                <h3 className="font-display-lg text-sm font-bold text-white uppercase tracking-wider">
                  Dispatched Broadcast Log
                </h3>
              </div>
              <span className="font-mono text-xs text-[#8e9dae] font-bold">{sentNotifications.length} Sent</span>
            </div>

            {loadingHistory ? (
              <div className="p-8 text-center text-[#8e9dae] text-xs space-y-2">
                <div className="w-6 h-6 border-2 border-[#00f2ff] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <span>Loading broadcast log history...</span>
              </div>
            ) : sentNotifications.length === 0 ? (
              <div className="p-8 text-center bg-[#07090c] border border-[#3a494b] rounded-lg text-xs text-[#8e9dae] space-y-2">
                <FileText className="w-8 h-8 text-[#8e9dae] mx-auto" />
                <p className="font-bold text-white">No Broadcast Logs Found</p>
                <p>Sent notifications will be recorded here in real-time.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {sentNotifications.map((item) => (
                  <div key={`n-hist-${item.id}`} className="p-4 bg-[#07090c] border border-[#3a494b]/60 rounded-lg text-xs space-y-2 shadow-md">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30">
                        {item.type}
                      </span>
                      <span className="font-mono text-[10px] text-[#8e9dae] font-semibold">{item.createdAt}</span>
                    </div>

                    <h4 className="font-extrabold text-white text-sm">{item.title}</h4>
                    <p className="text-xs text-[#e1e2e7] leading-relaxed font-mono">{item.message}</p>

                    <div className="pt-2 border-t border-[#3a494b]/40 text-[10px] text-[#8e9dae] flex items-center justify-between">
                      <span>Target: <strong className="text-white">{item.target}</strong></span>
                      <span className="text-[#00ff9d] font-bold uppercase">Dispatched</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  )
}
