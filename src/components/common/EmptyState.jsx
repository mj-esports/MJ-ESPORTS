import React from 'react'
import { Link } from 'react-router-dom'
import {
  Trophy,
  SearchX,
  Radio,
  Award,
  Calendar,
  RotateCcw,
  Compass,
  ArrowRight
} from 'lucide-react'

export const EMPTY_STATE_VARIANTS = {
  search: {
    icon: SearchX,
    title: 'No Tournaments Found',
    sentence: 'No tournaments match your search criteria or active game filters.',
    primaryCtaText: 'Reset Filters',
    secondaryCtaText: 'Browse All Tournaments',
    accentColor: 'text-[#FFB900]',
    glowColor: '',
    borderColor: 'border-[#FFB900]/40',
    bgColor: 'bg-[#FFB900]/10'
  },
  live: {
    icon: Radio,
    title: 'No Live Tournaments',
    sentence: 'There are no matches currently broadcast live at this moment.',
    primaryCtaText: 'Browse All Tournaments',
    secondaryCtaText: 'Reset Filters',
    accentColor: 'text-[#FF8C00]',
    glowColor: '',
    borderColor: 'border-[#FF8C00]/50',
    bgColor: 'bg-[#FF8C00]/10'
  },
  completed: {
    icon: Award,
    title: 'No Completed Matches',
    sentence: 'No completed tournament match records found in this view.',
    primaryCtaText: 'Browse Active Events',
    secondaryCtaText: 'Reset Filters',
    accentColor: 'text-[#FFB900]',
    glowColor: '',
    borderColor: 'border-[#FFB900]/40',
    bgColor: 'bg-[#FFB900]/10'
  },
  upcoming: {
    icon: Calendar,
    title: 'No Upcoming Events',
    sentence: 'No upcoming tournaments scheduled under the selected filter.',
    primaryCtaText: 'Browse All Tournaments',
    secondaryCtaText: 'Reset Filters',
    accentColor: 'text-[#FF8C00]',
    glowColor: '',
    borderColor: 'border-[#FF8C00]/40',
    bgColor: 'bg-[#FF8C00]/10'
  },
  tournaments: {
    icon: Trophy,
    title: 'No Tournaments Available',
    sentence: 'No tournaments are currently listed under this section.',
    primaryCtaText: 'Reset Filters',
    secondaryCtaText: 'Explore All Matches',
    accentColor: 'text-[#FFB900]',
    glowColor: '',
    borderColor: 'border-[#FFB900]/40',
    bgColor: 'bg-[#FFB900]/10'
  }
}

export default function EmptyState({
  type = 'search',
  title,
  sentence,
  ctaText,
  secondaryCtaText,
  ctaLink,
  onCtaClick,
  onSecondaryCtaClick,
  icon: CustomIcon,
}) {
  const config = EMPTY_STATE_VARIANTS[type] || EMPTY_STATE_VARIANTS.search
  const IconComponent = CustomIcon || config.icon
  const displayTitle = title || config.title
  const displaySentence = sentence || config.sentence
  const primaryText = ctaText !== undefined ? ctaText : config.primaryCtaText
  const secondaryText = secondaryCtaText !== undefined ? secondaryCtaText : config.secondaryCtaText

  return (
    <div className="bg-[#111215] border border-[#27272A] rounded-none p-8 sm:p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-8 shadow-2xl relative overflow-hidden group">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>

      {/* Esports Icon Badge */}
      <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-none ${config.bgColor} border ${config.borderColor} flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 shrink-0`}>
        <IconComponent className={`w-8 h-8 sm:w-10 sm:h-10 ${config.accentColor}`} />
      </div>

      {/* Title & Message */}
      <h3 className="font-headline font-black text-xl sm:text-2xl text-white mb-2 tracking-tight">
        {displayTitle}
      </h3>
      <p className="text-sm text-[#A1A1AA] font-label max-w-md mb-8 leading-relaxed">
        {displaySentence}
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
        {primaryText && (
          <button
            onClick={onCtaClick}
            className="w-full sm:w-auto bg-[#FFB900] text-black font-extrabold px-6 py-3 rounded-none hover:bg-[#FFC933] transition-all duration-200 active:scale-95 font-label text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{primaryText}</span>
          </button>
        )}

        {secondaryText && onSecondaryCtaClick && (
          <button
            onClick={onSecondaryCtaClick}
            className="w-full sm:w-auto bg-[#18181B] border border-[#27272A] hover:border-[#FFB900] text-white hover:text-[#FFB900] font-bold px-6 py-3 rounded-none transition-all duration-200 active:scale-95 font-label text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>{secondaryText}</span>
          </button>
        )}

        {ctaLink && !onCtaClick && (
          <Link
            to={ctaLink}
            className="w-full sm:w-auto bg-[#FFB900] text-black font-extrabold px-6 py-3 rounded-none hover:bg-[#FFC933] transition-all duration-200 active:scale-95 font-label text-xs sm:text-sm uppercase tracking-wider inline-flex items-center justify-center gap-2"
          >
            <span>{primaryText || 'Browse All'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  )
}
