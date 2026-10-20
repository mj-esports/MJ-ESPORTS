import React from 'react'

export default function ToggleSwitch({
  id,
  name,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  required = false,
  error = null,
  color = 'amber' // 'amber' | 'cyan' | 'green' | 'orange'
}) {
  const colorStyles = {
    amber: {
      active: 'bg-[#FFB900] shadow-[0_0_12px_rgba(255,185,0,0.4)]',
      border: 'border-[#FFB900]/40',
      text: 'text-[#FFB900]'
    },
    cyan: {
      active: 'bg-[#FFB900] shadow-[0_0_12px_rgba(255,185,0,0.4)]',
      border: 'border-[#FFB900]/40',
      text: 'text-[#FFB900]'
    },
    green: {
      active: 'bg-[#10b981] shadow-[0_0_12px_rgba(16,185,129,0.4)]',
      border: 'border-[#10b981]/40',
      text: 'text-[#10b981]'
    },
    orange: {
      active: 'bg-[#FF6200] shadow-[0_0_12px_rgba(255,98,0,0.4)]',
      border: 'border-[#FF6200]/40',
      text: 'text-[#FF6200]'
    }
  }

  const activeTheme = colorStyles[color] || colorStyles.amber || colorStyles.cyan

  const handleToggle = () => {
    if (disabled) return
    const fakeEvent = {
      target: {
        name: name || id,
        type: 'checkbox',
        checked: !checked
      }
    }
    if (onChange) onChange(fakeEvent)
  }

  return (
    <div className="space-y-1">
      <div
        onClick={handleToggle}
        className={`flex items-center justify-between p-3 rounded-none border transition-all cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${
          checked
            ? 'bg-[#111318] border-[#FFB900]/50 shadow-[0_0_15px_rgba(255,185,0,0.08)]'
            : 'bg-[#000000] border-[#2A2A30] hover:border-[#FFB900]/50'
        }`}
      >
        <div className="space-y-0.5 pr-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
            <span>{label}</span>
            {required && <span className="text-[#FF0000]">*</span>}
          </div>
          {description && (
            <p className="text-[11px] text-[#A3A3A3] leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Cyberpunk Toggle Button */}
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation()
            handleToggle()
          }}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-none border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            checked ? activeTheme.active : 'bg-[#2A2A30]'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-none bg-black shadow-md ring-0 transition duration-200 ease-in-out ${
              checked ? 'translate-x-5 bg-black' : 'translate-x-0 bg-[#A3A3A3]'
            }`}
          />
        </button>
      </div>

      {error && (
        <p className="text-[11px] text-[#FF0000] font-medium pl-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
