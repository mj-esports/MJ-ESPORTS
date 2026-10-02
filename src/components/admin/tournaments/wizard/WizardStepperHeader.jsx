import React from 'react'
import { Trophy, CheckCircle2, CircleDot, Clock, Award, X, Sparkles } from 'lucide-react'

export default function WizardStepperHeader({
  currentStep = 0,
  onStepClick,
  onClose,
  lastSavedText = 'Draft saved',
  isSaving = false,
  isEditing = false,
}) {
  const steps = [
    {
      num: '01',
      title: 'GENERAL',
      shortTitle: 'GENERAL',
      sub: 'Identity & Mode Format',
      icon: Trophy,
    },
    {
      num: '02',
      title: 'MATCH & SCHEDULE',
      shortTitle: 'MATCH',
      sub: 'Timings & Room Details',
      icon: Clock,
    },
    {
      num: '03',
      title: 'REGISTRATION & PRIZES',
      shortTitle: 'PRIZES',
      sub: 'Entry Fee & Payout Pool',
      icon: Award,
    },
  ]

  const progressPercentage = Math.round(((currentStep + 1) / 3) * 100)

  return (
    <div className="w-full bg-[#131315] border-b border-[#27272a] shrink-0 select-none">
      {/* 1. TOP HEADER BAR */}
      <div className="px-4 sm:px-6 md:px-8 py-3.5 sm:py-4 flex items-center justify-between border-b border-[#27272a]/70">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#201f21] border border-[#27272a] flex items-center justify-center text-[#00f2ff] shrink-0 shadow-inner">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-headline text-sm sm:text-base md:text-lg font-bold tracking-wider text-white uppercase truncate">
                {isEditing ? 'EDIT TOURNAMENT' : 'CREATE TOURNAMENT'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest bg-[#201f21] border border-[#27272a] text-[#00f2ff] uppercase">
                OPS V2.1
              </span>
            </div>
            <p className="hidden sm:block text-xs text-[#849495] font-body truncate">
              Configure your tournament, match schedule, registration and prizes.
            </p>
          </div>
        </div>

        {/* Right Status & Close Actions */}
        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[#1b1b1d] border border-[#27272a] text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isSaving ? 'bg-[#00f2ff] animate-ping' : 'bg-[#10b981] animate-pulse'
              }`}
            />
            <span className="text-[#849495] hidden xs:inline">{isSaving ? 'Saving...' : lastSavedText}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close wizard"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#201f21] hover:bg-[#2a2a2c] text-[#849495] hover:text-white border border-[#27272a] flex items-center justify-center transition-colors cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        </div>
      </div>

      {/* 2. STEPPER RIBBON */}
      <div className="px-4 sm:px-6 md:px-8 py-2.5 sm:py-3.5 bg-[#0e0e10]">
        {/* Desktop / Tablet Grid Stepper */}
        <div className="hidden md:grid grid-cols-3 gap-3">
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStep
            const isActive = idx === currentStep
            const isClickable = onStepClick && (isCompleted || isActive)

            return (
              <div
                key={step.num}
                onClick={() => {
                  if (isClickable) onStepClick(idx)
                }}
                className={`relative flex items-center gap-3 p-3 rounded-lg border transition-all select-none ${
                  isActive
                    ? 'bg-[#201f21] border-[#00f2ff] shadow-lg shadow-[#00f2ff]/5'
                    : isCompleted
                    ? 'bg-[#141416] border-[#27272a] hover:border-[#3a494b] cursor-pointer'
                    : 'bg-[#131315] border-[#27272a]/60 opacity-60'
                }`}
              >
                {isActive && (
                  <div className="absolute inset-y-0 left-0 w-1 bg-[#00f2ff] rounded-l" />
                )}

                <div
                  className={`w-7 h-7 rounded flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                    isActive
                      ? 'bg-[#00f2ff] text-[#00363a]'
                      : isCompleted
                      ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40'
                      : 'bg-[#2a2a2c] text-[#849495] border border-[#27272a]'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4 text-[#10b981]" /> : step.num}
                </div>

                <div className="flex flex-col min-w-0">
                  <span
                    className={`font-headline text-xs font-bold uppercase tracking-wider truncate ${
                      isActive ? 'text-white' : isCompleted ? 'text-[#e5e1e4]' : 'text-[#849495]'
                    }`}
                  >
                    {step.title}
                  </span>
                  <span className="text-[11px] text-[#849495] truncate font-body">
                    {step.sub}
                  </span>
                </div>

                <div className="ml-auto shrink-0">
                  {isCompleted ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30">
                      COMPLETED
                    </span>
                  ) : isActive ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/30">
                      STEP {idx + 1}/3
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-[#849495]">PENDING</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Mobile Compact Stepper */}
        <div className="md:hidden space-y-2">
          <div className="grid grid-cols-3 gap-1.5">
            {steps.map((step, idx) => {
              const isCompleted = idx < currentStep
              const isActive = idx === currentStep

              return (
                <div
                  key={`mobile-${step.num}`}
                  onClick={() => {
                    if (onStepClick && (isCompleted || isActive)) onStepClick(idx)
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg border text-[10px] font-headline font-bold uppercase tracking-wider transition-colors ${
                    isActive
                      ? 'bg-[#201f21] border-[#00f2ff] text-[#00f2ff]'
                      : isCompleted
                      ? 'bg-[#141416] border-[#10b981]/40 text-[#10b981]'
                      : 'bg-[#131315] border-[#27272a] text-[#849495] opacity-60'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                  ) : (
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                      isActive ? 'bg-[#00f2ff] text-[#00363a]' : 'bg-[#27272a] text-[#849495]'
                    }`}>
                      {idx + 1}
                    </span>
                  )}
                  <span className="truncate">{step.shortTitle || step.title.split(' ')[0]}</span>
                </div>
              )
            })}
          </div>

          {/* Thin Progress Line */}
          <div className="w-full bg-[#27272a] h-1 rounded-full overflow-hidden">
            <div
              className="bg-[#00f2ff] h-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
