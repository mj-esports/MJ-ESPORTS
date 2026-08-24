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
  showCount = false,
  prefix,
  inputMode,
  pattern,
  autoComplete,
}) {
  const [showPassword, setShowPassword] = useState(false)
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type
  const inputId = id || name || `input-${Math.random().toString(36).substr(2, 9)}`
  const errorId = error ? `${inputId}-error` : undefined

  const currentLength = value !== undefined && value !== null ? String(value).length : 0

  return (
    <div className="space-y-1.5 text-left">
      <div className="flex items-center justify-between">
        {label && (
          <label htmlFor={inputId} className="block font-label-md text-[11px] font-bold text-[#b9cacb] uppercase tracking-wider">
            {label} {required && <span className="text-[#00f2ff]">*</span>}
          </label>
        )}
        {showCount && maxLength && (
          <span className={`text-[10px] font-mono font-bold tracking-wider ${
            currentLength === maxLength ? 'text-[#00f2ff]' : 'text-[#849495]'
          }`}>
            {currentLength}/{maxLength}
          </span>
        )}
      </div>

      <div className="relative rounded-md shadow-sm flex items-stretch">
        {prefix && (
          <div className="flex items-center justify-center px-3 bg-[#1c1b1c] border-y border-l border-[#27272a] rounded-l text-xs font-mono font-bold text-[#00f2ff] select-none shrink-0">
            {prefix}
          </div>
        )}

        <div className="relative flex-1">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#849495]">
              <Icon className="w-4 h-4" />
            </div>
          )}

          <input
            id={inputId}
            name={name}
            type={inputType}
            value={value ?? ''}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            maxLength={maxLength}
            inputMode={inputMode}
            pattern={pattern}
            autoComplete={autoComplete}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
            aria-required={required}
            className={`w-full py-3 min-h-[44px] ${
              Icon ? 'pl-10' : 'pl-4'
            } ${
              isPassword ? 'pr-10' : 'pr-4'
            } ${
              prefix ? 'rounded-r rounded-l-none' : 'rounded'
            } bg-[#141416] border ${
              error ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-2 focus:ring-[#ef4444]/40' : 'border-[#27272a] focus:border-[#00f2ff] focus:ring-2 focus:ring-[#00f2ff]/25'
            } text-sm text-[#e5e2e3] placeholder-[#b9cacb]/60 focus:outline-none transition-all ${
              disabled ? 'opacity-60 cursor-not-allowed bg-[#1c1b1c]' : ''
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
      </div>

      {error && (
        <p id={errorId} className="text-xs text-[#ef4444] font-medium pl-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}


