import React, { useEffect } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, WifiOff, RefreshCw, X, XCircle } from 'lucide-react'

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-[#111215]/95',
    border: 'border-[#10B981]',
    accent: 'text-[#10B981]',
    shadow: '',
  },
  error: {
    icon: XCircle,
    bg: 'bg-[#111215]/95',
    border: 'border-[#EF4444]',
    accent: 'text-[#EF4444]',
    shadow: '',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-[#111215]/95',
    border: 'border-[#FF8C00]',
    accent: 'text-[#FF8C00]',
    shadow: '',
  },
  info: {
    icon: Info,
    bg: 'bg-[#111215]/95',
    border: 'border-[#FFB900]',
    accent: 'text-[#FFB900]',
    shadow: '',
  },
  offline: {
    icon: WifiOff,
    bg: 'bg-[#111215]/95',
    border: 'border-[#FF8C00]',
    accent: 'text-[#FF8C00]',
    shadow: '',
  },
  network: {
    icon: XCircle,
    bg: 'bg-[#111215]/95',
    border: 'border-[#EF4444]',
    accent: 'text-[#EF4444]',
    shadow: '',
  },
}

export default function Toast({
  type = 'info',
  title,
  message,
  onClose,
  onRetry,
  retryText = 'Retry',
  autoCloseMs = 5000,
}) {
  const style = TOAST_STYLES[type] || TOAST_STYLES.info
  const IconComponent = style.icon

  useEffect(() => {
    if (!onClose || !autoCloseMs || autoCloseMs <= 0) return
    const timer = setTimeout(() => {
      onClose()
    }, autoCloseMs)
    return () => clearTimeout(timer)
  }, [onClose, autoCloseMs])

  return (
    <div
      className={`max-w-sm w-full backdrop-blur-xl border ${style.border} ${style.bg} p-4 rounded-none flex items-start gap-3 transition-all duration-300 text-xs shadow-2xl relative overflow-hidden animate-toast-mobile sm:animate-toast-desktop`}
      role="status"
      aria-live="polite"
    >
      <IconComponent className={`w-5 h-5 ${style.accent} shrink-0 mt-0.5`} />
      
      <div className="flex-1 space-y-1">
        {title && (
          <h4 className={`font-display-lg font-extrabold uppercase tracking-wider text-xs ${style.accent}`}>
            {title}
          </h4>
        )}
        <p className="text-[#FFFFFF] leading-relaxed font-sans">{message}</p>

        {/* Retry Button Option */}
        {onRetry && (
          <button
            onClick={onRetry}
            className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-none bg-[#18181B] border ${style.border} ${style.accent} hover:brightness-125 font-bold text-[10px] uppercase tracking-wider transition-all`}
          >
            <RefreshCw className="w-3 h-3 animate-spin-slow" />
            <span>{retryText}</span>
          </button>
        )}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-none text-[#A1A1AA] hover:text-white transition-colors shrink-0"
          aria-label="Dismiss Toast Notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
