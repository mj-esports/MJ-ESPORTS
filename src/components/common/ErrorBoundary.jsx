import React, { Component } from 'react'
import { RefreshCw, Home, ShieldAlert } from 'lucide-react'
import { sanitizeError } from '../../utils/errorHandler'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Safe structured logging for telemetry/debugging without leaking secrets
    console.error('[ErrorBoundary caught exception]:', {
      name: error?.name,
      message: error?.message,
      componentStack: errorInfo?.componentStack,
    })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const sanitized = sanitizeError(this.state.error)

      return (
        <div className="min-h-screen min-h-dvh flex-1 w-full bg-[#000000] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
          <div className="bg-[#111215] border border-[#EF4444]/40 rounded-none p-8 sm:p-12 text-center space-y-6 max-w-lg w-full shadow-2xl relative z-10">
            
            <div className="w-16 h-16 rounded-none bg-[#EF4444]/10 border border-[#EF4444]/40 flex items-center justify-center mx-auto text-[#EF4444]">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight">
                {sanitized.title}
              </h2>
              <p className="text-[#A1A1AA] text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
                {sanitized.message}
              </p>
              
              {/* Technical Diagnostics — Strictly gated to Development mode, NEVER exposed in Production */}
              {import.meta.env.DEV && (
                <details className="mt-4 p-3 bg-[#18181B] border border-[#EF4444]/30 rounded-none text-left overflow-auto max-h-48 text-[10px] font-mono text-[#EF4444]">
                  <summary className="font-bold text-white mb-1 cursor-pointer select-none">
                    DEVELOPMENT DIAGNOSTICS (DEV ONLY)
                  </summary>
                  <p className="font-bold text-white mt-2 mb-1">RAW ERROR:</p>
                  <p>{this.state.error?.message || String(this.state.error)}</p>
                  <p className="font-bold text-white mt-2 mb-1">STACK TRACE:</p>
                  <pre className="whitespace-pre-wrap break-all">{this.state.error?.stack || 'No stack available'}</pre>
                </details>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleRetry}
                className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] bg-[#FFB900] hover:bg-[#FFC933] text-black font-extrabold text-xs uppercase tracking-wider rounded-none transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Application</span>
              </button>

              <a
                href="/"
                className="py-3 px-5 rounded-none bg-[#18181B] border border-[#27272A] text-white hover:text-[#FFB900] hover:border-[#FFB900] font-bold text-xs flex items-center justify-center gap-2 transition-all min-h-[44px]"
              >
                <Home className="w-4 h-4 text-[#FFB900]" />
                <span>Return Home</span>
              </a>
            </div>

          </div>
        </div>
      )
    }

    return this.props.children
  }
}
