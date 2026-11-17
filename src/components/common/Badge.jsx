import React from 'react'

/**
 * Stitch Aether Elite Badge Component
 * Pill-shaped (rounded-full, 16px radius) status indicator badge.
 */
export default function Badge({
  children,
  variant = 'default', // 'live', 'primary', 'secondary', 'success', 'warning', 'danger', 'outline', 'default'
  size = 'md', // 'sm', 'md'
  className = '',
  icon: Icon = null
}) {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] tracking-wider leading-3',
    md: 'px-2.5 py-1 text-xs tracking-wide leading-4'
  }

  const variantStyles = {
    live: 'bg-[#FF8C00]/15 text-[#FF8C00] border border-[#FF8C00]/40 font-headline',
    primary: 'bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/30',
    secondary: 'bg-[#FF8C00]/10 text-[#FF8C00] border border-[#FF8C00]/30',
    success: 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30',
    warning: 'bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/30',
    danger: 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30',
    outline: 'bg-[#111215] text-[#A1A1AA] border border-[#27272A]',
    default: 'bg-[#18181B] text-[#FFFFFF] border border-[#27272A]'
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold uppercase rounded-none font-label-bold transition-colors ${
        sizeStyles[size] || sizeStyles.md
      } ${variantStyles[variant] || variantStyles.default} ${className}`}
    >
      {variant === 'live' && (
        <span className="w-1.5 h-1.5 rounded-none bg-[#FF8C00] animate-ping" />
      )}
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  )
}
