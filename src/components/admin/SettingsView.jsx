import { useState, useMemo } from 'react'
import {
  Settings,
  Mail,
  Globe,
  Bell,
  Clock,
  CircleDollarSign,
  Gamepad2,
  Share2,
  Server,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Sparkles,
  Shield,
  Info
} from 'lucide-react'
import AuthAlert from '../common/AuthAlert'
import LoadingButton from '../common/LoadingButton'
import { useToast } from '../../contexts/ToastContext'
import {
  isValidEmail,
  isValidUrl,
  sanitizeString,
  isEndDateAfterStartDate
} from '../../utils/validationUtils'

function WhatsAppIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.461c-1.852 0-3.67-.498-5.266-1.442l-.377-.225-3.916 1.027 1.045-3.817-.247-.392a9.78 9.78 0 01-1.503-5.228c0-5.405 4.398-9.802 9.805-9.802 2.617 0 5.078 1.022 6.929 2.873 1.85 1.852 2.87 4.311 2.868 6.929 0 5.407-4.398 9.805-9.805 9.805m0-18.005a11.94 11.94 0 00-8.455 3.504 11.94 11.94 0 00-3.502 8.455c0 2.102.547 4.155 1.587 5.968l-1.687 6.163 6.305-1.654a11.905 11.905 0 005.752 1.481h.005c6.586 0 11.946-5.36 11.948-11.946 0-3.19-1.243-6.189-3.502-8.449A11.905 11.905 0 0012.051 3.837" />
    </svg>
  )
}

function InstagramIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

const STORAGE_KEY = 'mj_esports_admin_settings'

const DEFAULT_SETTINGS = {
  // Section A: General
  platformTitle: 'MJ ESPORTS Pro Arena',
  supportEmail: 'support.mjesports@gmail.com',
  timezone: 'Asia/Kolkata',
  currency: 'INR',

  // Section B: Branding & Public Content
  platformTagline: "India's Premier Battle Royale Tournament Arena",
  bannerEnabled: true,
  announcementBanner: '🔥 Free Fire India Championship 2026 Registration is NOW OPEN! Total Prize Pool: ₹5,00,000!',
  announcementStartAt: '',
  announcementEndAt: '',

  // Section C: Social Channels (WhatsApp & Instagram only)
  whatsappUrl: '',
  instagramUrl: '',

  // Section D: Tournament Defaults
  defaultGame: 'Free Fire MAX',
  defaultFormat: 'Squad (4P)',
  defaultRegistrationStatus: 'Open',

  // Section E: System / Platform
  platformStatus: 'Operational', // 'Operational' | 'Maintenance'
}

const SECTIONS = [
  { id: 'general', label: 'General', subtitle: 'Platform & locale settings', icon: Globe },
  { id: 'branding', label: 'Branding & Content', subtitle: 'Public identity & announcements', icon: Sparkles },
  { id: 'social', label: 'Social Channels', subtitle: 'Community & streams', icon: Share2 },
  { id: 'tournaments', label: 'Tournament Defaults', subtitle: 'Creation presets', icon: Gamepad2 },
  { id: 'system', label: 'System & Platform', subtitle: 'Status & security', icon: Server },
]

export default function SettingsView() {
  const { showSuccess, showError } = useToast()
  const [activeSection, setActiveSection] = useState('general')

  // Initial loaded settings
  const loadInitialSettings = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)

        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          platformTitle: parsed.platformTitle || parsed.brandName || DEFAULT_SETTINGS.platformTitle,
          supportEmail: parsed.supportEmail || DEFAULT_SETTINGS.supportEmail,
          whatsappUrl: parsed.whatsappUrl || '',
          instagramUrl: parsed.instagramUrl || '',
        }
      }
    } catch (err) {
      console.warn('[SettingsView] Failed to parse stored settings:', err)
    }
    return DEFAULT_SETTINGS
  }

  const [savedSettings, setSavedSettings] = useState(loadInitialSettings)
  const [settings, setSettings] = useState(loadInitialSettings)
  const [errors, setErrors] = useState({})
  const [alert, setAlert] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  // Check if there are unsaved edits
  const isDirty = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(savedSettings)
  }, [settings, savedSettings])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }))
    }
  }

  const handleReset = () => {
    setSettings(savedSettings)
    setErrors({})
    setAlert(null)
    showSuccess('Unsaved changes reverted to last saved configuration.', 'Reset Complete')
  }

  const handleSave = (e) => {
    if (e) e.preventDefault()
    setAlert(null)
    const errs = {}

    const cleanTitle = sanitizeString(settings.platformTitle)
    const cleanEmail = sanitizeString(settings.supportEmail)
    const cleanTagline = sanitizeString(settings.platformTagline)

    // Validation: Platform Title
    if (!cleanTitle) {
      errs.platformTitle = 'Platform title is required'
    }

    // Validation: Support Email
    if (!cleanEmail) {
      errs.supportEmail = 'Official public support email is required'
    } else if (!isValidEmail(cleanEmail)) {
      errs.supportEmail = 'Please enter a valid email address (e.g. support@domain.com)'
    }

    // Validation: Social Channels (WhatsApp & Instagram - Optional / Empty allowed, but valid if provided)
    if (settings.whatsappUrl && settings.whatsappUrl.trim()) {
      if (!isValidUrl(settings.whatsappUrl.trim())) {
        errs.whatsappUrl = 'Please enter a valid HTTP/HTTPS URL (e.g. https://chat.whatsapp.com/...)'
      }
    }

    if (settings.instagramUrl && settings.instagramUrl.trim()) {
      if (!isValidUrl(settings.instagramUrl.trim())) {
        errs.instagramUrl = 'Please enter a valid HTTP/HTTPS URL (e.g. https://instagram.com/...)'
      }
    }

    // Validation: Announcement Dates
    if (settings.announcementStartAt && settings.announcementEndAt) {
      if (!isEndDateAfterStartDate(settings.announcementStartAt, settings.announcementEndAt)) {
        errs.announcementEndAt = 'Announcement end date cannot be earlier than start date'
      }
    }

    setErrors(errs)

    if (Object.keys(errs).length > 0) {
      const firstError = Object.values(errs)[0]
      setAlert({ type: 'error', message: firstError || 'Please correct the highlighted validation errors.' })
      showError(firstError || 'Validation failed. Please review settings.', 'Validation Error')
      return
    }

    setIsSaving(true)

    try {
      const payload = {
        ...settings,
        platformTitle: cleanTitle,
        platformTagline: cleanTagline,
        supportEmail: cleanEmail,
        whatsappUrl: settings.whatsappUrl ? settings.whatsappUrl.trim() : '',
        instagramUrl: settings.instagramUrl ? settings.instagramUrl.trim() : '',
        lastUpdated: new Date().toISOString(),
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      setSavedSettings(payload)

      setTimeout(() => {
        setIsSaving(false)
        setAlert({
          type: 'success',
          message: 'Operational settings saved and applied successfully!',
        })
        showSuccess('Platform operational settings saved successfully.', 'Settings Saved')
      }, 350)
    } catch (saveErr) {
      setIsSaving(false)
      const errorMsg = saveErr.message || 'Failed to save operational settings.'
      setAlert({ type: 'error', message: errorMsg })
      showError(errorMsg, 'Save Failed')
    }
  }

  return (
    <div className="space-y-6 font-body antialiased">
      
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-tight">
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-[#849495] font-body mt-1">
            Platform configuration, public content, tournament defaults and operational controls.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#10b981]/10 border border-[#10b981]/30 rounded text-xs font-mono font-bold text-[#10b981] uppercase">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span>OPERATIONAL</span>
          </div>
        </div>
      </div>

      {/* Subtle Divider */}
      <div className="h-px bg-[#27272a] w-full" />

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      {/* 2. TWO-COLUMN SETTINGS LAYOUT */}
      <div className="flex flex-col lg:flex-row items-start gap-6">

        {/* LEFT: COMPACT SETTINGS NAVIGATION */}
        <div className="w-full lg:w-64 shrink-0">
          {/* Desktop Vertical Menu */}
          <div className="hidden lg:flex flex-col space-y-1 bg-[#141416] border border-[#27272a] rounded-lg p-2 shadow-xl">
            {SECTIONS.map((sec) => {
              const Icon = sec.icon
              const isActive = activeSection === sec.id
              return (
                <button
                  key={`sec-${sec.id}`}
                  onClick={() => setActiveSection(sec.id)}
                  className={`w-full text-left p-3 rounded transition-all cursor-pointer flex items-center gap-3 ${
                    isActive
                      ? 'bg-[#00f2ff]/10 text-[#00f2ff] border-l-2 border-[#00f2ff] shadow-[inset_0_0_12px_rgba(0,242,255,0.05)] font-bold'
                      : 'text-[#849495] hover:text-white hover:bg-[#1c1b1c] border-l-2 border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#00f2ff]' : 'text-[#849495]'}`} />
                  <div>
                    <div className="font-headline text-xs uppercase font-extrabold tracking-wider">{sec.label}</div>
                    <div className="text-[10px] text-[#849495] font-body lowercase first-letter:uppercase truncate max-w-[150px]">
                      {sec.subtitle}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Mobile Horizontal Tabs */}
          <div className="lg:hidden flex overflow-x-auto gap-2 pb-1 scrollbar-hide w-full border-b border-[#27272a]">
            {SECTIONS.map((sec) => {
              const Icon = sec.icon
              const isActive = activeSection === sec.id
              return (
                <button
                  key={`sec-m-${sec.id}`}
                  onClick={() => setActiveSection(sec.id)}
                  className={`px-3.5 py-2.5 rounded-t text-xs font-headline font-bold uppercase whitespace-nowrap flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#00f2ff] text-[#00f2ff] bg-[#141416]'
                      : 'border-transparent text-[#849495] hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sec.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* RIGHT: SELECTED SETTINGS SECTION */}
        <div className="flex-1 w-full space-y-6">

          <form onSubmit={handleSave} noValidate className="space-y-6">

            {/* SECTION 1: GENERAL */}
            {activeSection === 'general' && (
              <div className="bg-[#141416] border border-[#27272a] rounded-lg p-5 sm:p-6 space-y-6 shadow-xl animate-fadeIn">
                <div className="border-b border-[#27272a] pb-4">
                  <h2 className="font-headline text-base sm:text-lg font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#00f2ff]" />
                    <span>General</span>
                  </h2>
                  <p className="text-xs text-[#849495] font-body mt-1">
                    Core platform identity and regional configuration.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Platform Title */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-headline font-bold text-white uppercase tracking-wider block">
                      Platform Title <span className="text-[#ff5e07]">*</span>
                    </label>
                    <input
                      type="text"
                      name="platformTitle"
                      value={settings.platformTitle}
                      onChange={handleChange}
                      placeholder="e.g. MJ ESPORTS Pro Arena"
                      className={`w-full px-3.5 py-2.5 bg-[#1c1b1c] border rounded-lg text-xs font-bold text-white focus:outline-none transition-colors ${
                        errors.platformTitle ? 'border-red-500 focus:border-red-400' : 'border-[#27272a] focus:border-[#00f2ff]'
                      }`}
                    />
                    <p className="text-[11px] text-[#849495] font-body">
                      Public platform name used throughout the admin and player experience.
                    </p>
                    {errors.platformTitle && <p className="text-[11px] text-red-400 font-body">{errors.platformTitle}</p>}
                  </div>

                  {/* Support Email */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-headline font-bold text-white uppercase tracking-wider block">
                      Support Email <span className="text-[#ff5e07]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        name="supportEmail"
                        value={settings.supportEmail}
                        onChange={handleChange}
                        placeholder="e.g. support.mjesports@gmail.com"
                        className={`w-full pl-9 pr-3.5 py-2.5 bg-[#1c1b1c] border rounded-lg text-xs font-mono font-bold text-white focus:outline-none transition-colors ${
                          errors.supportEmail ? 'border-red-500 focus:border-red-400' : 'border-[#27272a] focus:border-[#00f2ff]'
                        }`}
                      />
                      <Mail className="w-4 h-4 text-[#849495] absolute left-3 top-3 pointer-events-none" />
                    </div>
                    <p className="text-[11px] text-[#849495] font-body">
                      Official public support email for player disputes and tournament inquiries.
                    </p>
                    {errors.supportEmail && <p className="text-[11px] text-red-400 font-body">{errors.supportEmail}</p>}
                  </div>

                  {/* Timezone */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-headline font-bold text-white uppercase tracking-wider block flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#00f2ff]" />
                      <span>Timezone</span>
                    </label>
                    <select
                      name="timezone"
                      value={settings.timezone}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-xs font-mono font-bold text-[#00f2ff] focus:outline-none focus:border-[#00f2ff] cursor-pointer"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST &bull; UTC+05:30)</option>
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST &bull; UTC+04:00)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT &bull; UTC+08:00)</option>
                    </select>
                    <p className="text-[11px] text-[#849495] font-body">
                      Platform-wide reference timezone for schedules, deadlines, and room releases.
                    </p>
                  </div>

                  {/* Currency */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-headline font-bold text-white uppercase tracking-wider block flex items-center gap-1.5">
                      <CircleDollarSign className="w-3.5 h-3.5 text-[#10b981]" />
                      <span>Currency</span>
                    </label>
                    <select
                      name="currency"
                      value={settings.currency}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-xs font-mono font-bold text-[#10b981] focus:outline-none focus:border-[#00f2ff] cursor-pointer"
                    >
                      <option value="INR">INR (₹ &bull; Indian Rupee)</option>
                      <option value="USD">USD ($ &bull; US Dollar)</option>
                      <option value="AED">AED (د.إ &bull; UAE Dirham)</option>
                    </select>
                    <p className="text-[11px] text-[#849495] font-body">
                      Standard transaction and prize pool display denomination.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: BRANDING & PUBLIC CONTENT */}
            {activeSection === 'branding' && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* SUB-CARD A: PLATFORM BRANDING */}
                <div className="bg-[#141416] border border-[#27272a] rounded-lg p-5 sm:p-6 space-y-4 shadow-xl">
                  <div className="border-b border-[#27272a] pb-3">
                    <h2 className="font-headline text-sm font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#00f2ff]" />
                      <span>Platform Branding</span>
                    </h2>
                    <p className="text-xs text-[#849495] font-body mt-0.5">
                      Control public-facing platform identity and announcements.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-headline font-bold text-white uppercase tracking-wider block">
                        Platform Title
                      </label>
                      <input
                        type="text"
                        name="platformTitle"
                        value={settings.platformTitle}
                        onChange={handleChange}
                        placeholder="e.g. MJ ESPORTS Pro Arena"
                        className="w-full px-3.5 py-2.5 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-xs font-bold text-white focus:outline-none focus:border-[#00f2ff]"
                      />
                      <p className="text-[11px] text-[#849495] font-body">Primary brand headline.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-headline font-bold text-white uppercase tracking-wider block">
                        Platform Tagline
                      </label>
                      <input
                        type="text"
                        name="platformTagline"
                        value={settings.platformTagline}
                        onChange={handleChange}
                        placeholder="e.g. India's Premier Battle Royale Tournament Arena"
                        className="w-full px-3.5 py-2.5 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-xs font-bold text-white focus:outline-none focus:border-[#00f2ff]"
                      />
                      <p className="text-[11px] text-[#849495] font-body">Subheading for landing pages and promotional rules.</p>
                    </div>
                  </div>
                </div>

                {/* SUB-CARD B: ANNOUNCEMENT BANNER */}
                <div className="bg-[#141416] border border-[#27272a] rounded-lg p-5 sm:p-6 space-y-4 shadow-xl">
                  {/* Status Row */}
                  <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
                    <div>
                      <h3 className="font-headline text-sm font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
                        <Bell className="w-4 h-4 text-[#fed83a]" />
                        <span>Announcement Banner</span>
                      </h3>
                      <p className="text-xs text-[#849495] font-body mt-0.5">
                        Global top ticker broadcasted across all platform pages.
                      </p>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <span className={`px-2.5 py-1 rounded text-[11px] font-headline font-extrabold uppercase border ${
                        settings.bannerEnabled
                          ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {settings.bannerEnabled ? 'ON' : 'OFF'}
                      </span>
                      <input
                        type="checkbox"
                        id="bannerEnabled"
                        name="bannerEnabled"
                        checked={settings.bannerEnabled}
                        onChange={handleChange}
                        className="w-4 h-4 rounded bg-[#1c1b1c] border-[#27272a] text-[#00f2ff] focus:ring-[#00f2ff] cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* Announcement Message */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-headline font-bold text-white uppercase tracking-wider block">
                      Announcement Message
                    </label>
                    <textarea
                      name="announcementBanner"
                      value={settings.announcementBanner}
                      onChange={handleChange}
                      rows={2}
                      placeholder="Enter announcement text to broadcast..."
                      className="w-full px-3.5 py-2.5 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-xs text-white focus:outline-none focus:border-[#00f2ff] resize-none"
                    />
                  </div>

                  {/* Schedule Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-headline font-bold text-white uppercase tracking-wider block flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#00f2ff]" />
                        <span>Start Date</span>
                      </label>
                      <input
                        type="date"
                        name="announcementStartAt"
                        value={settings.announcementStartAt}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-xs text-white focus:outline-none focus:border-[#00f2ff]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-headline font-bold text-white uppercase tracking-wider block flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#ff5e07]" />
                        <span>End Date</span>
                      </label>
                      <input
                        type="date"
                        name="announcementEndAt"
                        value={settings.announcementEndAt}
                        onChange={handleChange}
                        className={`w-full px-3.5 py-2 bg-[#1c1b1c] border rounded-lg text-xs text-white focus:outline-none ${
                          errors.announcementEndAt ? 'border-red-500 focus:border-red-400' : 'border-[#27272a] focus:border-[#00f2ff]'
                        }`}
                      />
                      {errors.announcementEndAt && <p className="text-[10px] text-red-400 font-body">{errors.announcementEndAt}</p>}
                    </div>
                  </div>

                  {/* Public Preview Live Box */}
                  <div className="pt-2">
                    <div className="p-3.5 bg-[#1c1b1c] border border-[#27272a] rounded-lg space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-headline font-bold uppercase tracking-wider text-[#849495]">
                        <span>PUBLIC PREVIEW</span>
                        <span>{settings.bannerEnabled ? 'STATUS: LIVE' : 'STATUS: HIDDEN'}</span>
                      </div>
                      
                      <div className="h-px bg-[#27272a] w-full" />

                      {settings.bannerEnabled ? (
                        <div className="p-3 bg-[#00f2ff]/10 border border-[#00f2ff]/30 rounded text-xs text-white flex items-center gap-2.5">
                          <Bell className="w-4 h-4 text-[#00f2ff] shrink-0" />
                          <span className="font-body text-xs font-semibold">
                            {settings.announcementBanner || 'No announcement message entered.'}
                          </span>
                        </div>
                      ) : (
                        <div className="p-3 bg-[#141416] border border-[#27272a] rounded text-xs text-[#849495] italic font-body">
                          Announcement banner is currently turned OFF. Enable toggle to display ticker on platform header.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* SECTION 3: SOCIAL CHANNELS */}
            {activeSection === 'social' && (
              <div className="bg-[#141416] border border-[#27272a] rounded-lg p-5 sm:p-6 space-y-5 shadow-xl animate-fadeIn">
                <div className="border-b border-[#27272a] pb-4">
                  <h2 className="font-headline text-base sm:text-lg font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-[#00f2ff]" />
                    <span>Social Channels</span>
                  </h2>
                  <p className="text-xs text-[#849495] font-body mt-1">
                    Manage official MJ ESPORTS community destinations.
                  </p>
                </div>

                <div className="p-3 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-xs text-[#849495] font-body">
                  Leave blank if the platform is not currently configured.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* WhatsApp */}
                  <div className="p-4 bg-[#1c1b1c] border border-[#27272a] rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-headline text-xs font-bold text-white uppercase flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-center text-[#25D366]">
                          <WhatsAppIcon className="w-3.5 h-3.5" />
                        </div>
                        <span>WhatsApp</span>
                      </span>
                      <span className="text-[10px] font-mono">
                        {settings.whatsappUrl ? (
                          <span className="px-2 py-0.5 rounded bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40 uppercase font-bold">Configured</span>
                        ) : (
                          <span className="text-[#849495] italic">Not configured</span>
                        )}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <input
                        type="url"
                        name="whatsappUrl"
                        value={settings.whatsappUrl}
                        onChange={handleChange}
                        placeholder="https://chat.whatsapp.com/yourcommunity"
                        className={`w-full px-3.5 py-2.5 bg-[#141416] border rounded-lg text-xs font-mono text-white focus:outline-none transition-colors ${
                          errors.whatsappUrl ? 'border-red-500 focus:border-red-400' : 'border-[#27272a] focus:border-[#00f2ff]'
                        }`}
                      />
                      <p className="text-[11px] text-[#849495] font-body">
                        Official MJ ESPORTS WhatsApp community / channel link.
                      </p>
                      {errors.whatsappUrl && <p className="text-[10px] text-red-400 font-body">{errors.whatsappUrl}</p>}
                    </div>
                  </div>

                  {/* Instagram */}
                  <div className="p-4 bg-[#1c1b1c] border border-[#27272a] rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-headline text-xs font-bold text-white uppercase flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-[#E4405F]/10 border border-[#E4405F]/30 flex items-center justify-center text-[#E4405F]">
                          <InstagramIcon className="w-3.5 h-3.5" />
                        </div>
                        <span>Instagram</span>
                      </span>
                      <span className="text-[10px] font-mono">
                        {settings.instagramUrl ? (
                          <span className="px-2 py-0.5 rounded bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40 uppercase font-bold">Configured</span>
                        ) : (
                          <span className="text-[#849495] italic">Not configured</span>
                        )}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <input
                        type="url"
                        name="instagramUrl"
                        value={settings.instagramUrl}
                        onChange={handleChange}
                        placeholder="https://instagram.com/mjesports"
                        className={`w-full px-3.5 py-2.5 bg-[#141416] border rounded-lg text-xs font-mono text-white focus:outline-none transition-colors ${
                          errors.instagramUrl ? 'border-red-500 focus:border-red-400' : 'border-[#27272a] focus:border-[#00f2ff]'
                        }`}
                      />
                      <p className="text-[11px] text-[#849495] font-body">
                        Official MJ ESPORTS Instagram profile link.
                      </p>
                      {errors.instagramUrl && <p className="text-[10px] text-red-400 font-body">{errors.instagramUrl}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 4: TOURNAMENT DEFAULTS */}
            {activeSection === 'tournaments' && (
              <div className="bg-[#141416] border border-[#27272a] rounded-lg p-5 sm:p-6 space-y-5 shadow-xl animate-fadeIn">
                <div className="border-b border-[#27272a] pb-4">
                  <h2 className="font-headline text-base sm:text-lg font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
                    <Gamepad2 className="w-4 h-4 text-[#10b981]" />
                    <span>Tournament Defaults</span>
                  </h2>
                  <p className="text-xs text-[#849495] font-body mt-1">
                    Defaults applied when creating new tournaments.
                  </p>
                </div>

                {/* Informational Notice */}
                <div className="p-4 bg-[#00f2ff]/5 border border-[#00f2ff]/20 rounded-lg flex items-start gap-3 text-xs text-[#849495]">
                  <Info className="w-4 h-4 text-[#00f2ff] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong className="text-white font-headline uppercase">Notice:</strong> These defaults are used when creating a new tournament. Changing them does not modify existing tournaments.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Default Game */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-headline font-bold text-white uppercase tracking-wider block">
                      Default Game
                    </label>
                    <select
                      name="defaultGame"
                      value={settings.defaultGame}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-xs font-headline font-bold text-white focus:outline-none focus:border-[#00f2ff] cursor-pointer"
                    >
                      <option value="Free Fire MAX">Free Fire MAX</option>
                      <option value="BGMI">Battlegrounds Mobile India (BGMI)</option>
                    </select>
                    <p className="text-[11px] text-[#849495] font-body">Preset selection for new bracket setups.</p>
                  </div>

                  {/* Default Format */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-headline font-bold text-white uppercase tracking-wider block">
                      Default Format
                    </label>
                    <select
                      name="defaultFormat"
                      value={settings.defaultFormat}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-xs font-headline font-bold text-white focus:outline-none focus:border-[#00f2ff] cursor-pointer"
                    >
                      <option value="Squad (4P)">Squad (4P)</option>
                      <option value="Duo (2P)">Duo (2P)</option>
                      <option value="Solo (1P)">Solo (1P)</option>
                    </select>
                    <p className="text-[11px] text-[#849495] font-body">Squad size configuration default.</p>
                  </div>

                  {/* Default Registration Status */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-headline font-bold text-white uppercase tracking-wider block">
                      Default Registration Status
                    </label>
                    <select
                      name="defaultRegistrationStatus"
                      value={settings.defaultRegistrationStatus}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 bg-[#1c1b1c] border border-[#27272a] rounded-lg text-xs font-headline font-bold text-[#00f2ff] focus:outline-none focus:border-[#00f2ff] cursor-pointer"
                    >
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                    </select>
                    <p className="text-[11px] text-[#849495] font-body">Initial status upon wizard completion.</p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 5: SYSTEM & PLATFORM */}
            {activeSection === 'system' && (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Main System Section Card */}
                <div className="bg-[#141416] border border-[#27272a] rounded-lg p-5 sm:p-6 space-y-5 shadow-xl">
                  <div className="border-b border-[#27272a] pb-4">
                    <h2 className="font-headline text-base sm:text-lg font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
                      <Server className="w-4 h-4 text-[#00f2ff]" />
                      <span>System & Platform</span>
                    </h2>
                    <p className="text-xs text-[#849495] font-body mt-1">
                      System information, administrative boundaries and platform configuration status.
                    </p>
                  </div>

                  {/* CARD 1 — PLATFORM STATUS */}
                  <div className="p-4 bg-[#1c1b1c] border border-[#27272a] rounded-lg space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-headline font-bold text-[#849495] uppercase tracking-wider block">
                          Platform Status
                        </span>
                        <div className="font-headline font-extrabold text-base text-white flex items-center gap-2 mt-1">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
                          <span>Operational</span>
                        </div>
                      </div>
                      <div>
                        <span className="px-2.5 py-1 bg-[#141416] border border-[#27272a] text-[#849495] text-[10px] font-headline font-bold uppercase tracking-wider rounded">
                          STATUS INFORMATION
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#849495] font-body leading-relaxed">
                      Current platform configuration status. Operational controls such as maintenance mode will be introduced separately when backend enforcement is implemented.
                    </p>
                  </div>
                </div>

                {/* CARD 2 — ADMIN ACCESS & SECURITY */}
                <div className="bg-[#141416] border border-[#27272a] rounded-lg p-5 sm:p-6 space-y-4 shadow-xl">
                  <div className="border-b border-[#27272a] pb-3">
                    <h3 className="font-headline text-sm sm:text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#00f2ff]" />
                      <span>ADMIN ACCESS & SECURITY</span>
                    </h3>
                  </div>

                  <ul className="space-y-2.5 text-xs text-[#849495] font-body">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
                      <span className="leading-relaxed">Settings are restricted to authorized administrators.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
                      <span className="leading-relaxed">Sensitive payment and backend credentials are never stored in client-side settings.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
                      <span className="leading-relaxed">Razorpay secrets and Supabase service credentials remain server-side.</span>
                    </li>
                  </ul>
                </div>

              </div>
            )}

            {/* 8. SECTION-LEVEL ACTION BAR */}
            <div className="p-4 bg-[#141416] border border-[#27272a] rounded-lg shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs font-body text-[#849495] flex items-center gap-2">
                {isDirty ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#ff5e07]" />
                    <span className="text-[#ff5e07] font-bold">Unsaved changes detected</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
                    <span>All changes saved to configuration</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={!isDirty || isSaving}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-[#1c1b1c] hover:bg-[#27272a] disabled:opacity-40 text-[#849495] hover:text-white border border-[#27272a] rounded text-xs font-headline font-bold uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Changes</span>
                </button>

                <LoadingButton
                  type="submit"
                  loading={isSaving}
                  loadingText="Saving..."
                  className="flex-1 sm:flex-initial px-6 py-2.5 bg-[#00f2ff] hover:bg-[#00f2ff]/90 text-[#00363a] rounded text-xs font-headline font-extrabold uppercase transition-all shadow-[0_0_15px_rgba(0,242,255,0.3)] flex items-center justify-center gap-2 cursor-pointer min-h-[40px]"
                >
                  <Save className="w-3.5 h-3.5 text-[#00363a]" />
                  <span>Save Changes</span>
                </LoadingButton>
              </div>
            </div>

          </form>

        </div>

      </div>

    </div>
  )
}

