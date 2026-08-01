import React, { useEffect } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, WifiOff, RefreshCw, X } from 'lucide-react'

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-[#0b0e17]/95',
    border: 'border-[#00ff9d]',
    accent: 'text-[#00ff9d]',
    shadow: 'shadow-[0_0_20px_rgba(0,255,157,0.3)]',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-[#0b0e17]/95',
    border: 'border-[#ff3366]',
    accent: 'text-[#ff3366]',
    shadow: 'shadow-[0_0_20px_rgba(255,51,102,0.3)]',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-[#0b0e17]/95',
    border: 'border-[#fe6b00]',
    accent: 'text-[#fe6b00]',
    shadow: 'shadow-[0_0_20px_rgba(255,107,0,0.3)]',
  },
  info: {
    icon: Info,
    bg: 'bg-[#0b0e17]/95',
    border: 'border-[#00f2ff]',
    accent: 'text-[#00f2ff]',
    shadow: 'shadow-[0_0_20px_rgba(0,242,255,0.3)]',
  },
  offline: {
    icon: WifiOff,
    bg: 'bg-[#151a21]/95',
    border: 'border-[#fe6b00]',
    accent: 'text-[#fe6b00]',
    shadow: 'shadow-[0_0_20px_rgba(255,107,0,0.3)]',
  },
  network: {
    icon: AlertCircle,
    bg: 'bg-[#0b0e17]/95',
    border: 'border-[#ff3366]',
    accent: 'text-[#ff3366]',
    shadow: 'shadow-[0_0_20px_rgba(255,51,102,0.3)]',
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
      className={`max-w-sm w-full backdrop-blur-xl border ${style.border} ${style.bg} ${style.shadow} p-4 rounded-xl flex items-start gap-3 transition-all duration-300 transform translate-y-0 text-xs shadow-2xl relative overflow-hidden`}
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
        <p className="text-[#e1e2e7] leading-relaxed font-sans">{message}</p>

        {/* Retry Button Option */}
        {onRetry && (
          <button
            onClick={onRetry}
            className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#151a21] border ${style.border} ${style.accent} hover:brightness-125 font-bold text-[10px] uppercase tracking-wider transition-all`}
          >
            <RefreshCw className="w-3 h-3 animate-spin-slow" />
            <span>{retryText}</span>
          </button>
        )}
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded text-[#8e9dae] hover:text-white transition-colors shrink-0"
          aria-label="Dismiss Toast Notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
