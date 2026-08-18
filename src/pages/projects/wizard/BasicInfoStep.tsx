import { useMemo } from 'react'

interface BasicInfoStepProps {
  projectName: string
  companyName: string
  customerSuggestions: string[]
  onProjectNameChange: (value: string) => void
  onCompanyNameChange: (value: string) => void
}

export function BasicInfoStep({
  projectName,
  companyName,
  customerSuggestions,
  onProjectNameChange,
  onCompanyNameChange,
}: BasicInfoStepProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Project Name & Company</h2>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Project Name <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            value={projectName}
            onChange={(event) => onProjectNameChange(event.target.value)}
            placeholder="e.g., Website Redesign, Mobile App, Dashboard Development"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-colors"
          />
          <p className="mt-1 text-xs text-slate-500">Give your project a clear, descriptive name</p>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Company Name
          </span>
          <input
            type="text"
            list="company-suggestions"
            value={companyName}
            onChange={(event) => onCompanyNameChange(event.target.value)}
            placeholder="e.g., ABC Ltd, Acme Corp"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-colors"
          />
          <datalist id="company-suggestions">
            {customerSuggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-slate-500">Optional - The client or company this project is for</p>
        </label>
      </div>
    </div>
  )
}
