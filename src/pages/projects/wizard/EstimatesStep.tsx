interface EstimatesStepProps {
  estimateTotalHours: string
  onEstimateChange: (value: string) => void
}

export function EstimatesStep({
  estimateTotalHours,
  onEstimateChange,
}: EstimatesStepProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Project Estimates</h2>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Estimated Total Hours <span className="text-slate-500 font-normal">(optional)</span>
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={estimateTotalHours}
              onChange={(event) => onEstimateChange(event.target.value)}
              placeholder="40"
              step="1"
              min="0"
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-colors"
            />
            <span className="text-sm font-medium text-slate-600">hours</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Total estimated effort for the entire project</p>
        </label>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900 font-medium mb-2">📊 Quick Reference</p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• 1-2 weeks: ~40-80 hours</li>
            <li>• 1 month: ~160-200 hours</li>
            <li>• 3 months: ~480-600 hours</li>
            <li>• 6 months: ~960-1200 hours</li>
          </ul>
        </div>

        <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-sm text-amber-900">
            ℹ️ This is optional and gives a high-level view of project scope. You can break it down into detailed estimates later in the Estimates module.
          </p>
        </div>
      </div>
    </div>
  )
}
