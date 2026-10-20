import React from 'react'

/**
 * Free Fire MAX themed SVG/CSS Loading Spinner Component
 * Sizes: sm (16px), md (20px), lg (24px), xl (32px)
 * Variants: amber (#FFB900), orange (#FF6200), emerald (#10b981), rose (#FF0000), dark (#000000), white (#ffffff)
 */
export default function LoadingSpinner({
  size = 'md',
  variant = 'amber',
  className = '',
  label,
}) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-5 h-5 border-2',
    lg: 'w-6 h-6 border-2',
    xl: 'w-8 h-8 border-3',
  }

  const colorClasses = {
    amber: 'border-[#FFB900] border-t-transparent',
    cyan: 'border-[#FFB900] border-t-transparent',
    orange: 'border-[#FF6200] border-t-transparent',
    emerald: 'border-[#10b981] border-t-transparent',
    rose: 'border-[#FF0000] border-t-transparent',
    dark: 'border-[#000000] border-t-transparent',
    white: 'border-white border-t-transparent',
  }

  const spinnerEl = (
    <div
      className={`rounded-none animate-spin shrink-0 ${sizeClasses[size] || sizeClasses.md} ${
        colorClasses[variant] || colorClasses.cyan
      } ${className}`}
      role="status"
      aria-label={label || 'Loading'}
    >
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  )

  if (label) {
    return (
      <div className="inline-flex items-center gap-2" role="status">
        {spinnerEl}
        <span className="text-current font-label-caps uppercase tracking-wider">{label}</span>
      </div>
    )
  }

  return spinnerEl
}
