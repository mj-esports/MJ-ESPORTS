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
    <div className="w-full bg-[#111215] border-b border-[#27272A] shrink-0 select-none">
      {/* 1. TOP HEADER BAR */}
      <div className="px-4 sm:px-6 md:px-8 py-3.5 sm:py-4 flex items-center justify-between border-b border-[#27272A]/70">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-none bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#FFB900] shrink-0 shadow-inner">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-headline text-sm sm:text-base md:text-lg font-bold tracking-wider text-white uppercase truncate">
                {isEditing ? 'EDIT TOURNAMENT' : 'CREATE TOURNAMENT'}
              </span>
              <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold tracking-widest bg-[#18181B] border border-[#27272A] text-[#FFB900] uppercase">
                OPS V2.1
              </span>
            </div>
            <p className="hidden sm:block text-xs text-[#A1A1AA] font-body truncate">
              Configure your tournament, match schedule, registration and prizes.
            </p>
          </div>
        </div>

        {/* Right Status & Close Actions */}
        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-none bg-[#18181B] border border-[#27272A] text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-none ${
                isSaving ? 'bg-[#FFB900] animate-ping' : 'bg-[#10b981] animate-pulse'
              }`}
            />
            <span className="text-[#A1A1AA] hidden xs:inline">{isSaving ? 'Saving...' : lastSavedText}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close wizard"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-none bg-[#18181B] hover:bg-[#27272A] text-[#A1A1AA] hover:text-white border border-[#27272A] flex items-center justify-center transition-colors cursor-pointer active:scale-95"
          >
            <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </button>
        </div>
      </div>

      {/* 2. STEPPER RIBBON */}
      <div className="px-4 sm:px-6 md:px-8 py-2.5 sm:py-3.5 bg-[#000000]">
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
                className={`relative flex items-center gap-3 p-3 rounded-none border transition-all select-none ${
                  isActive
                    ? 'bg-[#18181B] border-[#FFB900] shadow-lg /5'
                    : isCompleted
                    ? 'bg-[#111215] border-[#27272A] hover:border-[#27272A] cursor-pointer'
                    : 'bg-[#111215] border-[#27272A]/60 opacity-60'
                }`}
              >
                {isActive && (
                  <div className="absolute inset-y-0 left-0 w-1 bg-[#FFB900] rounded-none" />
                )}

                <div
                  className={`w-7 h-7 rounded-none flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                    isActive
                      ? 'bg-[#FFB900] text-[#000000]'
                      : isCompleted
                      ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/40'
                      : 'bg-[#27272A] text-[#A1A1AA] border border-[#27272A]'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4 text-[#10b981]" /> : step.num}
                </div>

                <div className="flex flex-col min-w-0">
                  <span
                    className={`font-headline text-xs font-bold uppercase tracking-wider truncate ${
                      isActive ? 'text-white' : isCompleted ? 'text-[#FFFFFF]' : 'text-[#A1A1AA]'
                    }`}
                  >
                    {step.title}
                  </span>
                  <span className="text-[11px] text-[#A1A1AA] truncate font-body">
                    {step.sub}
                  </span>
                </div>

                <div className="ml-auto shrink-0">
                  {isCompleted ? (
                    <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30">
                      COMPLETED
                    </span>
                  ) : isActive ? (
                    <span className="px-2 py-0.5 rounded-none text-[10px] font-mono font-bold bg-[#FFB900]/10 text-[#FFB900] border border-[#FFB900]/30">
                      STEP {idx + 1}/3
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-[#A1A1AA]">PENDING</span>
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
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-none border text-[10px] font-headline font-bold uppercase tracking-wider transition-colors ${
                    isActive
                      ? 'bg-[#18181B] border-[#FFB900] text-[#FFB900]'
                      : isCompleted
                      ? 'bg-[#111215] border-[#10b981]/40 text-[#10b981]'
                      : 'bg-[#111215] border-[#27272A] text-[#A1A1AA] opacity-60'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                  ) : (
                    <span className={`w-4 h-4 rounded-none flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                      isActive ? 'bg-[#FFB900] text-[#000000]' : 'bg-[#27272A] text-[#A1A1AA]'
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
          <div className="w-full bg-[#27272A] h-1 rounded-none overflow-hidden">
            <div
              className="bg-[#FFB900] h-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
