import React from 'react'
import LoadingSpinner from './LoadingSpinner'

/**
 * Reusable Production Loading Button Component
 * Disables button while loading, prevents double-clicks, and renders loading spinner.
 */
export default function LoadingButton({
  children,
  loading = false,
  disabled = false,
  loadingText,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  icon: Icon,
  spinnerVariant,
  className = '',
  ...props
}) {
  const isDisabled = disabled || loading

  const baseStyles = 'inline-flex items-center justify-center font-bold tracking-wider transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00f2ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07090c] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs min-h-[36px] rounded',
    md: 'px-4 py-2.5 text-xs min-h-[44px] rounded',
    lg: 'px-6 py-3.5 text-sm min-h-[48px] rounded-lg',
  }

  const variantStyles = {
    primary:
      'bg-[#00f2ff] hover:bg-[#74f5ff] active:bg-[#00dbe7] text-[#00363a] font-display-lg font-extrabold uppercase italic shadow-[0_0_15px_rgba(0,242,255,0.3)] hover:shadow-[0_0_20px_rgba(0,242,255,0.5)]',
    secondary:
      'bg-[#07090c] hover:bg-[#1d232c] border border-[#3a494b] hover:border-[#00f2ff] text-white uppercase',
    danger:
      'bg-[#ff3366]/20 hover:bg-[#ff3366]/30 border border-[#ff3366] text-[#ff3366] uppercase shadow-[0_0_15px_rgba(255,51,102,0.3)]',
    ghost:
      'bg-transparent hover:bg-[#1d232c] text-[#8e9dae] hover:text-white uppercase',
    emerald:
      'bg-[#00ff9d] hover:bg-[#52ffb8] active:bg-[#00d482] text-[#003622] font-display-lg font-extrabold uppercase italic shadow-[0_0_15px_rgba(0,255,157,0.3)]',
  }

  const defaultSpinnerVariant =
    spinnerVariant || (variant === 'primary' || variant === 'emerald' ? 'dark' : 'cyan')

  const handleClick = (e) => {
    if (isDisabled) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    if (onClick) {
      onClick(e)
    }
  }

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={handleClick}
      aria-busy={loading}
      aria-disabled={isDisabled}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${
        variantStyles[variant] || variantStyles.primary
      } ${className}`}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-2">
          <LoadingSpinner size={size === 'lg' ? 'md' : 'sm'} variant={defaultSpinnerVariant} />
          <span>{loadingText || children}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 shrink-0" />}
          <span>{children}</span>
        </div>
      )}
    </button>
  )
}
