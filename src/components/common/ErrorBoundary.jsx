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
    console.error('[ErrorBoundary caught exception]:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const sanitized = sanitizeError(this.state.error)

      return (
        <div className="min-h-screen bg-[#0b0e17] text-[#e1e2e7] flex items-center justify-center p-6 relative overflow-hidden font-sans">
          {/* Cyberpunk aura background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#ff3366]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="bg-[#151a21] border border-[#ff3366]/40 rounded-2xl p-8 sm:p-12 text-center space-y-6 max-w-lg w-full shadow-[0_0_30px_rgba(255,51,102,0.2)] relative z-10">
            
            <div className="w-16 h-16 rounded-2xl bg-[#07090c] border border-[#ff3366]/60 flex items-center justify-center mx-auto text-[#ff3366] shadow-lg">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display-lg text-xl sm:text-2xl font-extrabold text-white uppercase tracking-tight">
                {sanitized.title}
              </h2>
              <p className="text-[#8e9dae] text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
                {sanitized.message}
              </p>
              {/* DEBUG: Real error exposed for diagnosis */}
              <div className="mt-4 p-3 bg-[#07090c] border border-[#ff3366]/30 rounded text-left overflow-auto max-h-48 text-[10px] font-mono text-[#ff6688]">
                <p className="font-bold text-white mb-1">RAW ERROR:</p>
                <p>{this.state.error?.message || String(this.state.error)}</p>
                <p className="font-bold text-white mt-2 mb-1">STACK:</p>
                <pre className="whitespace-pre-wrap break-all">{this.state.error?.stack || 'No stack available'}</pre>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleRetry}
                className="btn-cyber-primary flex-1 inline-flex items-center justify-center gap-2 min-h-[44px]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Application</span>
              </button>

              <a
                href="/"
                className="py-3 px-5 rounded-xl bg-[#0b0e17] border border-[#3a494b] text-[#e1e2e7] hover:text-[#00f2ff] hover:border-[#00f2ff] font-bold text-xs flex items-center justify-center gap-2 transition-all min-h-[44px]"
              >
                <Home className="w-4 h-4 text-[#00f2ff]" />
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
