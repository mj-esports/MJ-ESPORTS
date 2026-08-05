import React from 'react'
import { ChevronRight, ChevronLeft, Save, X, CheckCircle2 } from 'lucide-react'

export default function StepWizard({
  steps = [],
  currentStep = 0,
  onNext,
  onBack,
  onSaveDraft,
  onCancel,
  nextText = 'Next',
  finishText = 'Create Tournament',
  isSubmitting = false,
}) {
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1
  const progressPercent = Math.round(((currentStep + 1) / steps.length) * 100)

  return (
    <div className="space-y-6 font-mono text-xs">
      
      {/* 1. PROGRESS BAR & STEP INDICATORS */}
      <div className="space-y-3 bg-[#07090c] p-4 rounded-xl border border-[#3a494b]/60">
        <div className="flex justify-between items-center text-xs">
          <span className="text-[#00f2ff] font-bold uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#00f2ff]/20 border border-[#00f2ff] flex items-center justify-center text-[10px]">
              {currentStep + 1}
            </span>
            <span>Step {currentStep + 1} of {steps.length}: {steps[currentStep]?.title || 'Configuration'}</span>
          </span>
          <span className="text-[#8e9dae] font-bold">{progressPercent}% Completed</span>
        </div>

        {/* Bar */}
        <div className="w-full h-2 bg-[#151a21] rounded-full overflow-hidden border border-[#3a494b]/60">
          <div
            className="h-full bg-gradient-to-r from-[#00f2ff] to-[#00ff9d] rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(0,242,255,0.4)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step Chips */}
        <div className="flex justify-between pt-1">
          {steps.map((step, idx) => {
            const isDone = idx < currentStep
            const isCurrent = idx === currentStep

            return (
              <div
                key={`step-chip-${idx}`}
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
                  isDone
                    ? 'text-[#00ff9d]'
                    : isCurrent
                    ? 'text-[#00f2ff]'
                    : 'text-[#8e9dae]/50'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff9d]" />
                ) : (
                  <span className={`w-3.5 h-3.5 rounded-full border text-[9px] flex items-center justify-center ${
                    isCurrent ? 'border-[#00f2ff] text-[#00f2ff]' : 'border-[#3a494b] text-[#8e9dae]/50'
                  }`}>
                    {idx + 1}
                  </span>
                )}
                <span className="hidden sm:inline">{step.shortTitle || step.title}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 2. ACTIVE STEP CONTENT */}
      <div className="py-1">
        {steps[currentStep]?.content}
      </div>

      {/* 3. CONTROL BUTTONS ROW */}
      <div className="pt-4 border-t border-[#3a494b]/60 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-xs font-bold bg-[#07090c] text-red-400 border border-[#3a494b] hover:border-red-500/50 hover:bg-red-500/10 rounded uppercase transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
        >
          <X className="w-3.5 h-3.5" />
          <span>Cancel</span>
        </button>

        <div className="flex items-center gap-2.5 ml-auto">
          {onSaveDraft && (
            <button
              type="button"
              onClick={onSaveDraft}
              className="px-4 py-2.5 text-xs font-bold bg-[#07090c] text-[#8e9dae] border border-[#3a494b] hover:text-white hover:border-[#00f2ff]/40 rounded uppercase transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5 text-[#00f2ff]" />
              <span>Save Draft</span>
            </button>
          )}

          {!isFirstStep && (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 text-xs font-bold bg-[#07090c] text-white border border-[#3a494b] hover:bg-[#151a21] rounded uppercase transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}

          {isLastStep ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-bold rounded uppercase bg-[#00ff9d] hover:bg-emerald-400 text-black shadow-[0_0_15px_rgba(0,255,157,0.3)] font-extrabold cursor-pointer transition-all disabled:opacity-50 min-h-[38px] flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : finishText}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              className="px-6 py-2.5 text-xs font-bold rounded uppercase bg-[#00f2ff] hover:bg-cyan-300 text-black shadow-[0_0_15px_rgba(0,242,255,0.3)] font-extrabold cursor-pointer transition-all min-h-[38px] flex items-center gap-1.5"
            >
              <span>{nextText}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

    </div>
  )
}
