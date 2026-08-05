import React from 'react'

export default function FormModeSelector({
  label = 'Competition Mode',
  value = 'squad',
  onChange,
  options = [
    { key: 'solo', label: 'SOLO', size: 1 },
    { key: 'duo', label: 'DUO', size: 2 },
    { key: 'squad', label: 'SQUAD', size: 4 },
  ],
  required = false,
  error,
}) {
  return (
    <div className="space-y-1.5 text-left font-mono">
      {label && (
        <label className="block font-label-md text-[11px] font-bold text-[#b9cacb] uppercase tracking-wider">
          {label} {required && <span className="text-[#00f2ff]">*</span>}
        </label>
      )}

      <div className="grid grid-cols-3 gap-2">
        {options.map((m) => {
          const isSelected = value === m.key
          return (
            <button
              key={`mode-btn-${m.key}`}
              type="button"
              onClick={() => onChange(m.key)}
              className={`py-2.5 px-3 rounded-md text-xs font-bold uppercase transition-all border flex flex-col items-center justify-center min-h-[44px] cursor-pointer ${
                isSelected
                  ? 'bg-[#00f2ff]/20 text-[#00f2ff] border-[#00f2ff] font-extrabold shadow-[0_0_12px_rgba(0,242,255,0.3)]'
                  : 'bg-[#1d2023] text-[#849495] border-[#3a494b] hover:text-white hover:border-[#00f2ff]/40'
              }`}
            >
              <span className="font-extrabold">{m.label}</span>
              <span className="text-[9.5px] opacity-75 font-mono">({m.size}P)</span>
            </button>
          )
        })}
      </div>

      {error && (
        <p className="text-xs text-[#ef4444] font-medium pl-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
