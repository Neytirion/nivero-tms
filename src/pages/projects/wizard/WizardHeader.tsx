interface WizardHeaderProps {
  currentStep: number
  totalSteps: number
  stepNames: string[]
}

export function WizardHeader({ currentStep, totalSteps, stepNames }: WizardHeaderProps) {
  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Create Project</h1>
          <p className="mt-2 text-slate-600">Step {currentStep} of {totalSteps}</p>
        </div>
        <div className="text-right text-sm text-slate-600">
          {Math.round((currentStep / totalSteps) * 100)}% Complete
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="mt-6 flex gap-2">
        {stepNames.map((name, index) => (
          <div key={index} className="flex-1">
            <div
              className={`p-3 rounded-lg text-center text-sm font-medium transition-colors ${
                index < currentStep
                  ? 'bg-blue-100 text-blue-700'
                  : index === currentStep - 1
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {index + 1}. {name}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
