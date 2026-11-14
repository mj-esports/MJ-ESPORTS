import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import {
  ExternalLink,
  Compass,
  X,
  Copy,
  Check,
  AlertTriangle,
  ArrowUpRight,
  Sparkles
} from 'lucide-react'
import { getInAppBrowserContext, buildChromeIntentUrl } from '../../utils/browserDetection'

const SESSION_STORAGE_DISMISS_KEY = 'mj_ig_browser_prompt_dismissed'

export default function InstagramBrowserPrompt() {
  const location = useLocation()
  const [context, setContext] = useState(() => getInAppBrowserContext())
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      if (typeof window === 'undefined' || !window.sessionStorage) return false
      return window.sessionStorage.getItem(SESSION_STORAGE_DISMISS_KEY) === '1'
    } catch {
      // Storage unavailable or blocked in restricted WebViews (e.g. Private Browsing)
      return false
    }
  })
  const [showFallback, setShowFallback] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isAttempting, setIsAttempting] = useState(false)

  // Track timers and event listeners for clean unmount handling
  const fallbackTimerRef = useRef(null)
  const copyTimerRef = useRef(null)
  const visibilityListenerRef = useRef(null)

  // Cleanup all timers and document listeners on unmount
  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current)
        fallbackTimerRef.current = null
      }
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current)
        copyTimerRef.current = null
      }
      if (visibilityListenerRef.current && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', visibilityListenerRef.current)
        visibilityListenerRef.current = null
      }
    }
  }, [])

  // Dynamically update URL and intent URL on route changes
  useEffect(() => {
    const updated = getInAppBrowserContext()
    setContext(updated)
  }, [location])

  // If not running inside Instagram or already dismissed in this session, render nothing
  if (!context.isInstagram || isDismissed) {
    return null
  }

  const handleDismiss = () => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(SESSION_STORAGE_DISMISS_KEY, '1')
      }
    } catch {
      // Storage unavailable or blocked in restricted WebViews
    }
    setIsDismissed(true)
  }

  const handleCopyLink = async () => {
    try {
      const urlToCopy = window.location.href
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(urlToCopy)
      } else {
        // Fallback for older WebViews
        const textArea = document.createElement('textarea')
        textArea.value = urlToCopy
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setCopied(true)

      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
      copyTimerRef.current = setTimeout(() => {
        setCopied(false)
        copyTimerRef.current = null
      }, 2500)
    } catch (err) {
      console.warn('[InstagramBrowserPrompt] Failed to copy URL:', err)
    }
  }

  const handleOpenChromeClick = () => {
    setIsAttempting(true)
    const startTime = Date.now()

    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current)
    if (visibilityListenerRef.current && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', visibilityListenerRef.current)
      visibilityListenerRef.current = null
    }

    // Detect if Android failed to transition away from Instagram within 1.8s
    fallbackTimerRef.current = setTimeout(() => {
      if (typeof document !== 'undefined' && !document.hidden && Date.now() - startTime < 3500) {
        setShowFallback(true)
        setIsAttempting(false)
      }
      fallbackTimerRef.current = null
    }, 1800)

    const onVisibilityChange = () => {
      if (document.hidden) {
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current)
          fallbackTimerRef.current = null
        }
        setIsAttempting(false)
      }
    }

    visibilityListenerRef.current = onVisibilityChange
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange, { once: true })
    }
  }

  const currentHref = typeof window !== 'undefined' ? window.location.href : context.currentUrl
  const chromeIntentUrl = context.chromeIntentUrl || buildChromeIntentUrl(currentHref)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ig-prompt-title"
      className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 select-none animate-fade-in"
    >
      <div className="w-full max-w-md bg-[#07090c] border border-[#FFB900]/70 rounded-none shadow-[0_0_35px_rgba(255,185,0,0.25)] p-5 text-white relative overflow-hidden flex flex-col gap-4">
        {/* Top Decorative Tech Accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFB900] to-transparent" />
        
        {/* Header Section */}
        <div className="flex items-start justify-between gap-3 pt-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold tracking-wider uppercase bg-[#FFB900]/15 text-[#FFB900] border border-[#FFB900]/30 rounded-none flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>INSTAGRAM BROWSER DETECTED</span>
              </span>
              {context.isAndroid ? (
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider uppercase bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 rounded-none">
                  ANDROID
                </span>
              ) : context.isIOS ? (
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider uppercase bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30 rounded-none">
                  IOS
                </span>
              ) : null}
            </div>
            <h3 id="ig-prompt-title" className="font-headline font-black uppercase text-base sm:text-lg text-white tracking-wide pt-1">
              {context.isAndroid ? 'Open in Google Chrome' : 'Open in External Browser'}
            </h3>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1.5 text-[#A3A3A3] hover:text-white hover:bg-[#151a21] transition-colors rounded-none"
            aria-label="Dismiss prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative Explanation */}
        <p className="text-xs text-[#A3A3A3] leading-relaxed">
          Instagram's built-in browser has restrictions that can disrupt{' '}
          <span className="text-[#00f2ff] font-bold">UPI payment apps (GPay, PhonePe, Paytm)</span>{' '}
          and player registration sessions. Switch to your default browser for the best experience.
        </p>

        {/* ANDROID EXPERIENCE */}
        {context.isAndroid && (
          <div className="space-y-3">
            {/* Primary Action Button */}
            <a
              href={chromeIntentUrl}
              onClick={handleOpenChromeClick}
              className="w-full bg-[#FFB900] hover:bg-[#ffc833] active:scale-[0.99] text-black font-headline font-black uppercase text-xs tracking-wider py-3 px-4 rounded-none flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,185,0,0.35)] transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{isAttempting ? 'LAUNCHING CHROME...' : 'OPEN IN GOOGLE CHROME'}</span>
            </a>

            {/* Fallback Message & Instructions (shown if launch fails or is triggered) */}
            {showFallback ? (
              <div className="bg-[#11161d] border border-[#FF6200]/50 p-3.5 space-y-2 rounded-none animate-fade-in">
                <div className="flex items-center gap-2 text-[#FF6200] font-bold text-xs uppercase">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Chrome didn't open automatically?</span>
                </div>
                <p className="text-[11px] text-[#A3A3A3] leading-relaxed">
                  Tap the <strong className="text-white">three dots (⋮)</strong> in the top-right corner of Instagram and select{' '}
                  <strong className="text-[#FFB900]">'Open in Chrome'</strong> or{' '}
                  <strong className="text-[#FFB900]">'Open in external browser'</strong>.
                </p>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full mt-1 bg-[#1a232f] hover:bg-[#222f40] border border-[#3a494b] text-[#00f2ff] text-[11px] font-mono font-bold uppercase py-2 px-3 flex items-center justify-center gap-2 rounded-none transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#00ff9d]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'LINK COPIED TO CLIPBOARD!' : 'COPY WEBSITE LINK'}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => setShowFallback(true)}
                  className="text-[#8e9dae] hover:text-[#00f2ff] underline underline-offset-2 transition-colors"
                >
                  Chrome not opening? View fallback steps
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="text-[#00f2ff] hover:underline flex items-center gap-1 font-mono uppercase text-[10px]"
                >
                  {copied ? <Check className="w-3 h-3 text-[#00ff9d]" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'COPIED' : 'COPY LINK'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* IOS EXPERIENCE */}
        {!context.isAndroid && (
          <div className="space-y-3">
            <div className="bg-[#11161d] border border-[#3a494b]/80 p-3.5 space-y-2.5 rounded-none">
              <div className="flex items-center justify-between text-xs font-bold text-[#FFB900] uppercase">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 shrink-0 text-[#FFB900]" />
                  <span>How to open in Safari:</span>
                </div>
                <span className="flex items-center text-[10px] text-[#00f2ff] font-mono gap-0.5">
                  <span>LOOK UP</span>
                  <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
              <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-[#A3A3A3] leading-relaxed">
                <li>
                  Tap the <strong className="text-white">three dots (•••)</strong> or share icon in the top-right corner of Instagram.
                </li>
                <li>
                  Select <strong className="text-[#FFB900]">'Open in Safari'</strong> (or 'Open in System Browser').
                </li>
              </ol>
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full mt-1 bg-[#1a232f] hover:bg-[#222f40] border border-[#3a494b] text-[#00f2ff] text-[11px] font-mono font-bold uppercase py-2 px-3 flex items-center justify-center gap-2 rounded-none transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#00ff9d]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'LINK COPIED TO CLIPBOARD!' : 'COPY WEBSITE LINK'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Secondary Dismissal: Continue in Instagram */}
        <div className="pt-1 border-t border-[#1B1B1F] flex items-center justify-between">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full text-center py-1 text-xs text-[#8e9dae] hover:text-white font-mono uppercase tracking-wider transition-colors"
          >
            Continue in Instagram
          </button>
        </div>
      </div>
    </div>
  )
}
