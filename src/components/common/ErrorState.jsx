import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function ErrorState({
  message = 'Unable to load data. Please check your connection.',
  onRetry,
}) {
  return (
    <div className="bg-[#151a21] border border-red-500/40 rounded-xl p-3.5 text-center space-y-2.5 max-w-xs mx-auto shadow-md max-h-[160px] overflow-hidden flex flex-col items-center justify-center isolate relative my-3">
      {/* Warning Icon Badge */}
      <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0">
        <AlertCircle className="w-4 h-4" />
      </div>

      {/* Short 1-sentence message */}
      <p className="text-[11px] font-semibold text-[#8e9dae] leading-snug max-w-xs text-center">
        {message}
      </p>

      {/* Primary Retry Action */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-cyber-primary text-[11px] px-3.5 py-1.5 min-h-[38px] inline-flex items-center justify-center gap-1.5"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Retry</span>
        </button>
      )}
    </div>
  )
}
