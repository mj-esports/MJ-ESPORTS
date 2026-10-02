import React from 'react'
import { ArrowLeft, ArrowRight, Bookmark, Rocket, Check, Loader2, X } from 'lucide-react'

export default function WizardFooterActions({
  currentStep = 0,
  onBack,
  onNext,
  onSaveDraft,
  onCancel,
  onSubmit,
  isSubmitting = false,
  isEditing = false,
}) {
  const stepTitles = ['GENERAL', 'MATCH & SCHEDULE', 'REGISTRATION & PRIZES']
  const nextTitles = ['Match & Schedule', 'Registration & Prizes', 'Publish']

  return (
    <footer className="w-full bg-[#131315]/95 backdrop-blur-md border-t border-[#27272a] px-4 sm:px-6 md:px-8 py-3.5 sm:py-4 shrink-0 select-none z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        {/* Left Secondary Controls: Cancel & Save Draft */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs font-headline font-semibold text-[#849495] hover:text-white bg-[#1b1b1d] hover:bg-[#201f21] border border-[#27272a] transition-colors cursor-pointer min-h-[40px] sm:min-h-[44px] flex items-center justify-center active:scale-95"
          >
            Cancel
          </button>

          {onSaveDraft && (
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={isSubmitting}
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs font-headline font-semibold text-[#e5e1e4] bg-[#201f21] hover:bg-[#2a2a2c] border border-[#27272a] hover:border-[#3a494b] transition-colors cursor-pointer min-h-[40px] sm:min-h-[44px] flex items-center gap-1.5 active:scale-95"
            >
              <Bookmark className="w-3.5 h-3.5 text-[#00f2ff] shrink-0" />
              <span className="hidden sm:inline">Save Draft</span>
              <span className="sm:hidden">Draft</span>
            </button>
          )}
        </div>

        {/* Center Indicator (Hidden on small mobile) */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-[#849495] uppercase">
          <span>STEP {currentStep + 1} OF 3</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#27272a]" />
          <span className="text-[#00f2ff] font-bold">
            {currentStep < 2 ? `NEXT: ${nextTitles[currentStep]}` : 'FINAL STEP'}
          </span>
        </div>

        {/* Right Navigation & Final Actions */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs font-headline font-semibold text-[#e5e1e4] bg-[#201f21] hover:bg-[#2a2a2c] border border-[#27272a] hover:border-[#3a494b] transition-colors cursor-pointer min-h-[40px] sm:min-h-[44px] flex items-center gap-1.5 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-[#849495] shrink-0" />
              <span>Back</span>
            </button>
          )}

          {currentStep < 2 ? (
            <button
              type="button"
              onClick={onNext}
              disabled={isSubmitting}
              className="px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-headline font-bold text-[#00363a] bg-[#00f2ff] hover:bg-[#74f5ff] active:scale-95 transition-all shadow-[0_0_15px_rgba(0,242,255,0.25)] cursor-pointer min-h-[40px] sm:min-h-[44px] flex items-center gap-1.5 sm:gap-2 uppercase tracking-wider"
            >
              <span className="hidden sm:inline">Next: {nextTitles[currentStep]}</span>
              <span className="sm:hidden">{currentStep === 0 ? 'Next: Match' : 'Next: Prizes'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5] shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="px-4 sm:px-7 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-headline font-extrabold text-[#00363a] bg-[#00f2ff] hover:bg-[#74f5ff] active:scale-95 transition-all shadow-[0_0_20px_rgba(0,242,255,0.35)] cursor-pointer min-h-[40px] sm:min-h-[44px] flex items-center gap-1.5 sm:gap-2 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">{isEditing ? 'UPDATE & PUBLISH' : 'PUBLISH TOURNAMENT'}</span>
                  <span className="sm:hidden">{isEditing ? 'UPDATE' : 'PUBLISH'}</span>
                  <Rocket className="w-4 h-4 stroke-[2.5] shrink-0" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </footer>
  )
}
