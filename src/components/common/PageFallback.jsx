/**
 * MJ ESPORTS — Standardized Route Suspense Fallback
 * 
 * Lightweight, non-shifting loading placeholder that preserves the cyberpunk theme
 * (deep black background, 0px border radius, amber glow spinner, uppercase monospace label).
 */
export default function PageFallback({ message = 'Loading MJ ESPORTS...' }) {
  return (
    <div
      className="min-h-[50vh] flex flex-col items-center justify-center p-8 bg-[#000000] text-center"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#FFB900] border-t-transparent rounded-none animate-spin shadow-[0_0_15px_rgba(255,185,0,0.25)]" />
        <span className="font-label-caps text-xs text-[#A3A3A3] uppercase tracking-widest">
          {message}
        </span>
      </div>
    </div>
  )
}

