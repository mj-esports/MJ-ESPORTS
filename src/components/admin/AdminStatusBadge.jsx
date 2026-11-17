import React from 'react'

/**
 * Reusable Admin Status Badge Component
 * Standardized status indicators across MJ ESPORTS Admin Command Center
 */
export default function AdminStatusBadge({ status, size = 'sm', className = '' }) {
  const normalized = String(status || '').trim().toUpperCase()

  let variant = 'default'
  let label = status || 'UNKNOWN'
  let isLive = false
  let isPending = false

  if (normalized === 'LIVE' || normalized === 'LIVE NOW') {
    variant = 'live'
    label = 'LIVE'
    isLive = true
  } else if (
    normalized === 'REGISTRATION OPEN' ||
    normalized === 'OPEN' ||
    normalized === 'REGISTRATIONS OPEN'
  ) {
    variant = 'open'
    label = 'REGISTRATION OPEN'
  } else if (normalized === 'UPCOMING') {
    variant = 'upcoming'
    label = 'UPCOMING'
  } else if (normalized === 'FULL' || normalized === 'ALMOST FULL' || normalized === 'BRACKET LOCKED') {
    variant = 'full'
    label = normalized === 'BRACKET LOCKED' ? 'BRACKET LOCKED' : 'FULL'
  } else if (normalized === 'COMPLETED' || normalized === 'FINISHED') {
    variant = 'completed'
    label = 'COMPLETED'
  } else if (normalized === 'CANCELLED' || normalized === 'CANCELED') {
    variant = 'cancelled'
    label = 'CANCELLED'
  } else if (normalized === 'RESULTS PENDING' || normalized === 'RESULTS_PENDING' || normalized === 'PENDING RESULTS') {
    variant = 'results_pending'
    label = 'RESULTS PENDING'
    isPending = true
  } else if (normalized === 'PENDING') {
    variant = 'pending'
    label = 'PENDING'
    isPending = true
  } else if (normalized === 'FAILED') {
    variant = 'failed'
    label = 'FAILED'
  }

  const stylesByVariant = {
    live: 'bg-[#FF8C00]/15 text-[#FF8C00] border-[#FF8C00]/40 font-headline',
    open: 'bg-[#FFB900]/10 text-[#FFB900] border-[#FFB900]/30 font-headline',
    upcoming: 'bg-[#18181B] text-[#FFB900] border-[#27272A] font-headline',
    full: 'bg-[#FFB900]/10 text-[#FFB900] border-[#FFB900]/40 font-headline',
    results_pending: 'bg-[#FFB900]/15 text-[#FFB900] border-[#FFB900]/40 font-headline',
    completed: 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30 font-headline',
    cancelled: 'bg-red-950/40 text-red-400 border-red-900/40 font-headline',
    pending: 'bg-[#FF8C00]/10 text-[#FF8C00] border-[#FF8C00]/30 font-headline',
    failed: 'bg-red-950/40 text-red-400 border-red-900/40 font-headline',
    default: 'bg-[#18181B] text-[#A1A1AA] border-[#27272A] font-headline',
  }

  const sizeStyles = {
    xs: 'px-2 py-0.5 text-[9px] tracking-wider',
    sm: 'px-2.5 py-0.5 text-[10px] tracking-wider',
    md: 'px-3 py-1 text-xs tracking-wider',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold uppercase rounded-none border select-none ${
        sizeStyles[size] || sizeStyles.sm
      } ${stylesByVariant[variant] || stylesByVariant.default} ${className}`}
    >
      {isLive && <span className="w-1.5 h-1.5 rounded-none bg-[#FF8C00] animate-pulse" />}
      {isPending && <span className="w-1.5 h-1.5 rounded-none bg-[#FF8C00] animate-ping" />}
      <span>{label}</span>
    </span>
  )
}
