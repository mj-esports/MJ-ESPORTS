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
        <label htmlFor={selectId} className="block font-label-md text-[11px] font-bold text-[#A3A3A3] uppercase tracking-wider">
          {label} {required && <span className="text-[#FFB900]">*</span>}
        </label>
      )}

      <div className="relative rounded-none shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
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
          } pr-10 bg-[#111318] border ${
            error ? 'border-[#FF0000] focus:border-[#FF0000] focus:ring-2 focus:ring-[#FF0000]/40' : 'border-[#2A2A30] focus:border-[#FFB900] focus:ring-2 focus:ring-[#FFB900]/30'
          } rounded-none text-sm text-[#FFFFFF] focus:outline-none transition-all ${
            disabled ? 'opacity-60 cursor-not-allowed bg-[#1B1B1F]' : ''
          }`}
        >
          {options.map((opt) => {
            const val = typeof opt === 'object' ? opt.value : opt
            const lbl = typeof opt === 'object' ? opt.label : opt
            return (
              <option key={`opt-${val}`} value={val} className="bg-[#111318] text-white">
                {lbl}
              </option>
            )
          })}
        </select>
      </div>

      {error && (
        <p id={errorId} className="text-xs text-[#FF0000] font-medium pl-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
