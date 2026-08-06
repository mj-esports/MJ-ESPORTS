import React from 'react'
import { Settings, Shield, Bell, Database, Save, Globe } from 'lucide-react'

export default function SettingsMenu() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-wide flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          System Settings V2
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure system parameters, security policies, payment gateways, and API options.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Navigation / Tabs */}
        <div className="space-y-2">
          <button className="w-full text-left px-4 py-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold flex items-center gap-3">
            <Globe className="w-4 h-4" />
            General Platform Settings
          </button>
          <button className="w-full text-left px-4 py-3 rounded-xl bg-slate-900/60 text-slate-400 border border-slate-800/80 text-xs font-semibold hover:text-white flex items-center gap-3">
            <Shield className="w-4 h-4" />
            Security & Access Control
          </button>
          <button className="w-full text-left px-4 py-3 rounded-xl bg-slate-900/60 text-slate-400 border border-slate-800/80 text-xs font-semibold hover:text-white flex items-center gap-3">
            <Bell className="w-4 h-4" />
            Notification Rules
          </button>
          <button className="w-full text-left px-4 py-3 rounded-xl bg-slate-900/60 text-slate-400 border border-slate-800/80 text-xs font-semibold hover:text-white flex items-center gap-3">
            <Database className="w-4 h-4" />
            Database & Maintenance
          </button>
        </div>

        {/* Content Panel Mockup */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-5">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
            Platform Configuration
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">Platform Title</label>
              <input
                type="text"
                defaultValue="MJ ESPORTS Official Portal"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1.5">Support Email</label>
              <input
                type="email"
                defaultValue="support@mjesports.gg"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Maintenance Mode</span>
                <span className="text-[11px] text-slate-400">
                  Temporarily disable player tournament registration
                </span>
              </div>
              <input type="checkbox" className="w-4 h-4 accent-cyan-500 rounded cursor-pointer" />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save Configuration V2
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
