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
        <label htmlFor={inputId} className="block font-label-md text-[11px] font-bold text-[#b9cacb] uppercase tracking-wider">
          {label} {required && <span className="text-[#00f2ff]">*</span>}
        </label>
      )}

      <div className="relative rounded-md shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#849495]">
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
          className={`w-full py-3 min-h-[44px] ${
            Icon ? 'pl-10' : 'pl-4'
          } ${
            isPassword ? 'pr-10' : 'pr-4'
          } bg-[#1d2023] border ${
            error ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-2 focus:ring-[#ef4444]/40' : 'border-[#3a494b] focus:border-[#00f2ff] focus:ring-2 focus:ring-[#00f2ff]/30'
          } rounded-md text-sm text-[#e1e2e7] placeholder-[#b9cacb]/60 focus:outline-none transition-all ${
            disabled ? 'opacity-60 cursor-not-allowed bg-[#191c1f]' : ''
          }`}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#849495] hover:text-[#00f2ff] focus:outline-none disabled:opacity-50 min-h-[44px] min-w-[44px] justify-center"
            tabIndex={disabled ? -1 : 0}
            aria-label={showPassword ? 'Hide Password' : 'Show Password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {error && (
        <p id={errorId} className="text-xs text-[#ef4444] font-medium pl-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

