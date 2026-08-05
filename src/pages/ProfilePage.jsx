import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import {
  Copy,
  Trophy,
  Edit3,
  Award,
  Activity,
  Wallet,
  Settings,
  CheckCircle2
} from 'lucide-react'

export default function ProfilePage() {
  const { user } = useAuth()
  const { showSuccess } = useToast()
  const navigate = useNavigate()

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Neo_Striker'
  const freeFireUid = user?.user_metadata?.freeFireUid || user?.user_metadata?.game_uid || '88472910'
  const bgmiUid = user?.user_metadata?.bgmiUid || user?.user_metadata?.bgmi_uid || ''
  const instagram = user?.user_metadata?.instagram || ''
  const whatsappChannel = user?.user_metadata?.whatsappChannel || user?.user_metadata?.whatsapp_channel || ''
  const bio = user?.user_metadata?.bio || ''

  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.avatarUrl ||
    'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=400&q=80'

  const handleCopy = (value, label) => {
    if (!value) return
    navigator.clipboard.writeText(value)
    showSuccess(`${label} copied!`, 'Copied')
  }

  const openEditModal = () => {
    navigate('/profile/edit')
  }

  return (
    <div className="bg-[#050505] text-white font-body min-h-screen pb-20 antialiased">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">

        {/* 1. PROFILE HEADER & GAME IDENTITY CARD */}
        <div className="relative w-full rounded-2xl overflow-hidden border border-[#00f2ff]/20 shadow-[0_0_20px_rgba(0,242,255,0.1)] bg-[#0A0A0A]">
          {/* Cover Background Image */}
          <div
            className="h-48 sm:h-64 w-full bg-cover bg-center opacity-60 transform-gpu"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1600&q=80')`,
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/80 to-transparent transform-gpu"></div>

          {/* Floating Header Overlay */}
          <div className="p-6 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10 -mt-16 sm:-mt-20">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl border-4 border-[#0A0A0A] object-cover shadow-[0_0_20px_rgba(0,242,255,0.4)]"
                />
                <div className="absolute -bottom-2 -right-2 bg-[#00f2ff] text-black text-[10px] font-black px-2 py-0.5 rounded transform rotate-3 border border-[#0A0A0A] font-headline uppercase">
                  PRO
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-headline font-black text-white tracking-tight uppercase">
                    {displayName}
                  </h1>
                  <span className="px-2 py-0.5 rounded text-[9px] font-black bg-[#00ff9d]/10 text-[#00ff9d] border border-[#00ff9d]/40 uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> VERIFIED
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 font-mono text-xs text-[#A0A0A0] mt-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#00f2ff] uppercase font-bold text-[10px]">FF UID:</span>
                    <strong className="text-white">{freeFireUid}</strong>
                    <button onClick={() => handleCopy(freeFireUid, 'Free Fire UID')} title="Copy Free Fire UID" className="hover:text-white transition-colors cursor-pointer">
                      <Copy className="w-3 h-3 text-[#00f2ff]" />
                    </button>
                  </div>
                  {bgmiUid && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#00ff9d] uppercase font-bold text-[10px]">BGMI UID:</span>
                      <strong className="text-white">{bgmiUid}</strong>
                      <button onClick={() => handleCopy(bgmiUid, 'BGMI UID')} title="Copy BGMI UID" className="hover:text-white transition-colors cursor-pointer">
                        <Copy className="w-3 h-3 text-[#00ff9d]" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Social Handles & Bio */}
                <div className="space-y-2 mt-3 text-center sm:text-left">
                  {(instagram || whatsappChannel) && (
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      {instagram && (
                        <a
                          href={`https://instagram.com/${instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-[#18181b] border border-[#27272a] hover:border-[#fb00ff] text-[#fb00ff] px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all"
                        >
                          <span>Instagram: {instagram}</span>
                        </a>
                      )}
                      {whatsappChannel && (
                        <a
                          href={whatsappChannel}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 bg-[#18181b] border border-[#27272a] hover:border-[#00ff9d] text-[#00ff9d] px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all"
                        >
                          <span>WhatsApp Channel</span>
                        </a>
                      )}
                    </div>
                  )}

                  {bio && (
                    <p className="text-[#8a8a8a] text-[10.5px] italic font-sans max-w-xl mx-auto sm:mx-0 border-l border-[#27272a] pl-2.5 mt-2">
                      "{bio}"
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={openEditModal}
              className="px-5 py-2 bg-[#00f2ff]/10 hover:bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff]/30 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-wider min-h-[40px] cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        {/* 2. PROFILE HUB NAVIGATION CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
          <Link
            to="/profile/statistics"
            className="p-4 bg-[#0A0A0A] border border-[#27272a] hover:border-[#00f2ff]/40 rounded-xl flex flex-col items-center justify-center gap-2.5 text-center text-[#A0A0A0] hover:text-white transition-all cursor-pointer"
          >
            <Activity className="w-5 h-5 text-[#00f2ff]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Statistics</span>
          </Link>

          <Link
            to="/profile/history"
            className="p-4 bg-[#0A0A0A] border border-[#27272a] hover:border-[#fe6b00]/40 rounded-xl flex flex-col items-center justify-center gap-2.5 text-center text-[#A0A0A0] hover:text-white transition-all cursor-pointer"
          >
            <Trophy className="w-5 h-5 text-[#fe6b00]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Matches</span>
          </Link>

          <Link
            to="/profile/achievements"
            className="p-4 bg-[#0A0A0A] border border-[#27272a] hover:border-[#fbbf24]/40 rounded-xl flex flex-col items-center justify-center gap-2.5 text-center text-[#A0A0A0] hover:text-white transition-all cursor-pointer"
          >
            <Award className="w-5 h-5 text-[#fbbf24]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Trophies</span>
          </Link>

          <Link
            to="/wallet"
            className="p-4 bg-[#0A0A0A] border border-[#27272a] hover:border-[#00ff9d]/40 rounded-xl flex flex-col items-center justify-center gap-2.5 text-center text-[#A0A0A0] hover:text-white transition-all cursor-pointer"
          >
            <Wallet className="w-5 h-5 text-[#00ff9d]" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Wallet</span>
          </Link>

          <Link
            to="/settings"
            className="p-4 bg-[#0A0A0A] border border-[#27272a] hover:border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2.5 text-center text-[#A0A0A0] hover:text-white transition-all cursor-pointer"
          >
            <Settings className="w-5 h-5 text-slate-300" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Settings</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
