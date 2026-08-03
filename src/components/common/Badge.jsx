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
    live: 'bg-[#00f2ff]/15 text-[#00f2ff] border border-[#00f2ff]/40 animate-pulse font-mono',
    primary: 'bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30',
    secondary: 'bg-[#fe6b00]/10 text-[#fe6b00] border border-[#fe6b00]/30',
    success: 'bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30',
    warning: 'bg-[#fed83a]/10 text-[#fed83a] border border-[#fed83a]/30',
    danger: 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30',
    outline: 'bg-[#191c1f] text-[#b9cacb] border border-[#3a494b]',
    default: 'bg-[#1d2023] text-[#e1e2e7] border border-[#3a494b]/50'
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold uppercase rounded-full font-sans transition-colors ${
        sizeStyles[size] || sizeStyles.md
      } ${variantStyles[variant] || variantStyles.default} ${className}`}
    >
      {variant === 'live' && (
        <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff] animate-ping" />
      )}
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  )
}
