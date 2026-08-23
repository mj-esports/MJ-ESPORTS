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
    live: 'bg-[#ff5e07]/15 text-[#ff5e07] border border-[#ff5e07]/40 font-headline',
    primary: 'bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30',
    secondary: 'bg-[#ff5e07]/10 text-[#ff5e07] border border-[#ff5e07]/30',
    success: 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30',
    warning: 'bg-[#fed83a]/10 text-[#fed83a] border border-[#fed83a]/30',
    danger: 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30',
    outline: 'bg-[#141416] text-[#b9cacb] border border-[#27272a]',
    default: 'bg-[#201f20] text-[#e5e2e3] border border-[#27272a]'
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold uppercase rounded font-label-bold transition-colors ${
        sizeStyles[size] || sizeStyles.md
      } ${variantStyles[variant] || variantStyles.default} ${className}`}
    >
      {variant === 'live' && (
        <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e07] animate-ping" />
      )}
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  )
}
