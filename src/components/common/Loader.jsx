import React, { useState, useEffect } from 'react'

/**
 * MJ ESPORTS Game Boot Loader Component
 * Pixel-perfect recreation of Reference Image 1.
 * Features:
 * - Near-black gaming HUD canvas with subtle tactical angular facets & scanlines
 * - Cyan corner HUD brackets (4 corners) & tactical side micro-dot markings
 * - Static central official MJ ESPORTS logo insignia (NEVER rotates)
 * - Smoothly rotating outer segmented cyan energy ring
 * - MJ ESPORTS branding with < SYSTEM INITIALIZING > status
 * - Striped cyan neon progress bar with dynamic percentage counter
 * - LOADING GAME SERVICES... indicator with 3 sequential animated pulsing dots
 */
const Loader = ({ className = '', isReady = false, onComplete = null }) => {
  const [progress, setProgress] = useState(12)

  useEffect(() => {
    let animationFrameId
    let startTime = Date.now()

    const updateProgress = () => {
      const elapsed = Date.now() - startTime

      if (isReady) {
        // Accelerate smoothly to 100% once app services are initialized
        setProgress((prev) => {
          if (prev >= 100) {
            if (onComplete) onComplete()
            return 100
          }
          return Math.min(100, prev + 8)
        })
      } else {
        // Smoothly advance progress up to 92% while waiting for async services
        setProgress((prev) => {
          if (prev >= 92) return 92
          const increment = Math.max(0.5, (92 - prev) * 0.04)
          return Math.min(92, prev + increment)
        })
      }

      animationFrameId = requestAnimationFrame(updateProgress)
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (isReady) {
          if (prev >= 100) {
            clearInterval(interval)
            if (onComplete) onComplete()
            return 100
          }
          return Math.min(100, prev + 12)
        }
        if (prev < 90) {
          return prev + Math.random() * 6 + 2
        }
        return prev
      })
    }, 120)

    return () => {
      cancelAnimationFrame(animationFrameId)
      clearInterval(interval)
    }
  }, [isReady, onComplete])

  return (
    <div
      className={`fixed inset-0 min-h-screen w-full flex flex-col items-center justify-center bg-[#03060a] text-white select-none overflow-hidden font-mono z-[99999] ${className}`}
      role="status"
      aria-label="MJ ESPORTS Game Services Initializing"
    >
      {/* 1. BACKGROUND TACTICAL FACETS & HUD BRACKETS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Deep ambient background gradient */}
        <div className="absolute inset-0 bg-radial from-[#06101e] via-[#03060a] to-[#020407]" />

        {/* Subtle geometric dark polygon facets */}
        <div
          className="absolute -top-24 -left-24 w-96 h-96 bg-[#070e1a]/40 transform -rotate-12 border-b border-[#00f2ff]/5"
          style={{ clipPath: 'polygon(0 0, 100% 0, 80% 100%, 0 80%)' }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-[32rem] h-[32rem] bg-[#070e1a]/30 transform rotate-12 border-t border-[#00f2ff]/5"
          style={{ clipPath: 'polygon(20% 0, 100% 20%, 100% 100%, 0 100%)' }}
        />
        <div
          className="absolute top-1/3 -right-20 w-80 h-80 bg-[#050b14]/50 transform rotate-45 border border-[#00f2ff]/5"
          style={{ clipPath: 'polygon(15% 0, 100% 15%, 85% 100%, 0 85%)' }}
        />

        {/* Subtle central radial cyan glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-[#00f2ff]/[0.035] rounded-full blur-3xl pointer-events-none" />

        {/* Corner HUD Brackets */}
        {/* Top-Left */}
        <div className="absolute top-6 left-6 sm:top-8 sm:left-8 w-6 h-6 border-t-2 border-l-2 border-[#00f2ff] shadow-[0_0_8px_rgba(0,242,255,0.6)]" />
        {/* Top-Right */}
        <div className="absolute top-6 right-6 sm:top-8 sm:right-8 w-6 h-6 border-t-2 border-r-2 border-[#00f2ff] shadow-[0_0_8px_rgba(0,242,255,0.6)]" />
        {/* Bottom-Left */}
        <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8 w-6 h-6 border-b-2 border-l-2 border-[#00f2ff] shadow-[0_0_8px_rgba(0,242,255,0.6)]" />
        {/* Bottom-Right */}
        <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 w-6 h-6 border-b-2 border-r-2 border-[#00f2ff] shadow-[0_0_8px_rgba(0,242,255,0.6)]" />

        {/* Tactical side micro-dot markings */}
        {/* Left Side Indicators */}
        <div className="absolute left-6 sm:left-8 top-1/2 -translate-y-12 flex flex-col gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff]/80 shadow-[0_0_6px_#00f2ff]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff]/50" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff]/30" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff]/20" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff]/10" />
          </div>
          {/* Orange Accent Chevron */}
          <div className="text-[#ff5e07] text-xs font-black tracking-widest pl-0.5 select-none animate-pulse">
            &gt;
          </div>
        </div>

        {/* Right Side Indicators */}
        <div className="absolute right-6 sm:right-8 top-1/2 -translate-y-4 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff]/10" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff]/20" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff]/30" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff]/50" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff]/80 shadow-[0_0_6px_#00f2ff]" />
        </div>
      </div>

      {/* 2. MAIN CENTER HUD EMBLEM & ENERGY RING */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Circular HUD Arena */}
        <div className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 flex items-center justify-center">
          
          {/* Soft ambient back glow behind the ring */}
          <div className="absolute inset-4 rounded-full bg-[#00f2ff]/10 blur-2xl animate-pulse pointer-events-none" />

          {/* ROTATING SEGMENTED CYAN ENERGY RING (Only this rotates) */}
          <div className="absolute inset-0 flex items-center justify-center animate-[spin_6s_linear_infinite] pointer-events-none">
            <svg
              className="w-full h-full"
              viewBox="0 0 260 260"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer thin dashed guide circle */}
              <circle
                cx="130"
                cy="130"
                r="118"
                stroke="#00f2ff"
                strokeWidth="1"
                strokeOpacity="0.25"
                strokeDasharray="3 8"
              />

              {/* Glowing Segments 1 & 2: Primary Thick Energy Arcs */}
              {/* Top-Right Arc */}
              <path
                d="M 130 14 A 116 116 0 0 1 246 130"
                stroke="#00f2ff"
                strokeWidth="5"
                strokeLinecap="round"
                className="filter drop-shadow-[0_0_8px_#00f2ff] drop-shadow-[0_0_18px_rgba(0,242,255,0.8)]"
              />

              {/* Bottom-Left Arc */}
              <path
                d="M 130 246 A 116 116 0 0 1 14 130"
                stroke="#00f2ff"
                strokeWidth="5"
                strokeLinecap="round"
                className="filter drop-shadow-[0_0_8px_#00f2ff] drop-shadow-[0_0_18px_rgba(0,242,255,0.8)]"
              />

              {/* Secondary Thinner Accent Tick Arcs */}
              <path
                d="M 238 90 A 116 116 0 0 1 246 130"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeOpacity="0.8"
              />
              <path
                d="M 22 170 A 116 116 0 0 1 14 130"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeOpacity="0.8"
              />

              {/* Segmented Micro Tick Marks */}
              <circle cx="130" cy="14" r="2.5" fill="#ffffff" className="filter drop-shadow-[0_0_4px_#00f2ff]" />
              <circle cx="246" cy="130" r="2.5" fill="#ffffff" className="filter drop-shadow-[0_0_4px_#00f2ff]" />
              <circle cx="130" cy="246" r="2.5" fill="#ffffff" className="filter drop-shadow-[0_0_4px_#00f2ff]" />
              <circle cx="14" cy="130" r="2.5" fill="#ffffff" className="filter drop-shadow-[0_0_4px_#00f2ff]" />
            </svg>
          </div>

          {/* STATIC CENTRAL LOGO CORE (NEVER ROTATES) */}
          <div className="relative z-20 w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-[#050911] border border-[#00f2ff]/25 flex flex-col items-center justify-center shadow-[inset_0_0_24px_rgba(0,0,0,0.95),0_0_30px_rgba(0,242,255,0.12)]">
            
            {/* Subtle inner ring border */}
            <div className="absolute inset-2 rounded-full border border-[#00f2ff]/10 pointer-events-none" />

            {/* Official Stylized "Mj" Insignia */}
            <div className="flex items-center justify-center select-none transform -skew-x-6">
              {/* "M" in Crisp White */}
              <span className="font-black italic text-4xl sm:text-5xl text-white tracking-tighter drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]">
                M
              </span>
              
              {/* "j" with cyan upper slant accent */}
              <span className="font-black italic text-4xl sm:text-5xl tracking-tighter text-white -ml-0.5 relative">
                j
                {/* Cyan Glowing Slash Accent on j */}
                <span className="absolute top-0 right-0 w-3 h-2 bg-[#00f2ff] rounded-xs filter blur-[0.5px] shadow-[0_0_8px_#00f2ff]" />
              </span>
            </div>

            {/* ESPORTS Sub-Brand Text */}
            <div className="mt-1 text-center">
              <span className="font-black tracking-[0.32em] text-[10px] sm:text-[11px] text-white uppercase block">
                ESPORTS
              </span>
              
              {/* Cyan Glow Divider Line */}
              <div className="w-14 h-[1.5px] mx-auto mt-1.5 bg-gradient-to-r from-transparent via-[#00f2ff] to-transparent shadow-[0_0_8px_#00f2ff]" />
            </div>
          </div>
        </div>

        {/* 3. MJ ESPORTS TITLE BRANDING */}
        <div className="mt-7 text-center">
          <h1 className="text-xl sm:text-2xl font-black tracking-[0.4em] uppercase text-white flex items-center justify-center gap-2.5">
            <span className="text-[#00f2ff] filter drop-shadow-[0_0_12px_rgba(0,242,255,0.6)]">
              MJ
            </span>
            <span className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              ESPORTS
            </span>
          </h1>

          {/* ‹ SYSTEM INITIALIZING › STATUS */}
          <div className="mt-2.5 flex items-center justify-center gap-2.5">
            <span className="w-6 sm:w-10 h-[1px] bg-gradient-to-r from-transparent to-[#00f2ff]/60" />
            <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.28em] text-[#00f2ff] font-mono uppercase">
              &lt; SYSTEM INITIALIZING &gt;
            </span>
            <span className="w-6 sm:w-10 h-[1px] bg-gradient-to-l from-transparent to-[#00f2ff]/60" />
          </div>
        </div>

        {/* 4. PROGRESS BAR & PERCENTAGE ROW */}
        <div className="w-64 sm:w-80 md:w-96 flex items-center gap-3.5 mt-6 px-2">
          {/* Progress Bar Track */}
          <div className="flex-1 h-3 rounded-full bg-[#080f19] border border-[#1b2b40] p-[2px] overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)]">
            {/* Animated Striped Progress Bar Fill */}
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0096c7] via-[#00f2ff] to-[#38bdf8] transition-all duration-150 ease-out shadow-[0_0_12px_#00f2ff]"
              style={{
                width: `${Math.max(8, Math.min(100, progress))}%`,
                backgroundImage:
                  'repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.3) 0px, rgba(255, 255, 255, 0.3) 4px, transparent 4px, transparent 8px)',
              }}
            />
          </div>

          {/* Dynamic Progress Percentage Text */}
          <span className="text-xs sm:text-sm font-bold font-mono text-[#00f2ff] tracking-wider shrink-0 min-w-[36px] text-right filter drop-shadow-[0_0_6px_rgba(0,242,255,0.4)]">
            {Math.round(progress)}%
          </span>
        </div>

        {/* 5. SUB-STATUS & ANIMATED LOADING DOTS */}
        <div className="mt-4 text-center">
          <p className="text-[10px] sm:text-[11px] font-bold text-[#64748b] tracking-[0.28em] font-mono uppercase">
            LOADING GAME SERVICES...
          </p>

          {/* Three Sequentially Pulsing Cyan Dots */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff] animate-pulse shadow-[0_0_6px_#00f2ff]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff] animate-pulse [animation-delay:200ms] shadow-[0_0_6px_#00f2ff]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f2ff] animate-pulse [animation-delay:400ms] shadow-[0_0_6px_#00f2ff]" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Loader
