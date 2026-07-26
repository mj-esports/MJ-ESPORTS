import React, { useEffect } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

export interface ToastProps {
  id?: string
  type?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  onClose?: () => void
  autoCloseMs?: number
}

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-[#0f1318]/95',
    border: 'border-[#00ff9d]',
    accent: 'text-[#00ff9d]',
    shadow: 'shadow-[0_0_20px_rgba(0,255,157,0.25)]',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-[#0f1318]/95',
    border: 'border-[#ff3366]',
    accent: 'text-[#ff3366]',
    shadow: 'shadow-[0_0_20px_rgba(255,51,102,0.25)]',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-[#0f1318]/95',
    border: 'border-[#fe6b00]',
    accent: 'text-[#fe6b00]',
    shadow: 'shadow-[0_0_20px_rgba(255,107,0,0.25)]',
  },
  info: {
    icon: Info,
    bg: 'bg-[#0f1318]/95',
    border: 'border-[#00f2ff]',
    accent: 'text-[#00f2ff]',
    shadow: 'shadow-[0_0_20px_rgba(0,242,255,0.25)]',
  },
}

export default function Toast({
  type = 'info',
  title,
  message,
  onClose,
  autoCloseMs = 5000,
}: ToastProps) {
  const style = TOAST_STYLES[type] || TOAST_STYLES.info
  const IconComponent = style.icon

  useEffect(() => {
    if (!onClose || !autoCloseMs) return
    const timer = setTimeout(() => {
      onClose()
    }, autoCloseMs)
    return () => clearTimeout(timer)
  }, [onClose, autoCloseMs])

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 max-w-sm w-full backdrop-blur-xl border ${style.border} ${style.bg} ${style.shadow} p-4 rounded-xl flex items-start gap-3 transition-all animate-bounce-short text-xs`}
    >
      <IconComponent className={`w-5 h-5 ${style.accent} shrink-0 mt-0.5`} />
      <div className="flex-1 space-y-0.5">
        {title && (
          <h4 className={`font-display-lg font-extrabold uppercase tracking-wider ${style.accent}`}>
            {title}
          </h4>
        )}
        <p className="text-[#e1e2e7] leading-relaxed font-sans">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded text-[#8e9dae] hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
