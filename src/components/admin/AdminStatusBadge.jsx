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
    live: 'bg-[#ff5e07]/15 text-[#ff5e07] border-[#ff5e07]/40 font-headline',
    open: 'bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/30 font-headline',
    upcoming: 'bg-[#1c1b1c] text-[#00f2ff] border-[#27272a] font-headline',
    full: 'bg-[#fed83a]/10 text-[#fed83a] border-[#fed83a]/40 font-headline',
    results_pending: 'bg-[#fed83a]/15 text-[#fed83a] border-[#fed83a]/40 font-headline',
    completed: 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30 font-headline',
    cancelled: 'bg-red-950/40 text-red-400 border-red-900/40 font-headline',
    pending: 'bg-[#ff5e07]/10 text-[#ff5e07] border-[#ff5e07]/30 font-headline',
    failed: 'bg-red-950/40 text-red-400 border-red-900/40 font-headline',
    default: 'bg-[#1c1b1c] text-[#849495] border-[#27272a] font-headline',
  }

  const sizeStyles = {
    xs: 'px-2 py-0.5 text-[9px] tracking-wider',
    sm: 'px-2.5 py-0.5 text-[10px] tracking-wider',
    md: 'px-3 py-1 text-xs tracking-wider',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold uppercase rounded border select-none ${
        sizeStyles[size] || sizeStyles.sm
      } ${stylesByVariant[variant] || stylesByVariant.default} ${className}`}
    >
      {isLive && <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e07] animate-pulse" />}
      {isPending && <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e07] animate-ping" />}
      <span>{label}</span>
    </span>
  )
}
