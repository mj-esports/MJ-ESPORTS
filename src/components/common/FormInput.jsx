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
}) {
  const [showPassword, setShowPassword] = useState(false)
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="space-y-1.5 text-left">
      {label && (
        <label htmlFor={id || name} className="block font-label-caps text-[11px] font-bold text-[#8e9dae] uppercase tracking-wider">
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
          id={id || name}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`w-full py-3 ${
            Icon ? 'pl-10' : 'pl-4'
          } ${
            isPassword ? 'pr-10' : 'pr-4'
          } bg-[#07090c] border ${
            error ? 'border-[#ff3366] focus:border-[#ff3366] focus:shadow-[0_0_12px_rgba(255,51,102,0.3)]' : 'border-[#3a494b] focus:border-[#00f2ff] focus:shadow-[0_0_12px_rgba(0,242,255,0.25)]'
          } rounded-lg text-sm text-[#e1e2e7] placeholder-[#8e9dae] focus:outline-none transition-all`}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8e9dae] hover:text-[#00f2ff] focus:outline-none"
            tabIndex="-1"
            aria-label={showPassword ? 'Hide Password' : 'Show Password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-[#ff3366] font-medium pl-1">{error}</p>}
    </div>
  )
}
