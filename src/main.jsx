import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/index.css'
import App from './App.jsx'

// Phase 16: Global Unhandled Rejection & Runtime Diagnostics Safeguard
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason
    const message = reason?.message || String(reason || '')
    // Filter benign browser extension noise and resize observer loops
    if (
      message.includes('Extension context invalidated') ||
      message.includes('ResizeObserver loop') ||
      message.includes('chrome-extension://')
    ) {
      return
    }
    console.warn('[Global Unhandled Rejection Caught]:', message)
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
