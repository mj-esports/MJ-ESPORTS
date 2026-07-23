import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

export default function AuthAlert({ type = 'error', message }) {
  if (!message) return null

  const isError = type === 'error'
  const isSuccess = type === 'success'

  return (
    <div
      className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 transition-all ${
        isError
          ? 'bg-red-950/60 border-red-800/60 text-red-300'
          : isSuccess
          ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
          : 'bg-indigo-950/60 border-indigo-800/60 text-indigo-300'
      }`}
    >
      {isError && <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
      {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
      {!isError && !isSuccess && <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />}
      <span className="leading-relaxed font-medium">{message}</span>
    </div>
  )
}
