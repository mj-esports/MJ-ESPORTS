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

  const baseStyles = 'inline-flex items-center justify-center font-bold tracking-wider transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB900] focus-visible:ring-offset-2 focus-visible:ring-offset-[#000000] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs min-h-[36px] rounded-none font-headline',
    md: 'px-4 py-2.5 text-xs min-h-[44px] rounded-none font-headline',
    lg: 'px-6 py-3.5 text-sm min-h-[48px] rounded-none font-headline',
  }

  const variantStyles = {
    primary:
      'bg-[#FFB900] hover:bg-[#FFA500] active:bg-[#E5A700] text-[#000000] font-headline font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(255,185,0,0.35)] hover:shadow-[0_0_24px_rgba(255,185,0,0.5)] transition-all',
    secondary:
      'bg-[#FF6200] hover:bg-[#FF771F] active:bg-[#E55800] text-[#FFFFFF] font-headline font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(255,98,0,0.35)] hover:shadow-[0_0_24px_rgba(255,98,0,0.5)] transition-all',
    outline:
      'bg-[#111318] hover:bg-[#1B1B1F] border border-[#2A2A30] hover:border-[#FFB900] text-[#FFFFFF] hover:text-[#FFB900] font-headline font-semibold uppercase tracking-wider transition-all',
    ghost:
      'bg-transparent hover:bg-[#FFB900]/10 text-[#FFB900] font-headline font-semibold uppercase tracking-wider transition-all',
    danger:
      'bg-[#FF0000]/15 hover:bg-[#FF0000]/25 border border-[#FF0000] text-[#FF0000] font-headline font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(255,0,0,0.3)] transition-all',
    emerald:
      'bg-[#10b981] hover:bg-[#34d399] active:bg-[#059669] text-[#003622] font-headline font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all',
  }

  const defaultSpinnerVariant =
    spinnerVariant || (variant === 'primary' || variant === 'emerald' ? 'dark' : 'amber')

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
