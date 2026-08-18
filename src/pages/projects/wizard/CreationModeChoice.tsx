interface CreationModeChoiceProps {
  onSelectMode: (mode: 'manual' | 'ai') => void
}

export function CreationModeChoice({ onSelectMode }: CreationModeChoiceProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Choose Creation Method</h2>
        <p className="mt-2 text-slate-600">How would you like to create your project?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Manual option */}
        <button
          onClick={() => onSelectMode('manual')}
          className="p-6 rounded-xl border-2 border-slate-200 hover:border-blue-600 hover:bg-blue-50 transition-all text-left"
        >
          <div className="text-3xl mb-3">📋</div>
          <h3 className="font-semibold text-slate-900 mb-2">Manual Entry</h3>
          <p className="text-sm text-slate-600">
            Fill in project details step by step with full control over every field.
          </p>
        </button>

        {/* AI option */}
        <button
          onClick={() => onSelectMode('ai')}
          className="p-6 rounded-xl border-2 border-slate-200 hover:border-purple-600 hover:bg-purple-50 transition-all text-left"
        >
          <div className="text-3xl mb-3">✨</div>
          <h3 className="font-semibold text-slate-900 mb-2">AI Generator (Beta)</h3>
          <p className="text-sm text-slate-600">
            Describe your project and let AI generate structure, timeline, and estimates.
          </p>
        </button>
      </div>
    </div>
  )
}
