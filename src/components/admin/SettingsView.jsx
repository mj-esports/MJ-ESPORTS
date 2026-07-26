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
    setAlert({ type: 'success', message: 'Platform operational settings saved successfully!' })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      
      {/* Header */}
      <div className="space-y-1 border-b border-[#3a494b]/60 pb-4">
        <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#00f2ff]" />
          <span>PLATFORM OPERATIONS SETTINGS</span>
        </h2>
        <p className="text-xs text-[#8e9dae]">
          Configure official platform support email, branding parameters, social handles, and site-wide announcement banner.
        </p>
      </div>

      {alert && <AuthAlert type={alert.type} message={alert.message} />}

      <form onSubmit={handleSave} className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-6 space-y-5 shadow-xl">
        
        {/* Support & Branding */}
        <div className="space-y-4">
          <h3 className="font-display-lg text-xs font-bold text-[#00f2ff] uppercase tracking-wider">General Branding & Contact</h3>
          <FormInput label="Platform Title" name="brandName" value={settings.brandName} onChange={handleChange} required />
          <FormInput label="Official Public Support Email" name="supportEmail" value={settings.supportEmail} onChange={handleChange} required icon={Mail} />
        </div>

        {/* Site Announcement Banner */}
        <div className="space-y-3 pt-3 border-t border-[#3a494b]/60">
          <h3 className="font-display-lg text-xs font-bold text-[#ffb800] uppercase tracking-wider">Global Announcement Banner</h3>
          
          <div className="flex items-center gap-3 text-xs text-[#e1e2e7]">
            <input
              type="checkbox"
              id="bannerEnabled"
              name="bannerEnabled"
              checked={settings.bannerEnabled}
              onChange={handleChange}
              className="w-4 h-4 rounded bg-[#07090c] border-[#3a494b] text-[#00f2ff] focus:ring-[#00f2ff] cursor-pointer"
            />
            <label htmlFor="bannerEnabled" className="cursor-pointer select-none font-bold">
              Enable Announcement Ticker Banner across platform header
            </label>
          </div>

          <FormInput label="Banner Ticker Message" name="announcementBanner" value={settings.announcementBanner} onChange={handleChange} />
        </div>

        {/* Social Handles */}
        <div className="space-y-4 pt-3 border-t border-[#3a494b]/60">
          <h3 className="font-display-lg text-xs font-bold text-[#00f2ff] uppercase tracking-wider">Official Social Links</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormInput label="Discord Invite" name="discordUrl" value={settings.discordUrl} onChange={handleChange} />
            <FormInput label="Twitter / X" name="twitterUrl" value={settings.twitterUrl} onChange={handleChange} />
            <FormInput label="YouTube Stream" name="youtubeUrl" value={settings.youtubeUrl} onChange={handleChange} />
          </div>
        </div>

        <button type="submit" className="btn-cyber-primary w-full justify-center py-3.5 min-h-[44px]">
          <Save className="w-4 h-4" />
          <span>Save Operational Settings</span>
        </button>

      </form>

    </div>
  )
}
