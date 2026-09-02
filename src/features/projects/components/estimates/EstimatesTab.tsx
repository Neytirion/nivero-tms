import { useState } from 'react'
import { ConfirmDialog } from '../../../../shared/components'
import { useEstimatesTabController } from './useEstimatesTabController'

interface EstimatesTabProps {
  projectId: string
  canEdit: boolean
  onEstimatesChanged?: () => Promise<void>
}

export function EstimatesTab({ projectId, canEdit, onEstimatesChanged }: EstimatesTabProps) {
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false)
  const [editingEstimateId, setEditingEstimateId] = useState<string | null>(null)

  const {
    isLoading,
    estimates,
    activeEstimateId,
    setActiveEstimateId,
    packages,
    setPackages,
    showArchived,
    setShowArchived,
    displayedPackages,
    canEditActiveEstimate,
    canCreateNewVersion,
    totalHours,
    pricePerHour,
    setPricePerHour,
    addWorkPackageRow,
    removeWorkPackageRow,
    createVersionHandler,
    saveDraftHandler,
    approveHandler,
    startStandardEstimatesHandler,
    packageValidationErrors,
  } = useEstimatesTabController({ 
    projectId, 
    canEdit,
    onEstimatesChanged,
    onEstimateCreated: (estimateId) => {
      // Automatically open edit mode when a new estimate is created
      setEditingEstimateId(estimateId)
    }
  })

  const hasPackageValidationErrors = packageValidationErrors.length > 0
  const isEditingPackages = Boolean(activeEstimateId && editingEstimateId === activeEstimateId)
  const canModifyPackages = canEditActiveEstimate && Boolean(activeEstimateId) && isEditingPackages
  
  const hasApprovedVersions = (estimates ?? []).some((est) => est.status === 'approved')
  const isFirstVersion = canEditActiveEstimate && !hasApprovedVersions

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">Estimates Module</h4>
      </div>

      <>
        {estimates === null ? (
          <div className="mt-3 text-sm text-slate-500">Loading estimates...</div>
        ) : estimates.length === 0 ? (
          // Show Start Estimates button when no versions exist
          canEdit ? (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-sm text-slate-600">No estimate versions yet. Create one with standard work packages to begin planning.</p>
              <button
                type="button"
                onClick={() => void startStandardEstimatesHandler()}
                disabled={isLoading}
                className="w-fit rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                title="Create an estimate with standard work packages: UX/UI, Backend/Integrations, Frontend, Test and QA, Iterations, Project management"
              >
                + Start Estimates
              </button>
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-600">Estimates will be available once created by a project manager.</p>
            </div>
          )
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {canEdit ? (
                <>
                  <button
                    type="button"
                    onClick={() => void createVersionHandler()}
                    disabled={isLoading || !canCreateNewVersion}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 relative group"
                    title={
                      canCreateNewVersion
                        ? 'Create a new estimate version for planning changes'
                        : 'Finalize & Approve the current estimate version before creating a new one'
                    }
                  >
                    New Estimate Version
                  </button>
                </>
              ) : null}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {estimates.map((estimate) => (
                <button
                  key={estimate.id}
                  type="button"
                  onClick={() => {
                    setEditingEstimateId(null)
                    setActiveEstimateId(estimate.id)
                    setPackages(
                      estimate.work_packages
                        .filter((item) => item.is_active)
                        .sort((a, b) => a.sort_order - b.sort_order)
                        .map((item) => ({
                          name: item.name,
                          estimatedHours: String(item.estimated_hours ?? 0),
                          color: item.color ?? '#94a3b8',
                        })),
                    )
                  }}
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    activeEstimateId === estimate.id
                      ? 'border-cyan-300 bg-cyan-100 text-cyan-900'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  v{estimate.version_number} {estimate.status === 'approved' ? '(Approved)' : '(Draft)'}
                </button>
              ))}
            </div>

            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full border-collapse text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Work Package</th>
                    <th className="px-3 py-2">Hours</th>
                    {canEdit ? <th className="px-3 py-2 text-right">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {packages.length === 0 ? (
                    <tr className="border-t border-slate-200">
                      <td colSpan={canEdit ? 3 : 2} className="px-3 py-3 text-xs text-slate-500">
                        No work packages yet. Add rows for this specific project estimate.
                      </td>
                    </tr>
                  ) : null}
                  {displayedPackages.map((item, index) => (
                    <tr key={index} className="border-t border-slate-200">
                      <td className="px-3 py-2">
                        {item.name.includes('(archived)') || !canModifyPackages ? (
                          <span className="block py-1 text-sm text-slate-900">{item.name}</span>
                        ) : (
                          <input
                            type="text"
                            value={item.name}
                            onChange={(event) =>
                              setPackages((prev) =>
                                prev.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? {
                                        ...entry,
                                        name: event.target.value,
                                      }
                                    : entry,
                                ),
                              )
                            }
                            placeholder="Frontend"
                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 outline-none focus:border-slate-500"
                          />
                        )}
                        {canModifyPackages && packageValidationErrors.some((e) => e.index === index && e.field === 'name') && (
                          <p className="mt-1 text-[11px] text-rose-600">
                            {packageValidationErrors.find((e) => e.index === index && e.field === 'name')?.message}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {item.name.includes('(archived)') || !canModifyPackages ? (
                          <span className="block py-1 text-sm text-slate-900">{item.estimatedHours}</span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={item.estimatedHours}
                            onChange={(event) =>
                              setPackages((prev) =>
                                prev.map((entry, entryIndex) =>
                                  entryIndex === index
                                    ? {
                                        ...entry,
                                        estimatedHours: event.target.value,
                                      }
                                    : entry,
                                ),
                              )
                            }
                            className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 outline-none focus:border-slate-500"
                          />
                        )}
                        {canModifyPackages && packageValidationErrors.some((e) => e.index === index && e.field === 'estimatedHours') && (
                          <p className="mt-1 text-[11px] text-rose-600">
                            {packageValidationErrors.find((e) => e.index === index && e.field === 'estimatedHours')?.message}
                          </p>
                        )}
                      </td>
                      {canEdit && isEditingPackages && !item.name.includes('(archived)') ? (
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeWorkPackageRow(index)}
                            disabled={!canModifyPackages}
                            className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              isFirstVersion
                                ? 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
                                : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                            }`}
                          >
                            {isFirstVersion ? 'Remove' : 'Archive'}
                          </button>
                        </td>
                      ) : canEdit && item.name.includes('(archived)') ? (
                        <td className="px-3 py-2 text-right">
                          <span className="text-[11px] text-slate-400">archived</span>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-sm text-slate-700">Total: {totalHours.toFixed(1)}h</p>

            {canEdit && isEditingPackages ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Price per Hour (kr)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricePerHour}
                  onChange={(e) => setPricePerHour(e.target.value)}
                  placeholder="Enter hourly rate (e.g., 50)"
                  className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
              </div>
            ) : totalHours > 0 && pricePerHour ? (
              <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3">
                <p className="text-sm text-slate-700">
                  Budget (at {pricePerHour}kr/h): <span className="font-semibold text-cyan-900">{(totalHours * Number(pricePerHour)).toFixed(0)}kr</span>
                </p>
              </div>
            ) : null}

            {canEdit ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowArchived(!showArchived)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                    showArchived
                      ? 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {showArchived ? 'Hide archived' : 'Show archived'}
                </button>
                {isEditingPackages ? (
                  <button
                    type="button"
                    onClick={addWorkPackageRow}
                    disabled={isLoading || !canModifyPackages}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    title="Add another work package to this estimate"
                  >
                    + Add Work Package
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setEditingEstimateId(activeEstimateId)}
                  disabled={isLoading || !canEditActiveEstimate || !activeEstimateId || isEditingPackages}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Enable editing for work packages in this draft"
                >
                  Edit
                </button>
                {isEditingPackages ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const wasSaved = await saveDraftHandler()
                      if (wasSaved) {
                        setEditingEstimateId(null)
                      }
                    }}
                    disabled={isLoading || !activeEstimateId || !canEditActiveEstimate}
                    className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
                    title="Save your work package changes to this draft version"
                  >
                    Save Changes
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsApproveConfirmOpen(true)}
                  disabled={isLoading || !activeEstimateId || !canEditActiveEstimate || hasPackageValidationErrors}
                  className="ml-auto rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  title={
                    hasPackageValidationErrors
                      ? 'Fix validation errors before finalizing and approving'
                      : 'Approve this estimate version as the team baseline. Cannot be edited after approval.'
                  }
                >
                  Finalize & Approve
                </button>
              </div>
            ) : null}
          </>
        )}
      </>

      <ConfirmDialog
        isOpen={isApproveConfirmOpen}
        title="Finalize and approve estimate"
        description="Approve this draft estimate as the project baseline? After approval, this version becomes read-only."
        confirmText="Finalize & Approve"
        tone="success"
        onCancel={() => setIsApproveConfirmOpen(false)}
        onConfirm={async () => {
          setIsApproveConfirmOpen(false)
          await approveHandler()
        }}
      />
    </div>
  )
}
