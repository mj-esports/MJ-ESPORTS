import React from 'react'

/**
 * Cyberpunk themed SVG/CSS Loading Spinner Component
 * Sizes: sm (16px), md (20px), lg (24px), xl (32px)
 * Variants: cyan (#00f2ff), emerald (#00ff9d), amber (#ffb800), rose (#ff3366), white (#ffffff)
 */
export default function LoadingSpinner({
  size = 'md',
  variant = 'cyan',
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
    cyan: 'border-[#00f2ff] border-t-transparent',
    emerald: 'border-[#00ff9d] border-t-transparent',
    amber: 'border-[#ffb800] border-t-transparent',
    rose: 'border-[#ff3366] border-t-transparent',
    dark: 'border-[#00363a] border-t-transparent',
    white: 'border-white border-t-transparent',
  }

  const spinnerEl = (
    <div
      className={`rounded-full animate-spin shrink-0 ${sizeClasses[size] || sizeClasses.md} ${
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
