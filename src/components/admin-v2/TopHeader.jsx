import React from 'react'
import { Menu, Search, Bell, Activity, Sparkles, UserCheck } from 'lucide-react'

export default function TopHeader({ activeTab, setIsOpen }) {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile Menu & Active Page Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsOpen(true)}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-white tracking-wide capitalize">
            {activeTab} Overview
          </h2>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            System Live
          </span>
        </div>
      </div>

      {/* Center: Search Bar */}
      <div className="hidden md:flex items-center max-w-md w-full mx-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tournaments, players, transactions..."
            className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl pl-10 pr-12 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Quick Action Controls */}
      <div className="flex items-center gap-3">
        {/* Quick V2 Badge */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>V2 Architecture</span>
        </div>

        {/* System Health */}
        <button
          title="System Health"
          className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-900 rounded-xl border border-slate-800/80 transition-colors relative"
        >
          <Activity className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <button
          title="Notifications"
          className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-900 rounded-xl border border-slate-800/80 transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400" />
        </button>

        {/* Profile Info */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 p-[1px]">
            <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center text-cyan-400 font-bold text-xs">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-white leading-tight">Admin V2</span>
            <span className="text-[10px] text-cyan-400/80 font-mono">Superuser</span>
          </div>
        </div>
      </div>
    </header>
  )
}
