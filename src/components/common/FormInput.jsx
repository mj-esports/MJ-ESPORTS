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
          <label htmlFor={inputId} className="block font-label-md text-[11px] font-bold text-[#A3A3A3] uppercase tracking-wider">
            {label} {required && <span className="text-[#FFB900]">*</span>}
          </label>
        )}
        {showCount && maxLength && (
          <span className={`text-[10px] font-mono font-bold tracking-wider ${
            currentLength === maxLength ? 'text-[#FFB900]' : 'text-[#A3A3A3]'
          }`}>
            {currentLength}/{maxLength}
          </span>
        )}
      </div>

      <div className="relative rounded-none shadow-sm flex items-stretch">
        {prefix && (
          <div className="flex items-center justify-center px-3 bg-[#1B1B1F] border-y border-l border-[#2A2A30] rounded-none text-xs font-mono font-bold text-[#FFB900] select-none shrink-0">
            {prefix}
          </div>
        )}

        <div className="relative flex-1">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
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
            } rounded-none bg-[#111318] border ${
              error ? 'border-[#FF0000] focus:border-[#FF0000] focus:ring-2 focus:ring-[#FF0000]/40' : 'border-[#2A2A30] focus:border-[#FFB900] focus:ring-2 focus:ring-[#FFB900]/25'
            } text-sm text-[#FFFFFF] placeholder-[#A3A3A3]/60 focus:outline-none transition-all ${
              disabled ? 'opacity-60 cursor-not-allowed bg-[#1B1B1F]' : ''
            }`}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={disabled}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#A3A3A3] hover:text-[#FFB900] focus:outline-none disabled:opacity-50 min-h-[44px] min-w-[44px] justify-center"
              tabIndex={disabled ? -1 : 0}
              aria-label={showPassword ? 'Hide Password' : 'Show Password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p id={errorId} className="text-xs text-[#FF0000] font-medium pl-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}


