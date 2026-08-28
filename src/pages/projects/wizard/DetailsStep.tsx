interface DetailsStepProps {
  projectDescription: string
  onDescriptionChange: (value: string) => void
}

export function DetailsStep({
  projectDescription,
  onDescriptionChange,
}: DetailsStepProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Project Details</h2>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Description <span className="text-slate-500 font-normal">(optional)</span>
          </span>
          <textarea
            value={projectDescription}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="Describe your project goals, scope, and key deliverables..."
            rows={5}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-colors resize-none"
          />
          <p className="mt-1 text-xs text-slate-500">Add any additional context about the project</p>
        </label>

        <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-sm text-amber-900">
            ℹ️ Description is optional and can be filled in later in the project details.
          </p>
        </div>
      </div>
    </div>
  )
}
