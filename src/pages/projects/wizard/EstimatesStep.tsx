import type { WorkPackageRow } from './types'

interface EstimatesStepProps {
  useEstimates: boolean
  workPackages: WorkPackageRow[]
  onUseEstimatesChange: (value: boolean) => void
  onWorkPackagesChange: (packages: WorkPackageRow[]) => void
}

export function EstimatesStep({
  useEstimates,
  workPackages,
  onUseEstimatesChange,
  onWorkPackagesChange,
}: EstimatesStepProps) {
  const handleAddPackage = () => {
    onWorkPackagesChange([...workPackages, { name: '', estimatedHours: '0' }])
  }

  const handleRemovePackage = (index: number) => {
    onWorkPackagesChange(workPackages.filter((_, i) => i !== index))
  }

  const handleUpdatePackage = (
    index: number,
    field: 'name' | 'estimatedHours',
    value: string,
  ) => {
    const updated = [...workPackages]
    updated[index] = { ...updated[index], [field]: value }
    onWorkPackagesChange(updated)
  }

  const totalHours = workPackages.reduce((sum, pkg) => {
    const hours = Number.parseFloat(pkg.estimatedHours) || 0
    return sum + hours
  }, 0)

  const hasEmptyPackages = workPackages.some((pkg) => pkg.name.trim() === '')
  const hasDuplicatePackages = (() => {
    const seenNames = new Set<string>()

    for (const pkg of workPackages) {
      const normalizedName = pkg.name.trim().toLowerCase()
      if (!normalizedName) {
        continue
      }

      if (seenNames.has(normalizedName)) {
        return true
      }

      seenNames.add(normalizedName)
    }

    return false
  })()

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Project Estimates</h2>

      <div className="space-y-4">
        {/* Enable Estimates Checkbox */}
        <label className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={useEstimates}
            onChange={(event) => onUseEstimatesChange(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 cursor-pointer"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">Enable Estimate Versioning</p>
            <p className="text-xs text-slate-600 mt-1">
              Create and manage project estimates with work packages.
            </p>
          </div>
        </label>

        {/* Work Packages Table */}
        {useEstimates && (
          <>
            <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Work Package</th>
                    <th className="px-3 py-2">Estimated Hours</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workPackages.length === 0 ? (
                    <tr className="border-t border-slate-200">
                      <td colSpan={3} className="px-3 py-3 text-xs text-slate-500 text-center">
                        No work packages yet. Click "Add Work Package" to get started.
                      </td>
                    </tr>
                  ) : null}
                  {workPackages.map((pkg, index) => (
                    <tr key={index} className="border-t border-slate-200">
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={pkg.name}
                          onChange={(e) => handleUpdatePackage(index, 'name', e.target.value)}
                          placeholder="e.g., Frontend Development, Backend API"
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 outline-none focus:border-slate-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={pkg.estimatedHours}
                          onChange={(e) => handleUpdatePackage(index, 'estimatedHours', e.target.value)}
                          className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 outline-none focus:border-slate-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemovePackage(index)}
                          className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Hours */}
            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
              <p className="text-sm font-medium text-slate-900">Total Estimated Hours:</p>
              <p className="text-lg font-bold text-slate-900">{totalHours.toFixed(1)}h</p>
            </div>

            {/* Add Package Button */}
            <button
              type="button"
              onClick={handleAddPackage}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              + Add Work Package
            </button>

            {/* Empty field warning */}
            {hasEmptyPackages && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-xs text-amber-900">
                  ⚠️ Please fill in the Work Package names before proceeding.
                </p>
              </div>
            )}

            {hasDuplicatePackages && (
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                <p className="text-xs text-rose-900">
                  ⚠️ Work Package names must be unique.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
