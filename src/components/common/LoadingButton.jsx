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
      'bg-[#FFB900] hover:bg-[#FFC933] active:bg-[#E5A700] text-[#000000] font-headline font-bold uppercase tracking-wider transition-all',
    secondary:
      'bg-[#FF8C00] hover:bg-[#FFA033] active:bg-[#E57D00] text-[#000000] font-headline font-bold uppercase tracking-wider transition-all',
    outline:
      'bg-[#111215] hover:bg-[#18181B] border border-[#27272A] hover:border-[#FFB900] text-[#FFFFFF] hover:text-[#FFB900] font-headline font-semibold uppercase tracking-wider transition-all',
    ghost:
      'bg-transparent hover:bg-[#FFB900]/10 text-[#FFB900] font-headline font-semibold uppercase tracking-wider transition-all',
    danger:
      'bg-[#ef4444]/15 hover:bg-[#ef4444]/25 border border-[#ef4444] text-[#ef4444] font-headline font-bold uppercase tracking-wider transition-all',
    emerald:
      'bg-[#10b981] hover:bg-[#34d399] active:bg-[#059669] text-[#000000] font-headline font-bold uppercase tracking-wider transition-all',
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
