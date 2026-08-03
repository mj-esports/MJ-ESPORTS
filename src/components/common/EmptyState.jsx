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
  ArrowRight
} from 'lucide-react'

export const EMPTY_STATE_VARIANTS = {
  tournaments: {
    icon: Trophy,
    sentence: 'No tournaments are currently open for registration.',
    ctaText: 'Browse Open Tournaments',
    ctaLink: '/tournaments',
    accentColor: 'text-[#00f2ff]',
    borderColor: 'border-[#00f2ff]/40',
  },
  registrations: {
    icon: ClipboardList,
    sentence: 'You have not registered for any active tournament match yet.',
    ctaText: 'Explore Competitions',
    ctaLink: '/tournaments',
    accentColor: 'text-[#fe6b00]',
    borderColor: 'border-[#fe6b00]/40',
  },
  notifications: {
    icon: Bell,
    sentence: 'No official announcements or alerts at this time.',
    ctaText: 'Check Schedule',
    ctaLink: '/tournaments',
    accentColor: 'text-[#00ff9d]',
    borderColor: 'border-[#00ff9d]/40',
  },
  results: {
    icon: BarChart3,
    sentence: 'Match standings will appear here once results are published.',
    ctaText: 'View Leaderboard',
    ctaLink: '/leaderboard',
    accentColor: 'text-[#ffe173]',
    borderColor: 'border-[#ffe173]/40',
  },
  leaderboard: {
    icon: Trophy,
    sentence: 'Leaderboard rankings will populate after completed matches.',
    ctaText: 'Join Tournament',
    ctaLink: '/tournaments',
    accentColor: 'text-[#00f2ff]',
    borderColor: 'border-[#00f2ff]/40',
  },
  announcements: {
    icon: Flame,
    sentence: 'No official announcements published at this time.',
    ctaText: 'View Competitions',
    ctaLink: '/tournaments',
    accentColor: 'text-[#fe6b00]',
    borderColor: 'border-[#fe6b00]/40',
  },
  matches: {
    icon: Calendar,
    sentence: 'No live matches currently in progress.',
    ctaText: 'Browse Schedule',
    ctaLink: '/tournaments',
    accentColor: 'text-[#00f2ff]',
    borderColor: 'border-[#00f2ff]/40',
  },
  finance: {
    icon: CreditCard,
    sentence: 'No pending payment data available.',
    ctaText: 'Refresh View',
    ctaLink: null,
    accentColor: 'text-[#00ff9d]',
    borderColor: 'border-[#00ff9d]/40',
  },
  search: {
    icon: SearchX,
    sentence: 'No tournament matched your search query.',
    ctaText: 'Clear Filters',
    ctaLink: '/tournaments',
    accentColor: 'text-[#8e9dae]',
    borderColor: 'border-[#3a494b]',
  },
}

export default function EmptyState({
  type = 'search',
  sentence,
  ctaText,
  ctaLink,
  onCtaClick,
  icon: CustomIcon,
}) {
  const config = EMPTY_STATE_VARIANTS[type] || EMPTY_STATE_VARIANTS.search
  const IconComponent = CustomIcon || config.icon
  const displaySentence = sentence || config.sentence
  const displayCtaText = ctaText !== undefined ? ctaText : config.ctaText
  const displayCtaLink = ctaLink !== undefined ? ctaLink : config.ctaLink

  return (
    <div className="bg-[#151a21] border border-[#3a494b]/60 rounded-xl p-3 sm:p-3.5 text-center space-y-2 max-w-md mx-auto shadow-md max-h-[160px] overflow-hidden flex flex-col items-center justify-center isolate relative my-2">
      {/* Icon */}
      <div className={`w-8 h-8 rounded-lg bg-[#07090c] border ${config.borderColor} flex items-center justify-center text-white shrink-0`}>
        <IconComponent className={`w-4 h-4 ${config.accentColor}`} />
      </div>

      {/* One short sentence */}
      <p className="text-[11px] font-semibold text-[#8e9dae] leading-snug max-w-xs text-center truncate">
        {displaySentence}
      </p>

      {/* One primary action button */}
      {displayCtaText && (
        <div>
          {displayCtaLink ? (
            <Link
              to={displayCtaLink}
              className="btn-cyber-primary text-[11px] px-3 py-1.5 min-h-[38px] inline-flex items-center justify-center gap-1.5"
            >
              <span>{displayCtaText}</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          ) : (
            <button
              onClick={onCtaClick}
              className="btn-cyber-primary text-[11px] px-3 py-1.5 min-h-[38px] inline-flex items-center justify-center gap-1.5"
            >
              <span>{displayCtaText}</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
