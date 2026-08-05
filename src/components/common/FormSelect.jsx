import React from 'react'

export default function FormSelect({
  label,
  id,
  name,
  value,
  onChange,
  options = [],
  required = false,
  error,
  disabled = false,
  icon: Icon,
}) {
  const selectId = id || name || `select-${Math.random().toString(36).substr(2, 9)}`
  const errorId = error ? `${selectId}-error` : undefined

  return (
    <div className="space-y-1.5 text-left font-mono">
      {label && (
        <label htmlFor={selectId} className="block font-label-md text-[11px] font-bold text-[#b9cacb] uppercase tracking-wider">
          {label} {required && <span className="text-[#00f2ff]">*</span>}
        </label>
      )}

      <div className="relative rounded-md shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#849495]">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <select
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          aria-required={required}
          className={`w-full py-3 min-h-[44px] ${
            Icon ? 'pl-10' : 'pl-4'
          } pr-10 bg-[#1d2023] border ${
            error ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-2 focus:ring-[#ef4444]/40' : 'border-[#3a494b] focus:border-[#00f2ff] focus:ring-2 focus:ring-[#00f2ff]/30'
          } rounded-md text-sm text-[#e1e2e7] focus:outline-none transition-all ${
            disabled ? 'opacity-60 cursor-not-allowed bg-[#191c1f]' : ''
          }`}
        >
          {options.map((opt) => {
            const val = typeof opt === 'object' ? opt.value : opt
            const lbl = typeof opt === 'object' ? opt.label : opt
            return (
              <option key={`opt-${val}`} value={val} className="bg-[#191c1f] text-white">
                {lbl}
              </option>
            )
          })}
        </select>
      </div>

      {error && (
        <p id={errorId} className="text-xs text-[#ef4444] font-medium pl-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
