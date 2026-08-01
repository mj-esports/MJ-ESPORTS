import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function FormInput({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  icon: Icon,
  isPassword = false,
  disabled = false,
  maxLength,
  autoComplete,
}) {
  const [showPassword, setShowPassword] = useState(false)
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type
  const inputId = id || name || `input-${Math.random().toString(36).substr(2, 9)}`
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div className="space-y-1.5 text-left">
      {label && (
        <label htmlFor={inputId} className="block font-label-caps text-[11px] font-bold text-[#8e9dae] uppercase tracking-wider">
          {label} {required && <span className="text-[#00f2ff]">*</span>}
        </label>
      )}

      <div className="relative rounded-lg shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8e9dae]">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={inputId}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          aria-required={required}
          className={`w-full py-3 ${
            Icon ? 'pl-10' : 'pl-4'
          } ${
            isPassword ? 'pr-10' : 'pr-4'
          } bg-[#07090c] border ${
            error ? 'border-[#ff3366] focus:border-[#ff3366] focus:ring-2 focus:ring-[#ff3366]/40' : 'border-[#3a494b] focus:border-[#00f2ff] focus:ring-2 focus:ring-[#00f2ff]/50'
          } rounded-lg text-sm text-[#e1e2e7] placeholder-[#8e9dae] focus:outline-none transition-all ${
            disabled ? 'opacity-60 cursor-not-allowed bg-[#0b0e11]' : ''
          }`}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8e9dae] hover:text-[#00f2ff] focus:outline-none disabled:opacity-50"
            tabIndex={disabled ? -1 : 0}
            aria-label={showPassword ? 'Hide Password' : 'Show Password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {error && (
        <p id={errorId} className="text-xs text-[#ff3366] font-medium pl-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

