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
        <label htmlFor={id || name} className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {label} {required && <span className="text-purple-400">*</span>}
        </label>
      )}

      <div className="relative rounded-xl shadow-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
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
          } bg-slate-900/80 border ${
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-slate-800 focus:border-purple-500 focus:ring-purple-500'
          } rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors`}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 focus:outline-none"
            tabIndex="-1"
            aria-label={showPassword ? 'Hide Password' : 'Show Password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-400 font-medium pl-1">{error}</p>}
    </div>
  )
}
