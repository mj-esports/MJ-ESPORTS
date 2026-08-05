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
  color = 'cyan' // 'cyan' | 'green' | 'orange'
}) {
  const colorStyles = {
    cyan: {
      active: 'bg-[#00f2ff] shadow-[0_0_12px_rgba(0,242,255,0.4)]',
      border: 'border-[#00f2ff]/40',
      text: 'text-[#00f2ff]'
    },
    green: {
      active: 'bg-[#00ff9d] shadow-[0_0_12px_rgba(0,255,157,0.4)]',
      border: 'border-[#00ff9d]/40',
      text: 'text-[#00ff9d]'
    },
    orange: {
      active: 'bg-[#fe6b00] shadow-[0_0_12px_rgba(254,107,0,0.4)]',
      border: 'border-[#fe6b00]/40',
      text: 'text-[#fe6b00]'
    }
  }

  const activeTheme = colorStyles[color] || colorStyles.cyan

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
        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${
          checked
            ? 'bg-[#151a21] border-[#00f2ff]/50 shadow-[0_0_15px_rgba(0,242,255,0.08)]'
            : 'bg-[#07090c] border-[#3a494b]/60 hover:border-[#3a494b]'
        }`}
      >
        <div className="space-y-0.5 pr-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
            <span>{label}</span>
            {required && <span className="text-[#ff4655]">*</span>}
          </div>
          {description && (
            <p className="text-[11px] text-[#8e9dae] leading-relaxed">
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
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            checked ? activeTheme.active : 'bg-[#1a212b]'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-black shadow-md ring-0 transition duration-200 ease-in-out ${
              checked ? 'translate-x-5 bg-black' : 'translate-x-0 bg-[#8e9dae]'
            }`}
          />
        </button>
      </div>

      {error && (
        <p className="text-[11px] text-[#ff4655] font-medium pl-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
