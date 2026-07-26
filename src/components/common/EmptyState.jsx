import React from 'react'
import { Link } from 'react-router-dom'
import {
  Trophy,
  ClipboardList,
  Bell,
  BarChart3,
  Flame,
  Calendar,
  CreditCard,
  SearchX,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react'

// Pre-defined variants for key empty states
export const EMPTY_STATE_VARIANTS = {
  tournaments: {
    icon: Trophy,
    title: 'No Tournaments Available',
    subtitle: 'There are no active tournaments matching your filter. Check back soon or browse open competitions!',
    ctaText: 'Browse Open Tournaments',
    ctaLink: '/tournaments',
    accentColor: 'text-[#00f2ff]',
    borderColor: 'border-[#00f2ff]/30',
  },
  registrations: {
    icon: ClipboardList,
    title: 'No Registrations Found',
    subtitle: "You haven't registered your squad for any active tournaments yet. Enter a competition to compete!",
    ctaText: 'Explore Competitions',
    ctaLink: '/tournaments',
    accentColor: 'text-[#fe6b00]',
    borderColor: 'border-[#fe6b00]/30',
  },
  notifications: {
    icon: Bell,
    title: 'No Notifications Yet',
    subtitle: "You're all caught up! Official tournament alerts, match room credentials, and updates will appear here.",
    ctaText: null,
    ctaLink: null,
    accentColor: 'text-[#00ff9d]',
    borderColor: 'border-[#00ff9d]/30',
  },
  results: {
    icon: BarChart3,
    title: 'No Match Results Available Yet',
    subtitle: 'Match standings and placement scores will automatically populate here once tournament results are published.',
    ctaText: null,
    ctaLink: null,
    accentColor: 'text-[#ffe173]',
    borderColor: 'border-[#ffe173]/30',
  },
  leaderboard: {
    icon: Trophy,
    title: 'No Leaderboard Available Yet',
    subtitle: 'Participate in official Free Fire MAX or BGMI tournaments to gain points and rank on the global leaderboard.',
    ctaText: 'Join Tournament',
    ctaLink: '/tournaments',
    accentColor: 'text-[#00f2ff]',
    borderColor: 'border-[#00f2ff]/30',
  },
  announcements: {
    icon: Flame,
    title: 'No Announcements At This Time',
    subtitle: 'Stay tuned! Important rules, tournament season announcements, and patch notes will be posted here.',
    ctaText: null,
    ctaLink: null,
    accentColor: 'text-[#fe6b00]',
    borderColor: 'border-[#fe6b00]/30',
  },
  matches: {
    icon: Calendar,
    title: 'No Matches Scheduled Today',
    subtitle: "Today's tournament schedule will appear here once match times are published by the tournament admin.",
    ctaText: null,
    ctaLink: null,
    accentColor: 'text-[#00f2ff]',
    borderColor: 'border-[#00f2ff]/30',
  },
  finance: {
    icon: CreditCard,
    title: 'No Payment Data Available Yet',
    subtitle: 'Verified Razorpay tournament slot registrations will automatically populate here in real time.',
    ctaText: null,
    ctaLink: null,
    accentColor: 'text-[#00ff9d]',
    borderColor: 'border-[#00ff9d]/30',
  },
  search: {
    icon: SearchX,
    title: 'No Search Results Found',
    subtitle: 'No records matched your search query. Try searching with a different term or clearing your filters.',
    ctaText: null,
    ctaLink: null,
    accentColor: 'text-[#8e9dae]',
    borderColor: 'border-[#3a494b]',
  },
}

export default function EmptyState({
  type = 'search',
  title,
  subtitle,
  ctaText,
  ctaLink,
  onCtaClick,
  icon: CustomIcon,
}) {
  const config = EMPTY_STATE_VARIANTS[type] || EMPTY_STATE_VARIANTS.search
  const IconComponent = CustomIcon || config.icon
  const displayTitle = title || config.title
  const displaySubtitle = subtitle || config.subtitle
  const displayCtaText = ctaText !== undefined ? ctaText : config.ctaText
  const displayCtaLink = ctaLink !== undefined ? ctaLink : config.ctaLink

  return (
    <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto shadow-2xl my-4 relative overflow-hidden">
      {/* Glow aura background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#00f2ff]/5 rounded-full blur-2xl pointer-events-none" />

      {/* Vector Icon Container */}
      <div className={`w-16 h-16 rounded-2xl bg-[#07090c] border ${config.borderColor} flex items-center justify-center mx-auto text-white shadow-lg shrink-0 relative z-10`}>
        <IconComponent className={`w-8 h-8 ${config.accentColor}`} />
      </div>

      {/* Title & Description */}
      <div className="space-y-2 relative z-10">
        <h3 className="font-display-lg text-lg sm:text-xl font-extrabold text-white uppercase tracking-tight">
          {displayTitle}
        </h3>
        <p className="text-[#8e9dae] text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
          {displaySubtitle}
        </p>
      </div>

      {/* Optional CTA Button */}
      {displayCtaText && (
        <div className="pt-2 relative z-10">
          {displayCtaLink ? (
            <Link to={displayCtaLink} className="btn-cyber-primary inline-flex">
              <span>{displayCtaText}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : onCtaClick ? (
            <button onClick={onCtaClick} className="btn-cyber-primary inline-flex">
              <span>{displayCtaText}</span>
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
