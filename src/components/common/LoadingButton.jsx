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

  const baseStyles = 'inline-flex items-center justify-center font-bold tracking-wider transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00f2ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#131314] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs min-h-[36px] rounded font-headline',
    md: 'px-4 py-2.5 text-xs min-h-[44px] rounded font-headline',
    lg: 'px-6 py-3.5 text-sm min-h-[48px] rounded font-headline',
  }

  const variantStyles = {
    primary:
      'bg-[#00f2ff] hover:bg-[#74f5ff] active:bg-[#00dbe7] text-[#00363a] font-headline font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(0,242,255,0.35)] hover:shadow-[0_0_24px_rgba(0,242,255,0.5)] transition-all',
    secondary:
      'bg-[#ff5e07] hover:bg-[#ff7a33] active:bg-[#e04e00] text-[#170700] font-headline font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(255,94,7,0.35)] hover:shadow-[0_0_24px_rgba(255,94,7,0.5)] transition-all',
    outline:
      'bg-[#141416] hover:bg-[#201f20] border border-[#27272a] hover:border-[#00f2ff] text-[#e5e2e3] hover:text-[#00f2ff] font-headline font-semibold uppercase tracking-wider transition-all',
    ghost:
      'bg-transparent hover:bg-[#00f2ff]/10 text-[#00f2ff] font-headline font-semibold uppercase tracking-wider transition-all',
    danger:
      'bg-[#ef4444]/15 hover:bg-[#ef4444]/25 border border-[#ef4444] text-[#ef4444] font-headline font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all',
    emerald:
      'bg-[#10b981] hover:bg-[#34d399] active:bg-[#059669] text-[#003622] font-headline font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all',
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
