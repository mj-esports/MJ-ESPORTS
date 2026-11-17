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
        <label className="block font-label-md text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider">
          {label} {required && <span className="text-[#FFB900]">*</span>}
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
              className={`py-2.5 px-3 rounded-none text-xs font-bold uppercase transition-all border flex flex-col items-center justify-center min-h-[44px] cursor-pointer ${
                isSelected
                  ? 'bg-[#FFB900] text-black border-[#FFB900] font-extrabold'
                  : 'bg-[#18181B] text-[#A1A1AA] border-[#27272A] hover:text-white hover:border-[#FFB900]/50'
              }`}
            >
              <span className="font-extrabold">{m.label}</span>
              <span className="text-[9.5px] opacity-75 font-mono">({m.size}P)</span>
            </button>
          )
        })}
      </div>

      {error && (
        <p className="text-xs text-[#EF4444] font-medium pl-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
