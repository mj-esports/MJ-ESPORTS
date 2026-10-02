import React from 'react'
import WizardStepperHeader from './WizardStepperHeader'
import WizardFooterActions from './WizardFooterActions'
import Step1GeneralInfo from './steps/Step1GeneralInfo'
import Step2MatchSchedule from './steps/Step2MatchSchedule'
import Step3RegistrationPrize from './steps/Step3RegistrationPrize'

export default function CreateTournamentWizardModal({
  isOpen = false,
  onClose,
  form = {},
  onFormChange,
  formErrors = {},
  currentStep = 0,
  setCurrentStep,
  onNext,
  onBack,
  onSaveDraft,
  onSubmit,
  isSaving = false,
  editingId = null,
  lastSavedText = 'Draft saved',
}) {
  if (!isOpen) return null

  const handleStepClick = (stepIndex) => {
    if (setCurrentStep) {
      setCurrentStep(stepIndex)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 lg:p-6 bg-black/85 backdrop-blur-md overflow-hidden animate-fadeIn">
      {/* Modal Card / Responsive Full Screen Shell */}
      <div className="w-full max-w-7xl h-full md:h-[94vh] max-h-screen bg-[#131315] border-0 md:border border-[#27272a] rounded-none md:rounded-2xl flex flex-col shadow-2xl overflow-hidden relative">
        {/* Sticky Header */}
        <WizardStepperHeader
          currentStep={currentStep}
          onStepClick={handleStepClick}
          onClose={onClose}
          lastSavedText={lastSavedText}
          isSaving={isSaving}
          isEditing={Boolean(editingId)}
        />

        {/* Scrollable Main Body with Safe Area Clearance for Docked Action Bar */}
        <main className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 md:p-8 pb-36 sm:pb-40 md:pb-44 font-body text-white">
          <div className="max-w-7xl mx-auto">
            {currentStep === 0 && (
              <Step1GeneralInfo
                form={form}
                formErrors={formErrors}
                onChange={onFormChange}
                isEditing={Boolean(editingId)}
              />
            )}

            {currentStep === 1 && (
              <Step2MatchSchedule
                form={form}
                formErrors={formErrors}
                onChange={onFormChange}
              />
            )}

            {currentStep === 2 && (
              <Step3RegistrationPrize
                form={form}
                formErrors={formErrors}
                onChange={onFormChange}
              />
            )}
          </div>
        </main>

        {/* Sticky Docked Footer */}
        <WizardFooterActions
          currentStep={currentStep}
          onBack={onBack}
          onNext={onNext}
          onSaveDraft={onSaveDraft}
          onCancel={onClose}
          onSubmit={onSubmit}
          isSubmitting={isSaving}
          isEditing={Boolean(editingId)}
        />
      </div>
    </div>
  )
}
