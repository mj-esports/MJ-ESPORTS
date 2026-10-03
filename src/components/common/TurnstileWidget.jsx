// src/components/common/TurnstileWidget.jsx
// Cloudflare Turnstile Bot Protection React Widget

import { useEffect, useRef, useState } from 'react'
import {
  isTurnstileEnabled,
  renderTurnstileWidget,
  resetTurnstileWidget,
} from '../../services/turnstileService'

export default function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  action = 'generic',
  className = '',
}) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)
  const [enabled] = useState(() => isTurnstileEnabled())

  useEffect(() => {
    if (!enabled) return

    let isMounted = true

    async function initWidget() {
      if (!containerRef.current) return
      containerRef.current.innerHTML = ''

      const wId = await renderTurnstileWidget(containerRef.current, {
        action,
        onSuccess: (token) => {
          if (isMounted && onVerify) onVerify(token)
        },
        onError: (err) => {
          if (isMounted && onError) onError(err)
        },
        onExpired: () => {
          if (isMounted && onExpire) onExpire()
        },
      })

      if (isMounted) {
        widgetIdRef.current = wId
      } else if (wId) {
        resetTurnstileWidget(wId)
      }
    }

    initWidget()

    return () => {
      isMounted = false
      if (widgetIdRef.current) {
        resetTurnstileWidget(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [enabled, action])

  if (!enabled) return null

  return (
    <div className={`my-3 flex flex-col items-center justify-center ${className}`}>
      <div
        ref={containerRef}
        className="min-h-[65px] flex items-center justify-center rounded overflow-hidden"
      />
    </div>
  )
}
