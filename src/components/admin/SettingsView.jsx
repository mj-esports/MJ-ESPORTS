import { useState } from 'react'
import { Settings, Save, Mail, Globe, Shield, Bell } from 'lucide-react'
import FormInput from '../common/FormInput'
import AuthAlert from '../common/AuthAlert'

export default function SettingsView() {
  const [settings, setSettings] = useState({
    brandName: 'MJ ESPORTS Pro Arena',
    supportEmail: 'support.mjesports@gmail.com',
    discordUrl: 'https://discord.com',
    twitterUrl: 'https://twitter.com',
    youtubeUrl: 'https://youtube.com',
    announcementBanner: '🔥 Free Fire India Championship 2026 Registration is NOW OPEN! Total Prize Pool: ₹5,00,000!',
    bannerEnabled: true,
  })

  const [alert, setAlert] = useState(null)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setSettings((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSave = (e) => {
    e.preventDefault()
    setAlert({ type: 'success', message: 'Platform settings saved successfully!' })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      
      {/* Header */}
      <div className="space-y-1 border-b border-slate-800 pb-4">
        <h2 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-purple-400" />
          <span>PLATFORM OPERATIONS SETTINGS</span>
        </h2>
        <p className="text-xs text-slate-400">
          Configure official platform support email, branding parameters, social handles, and site-wide announcement banner.
        </p>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl">
        
        {/* Support & Branding */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">General Branding & Contact</h3>
          <FormInput label="Platform Title" name="brandName" value={settings.brandName} onChange={handleChange} required />
          <FormInput label="Official Public Support Email" name="supportEmail" value={settings.supportEmail} onChange={handleChange} required icon={Mail} />
        </div>

        {/* Site Announcement Banner */}
        <div className="space-y-3 pt-3 border-t border-slate-800">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider text-yellow-400">Global Announcement Banner</h3>
          
          <div className="flex items-center gap-3 text-xs text-slate-300">
            <input
              type="checkbox"
              id="bannerEnabled"
              name="bannerEnabled"
              checked={settings.bannerEnabled}
              onChange={handleChange}
              className="w-4 h-4 rounded bg-slate-950 border-slate-800 text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <label htmlFor="bannerEnabled" className="cursor-pointer select-none font-bold">
              Enable Announcement Ticker Banner across platform header
            </label>
          </div>

          <FormInput label="Banner Ticker Message" name="announcementBanner" value={settings.announcementBanner} onChange={handleChange} />
        </div>

        {/* Social Handles */}
        <div className="space-y-4 pt-3 border-t border-slate-800">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider text-cyan-400">Official Social Links</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormInput label="Discord Invite" name="discordUrl" value={settings.discordUrl} onChange={handleChange} />
            <FormInput label="Twitter / X" name="twitterUrl" value={settings.twitterUrl} onChange={handleChange} />
            <FormInput label="YouTube Stream" name="youtubeUrl" value={settings.youtubeUrl} onChange={handleChange} />
          </div>
        </div>

        <button type="submit" className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 min-h-[44px]">
          <Save className="w-4 h-4" />
          <span>Save Operational Settings</span>
        </button>

      </form>

    </div>
  )
}
