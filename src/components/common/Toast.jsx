import React, { useEffect } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, WifiOff, RefreshCw, X, XCircle } from 'lucide-react'

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-[#111318]/95',
    border: 'border-[#10b981]',
    accent: 'text-[#10b981]',
    shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
  },
  error: {
    icon: XCircle,
    bg: 'bg-[#111318]/95',
    border: 'border-[#FF0000]',
    accent: 'text-[#FF0000]',
    shadow: 'shadow-[0_0_20px_rgba(255,0,0,0.3)]',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-[#111318]/95',
    border: 'border-[#FF6200]',
    accent: 'text-[#FF6200]',
    shadow: 'shadow-[0_0_20px_rgba(255,98,0,0.3)]',
  },
  info: {
    icon: Info,
    bg: 'bg-[#111318]/95',
    border: 'border-[#FFB900]',
    accent: 'text-[#FFB900]',
    shadow: 'shadow-[0_0_20px_rgba(255,185,0,0.3)]',
  },
  offline: {
    icon: WifiOff,
    bg: 'bg-[#111318]/95',
    border: 'border-[#FF6200]',
    accent: 'text-[#FF6200]',
    shadow: 'shadow-[0_0_20px_rgba(255,98,0,0.3)]',
  },
  network: {
    icon: XCircle,
    bg: 'bg-[#111318]/95',
    border: 'border-[#FF0000]',
    accent: 'text-[#FF0000]',
    shadow: 'shadow-[0_0_20px_rgba(255,0,0,0.3)]',
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
      className={`max-w-sm w-full backdrop-blur-xl border ${style.border} ${style.bg} ${style.shadow} p-4 rounded-none flex items-start gap-3 transition-all duration-300 text-xs shadow-2xl relative overflow-hidden animate-toast-mobile sm:animate-toast-desktop`}
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
            className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-none bg-[#1B1B1F] border ${style.border} ${style.accent} hover:brightness-125 font-bold text-[10px] uppercase tracking-wider transition-all`}
          >
            <RefreshCw className="w-3 h-3 animate-spin-slow" />
            <span>{retryText}</span>
          </button>
        )}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-none text-[#A3A3A3] hover:text-white transition-colors shrink-0"
          aria-label="Dismiss Toast Notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
