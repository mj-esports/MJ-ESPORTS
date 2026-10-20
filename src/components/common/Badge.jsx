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
    live: 'bg-[#FF6200]/15 text-[#FF6200] border border-[#FF6200]/40 font-headline',
    primary: 'bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/30',
    secondary: 'bg-[#FF6200]/10 text-[#FF6200] border border-[#FF6200]/30',
    success: 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30',
    warning: 'bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/30',
    danger: 'bg-[#FF0000]/10 text-[#FF0000] border border-[#FF0000]/30',
    outline: 'bg-[#111318] text-[#A3A3A3] border border-[#2A2A30]',
    default: 'bg-[#1B1B1F] text-[#FFFFFF] border border-[#2A2A30]'
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold uppercase rounded-none font-label-bold transition-colors ${
        sizeStyles[size] || sizeStyles.md
      } ${variantStyles[variant] || variantStyles.default} ${className}`}
    >
      {variant === 'live' && (
        <span className="w-1.5 h-1.5 rounded-none bg-[#FF6200] animate-ping" />
      )}
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  )
}
