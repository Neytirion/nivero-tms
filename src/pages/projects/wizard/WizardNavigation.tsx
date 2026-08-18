interface WizardNavigationProps {
  currentStep: number
  totalSteps: number
  isLoading: boolean
  canGoNext: boolean
  onPrevious: () => void
  onNext: () => void
  onSubmit?: () => void
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  isLoading,
  canGoNext,
  onPrevious,
  onNext,
  onSubmit,
}: WizardNavigationProps) {
  const isLastStep = currentStep === totalSteps
  const isFirstStep = currentStep === 1

  return (
    <div className="mt-8 flex gap-4 justify-between">
      <button
        type="button"
        onClick={onPrevious}
        disabled={isFirstStep || isLoading}
        className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        ← Previous
      </button>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          disabled={isLoading}
          className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>

        {isLastStep ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canGoNext || isLoading}
            className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Creating...' : 'Create Project'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={!canGoNext || isLoading}
            className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  )
}
