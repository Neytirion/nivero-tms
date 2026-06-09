import { useEstimatesTabController } from './useEstimatesTabController'

interface EstimatesTabProps {
  projectId: string
  canEdit: boolean
}

export function EstimatesTab({ projectId, canEdit }: EstimatesTabProps) {
  const {
    isLoading,
    status,
    estimates,
    activeEstimate,
    activeEstimateId,
    setActiveEstimateId,
    packages,
    setPackages,
    showArchived,
    setShowArchived,
    displayedPackages,
    canEditActiveEstimate,
    totalHours,
    addWorkPackageRow,
    removeWorkPackageRow,
    createVersionHandler,
    saveDraftHandler,
    approveHandler,
  } = useEstimatesTabController({ projectId, canEdit })

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">Estimates Module</h4>
        {canEdit ? (
          <button
            type="button"
            onClick={() => void createVersionHandler()}
            disabled={isLoading || !canEdit}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Create Version
          </button>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {status ||
          (activeEstimate?.status === 'approved'
            ? 'Approved estimates are locked. Create a new version to make changes.'
            : 'Use versions to keep estimate history before approval.')}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {estimates.length === 0 ? (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            No versions
          </span>
        ) : (
          estimates.map((estimate) => (
            <button
              key={estimate.id}
              type="button"
              onClick={() => {
                setActiveEstimateId(estimate.id)
                setPackages(
                  estimate.work_packages
                    .filter((item) => item.is_active)
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((item) => ({
                      name: item.name,
                      estimatedHours: String(item.estimated_hours ?? 0),
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
          ))
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-slate-500">Active packages | Archived ones are hidden from task creation but keep historical task links.</p>
        <button
          type="button"
          onClick={() => setShowArchived(!showArchived)}
          className={`rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide ${
            showArchived
              ? 'border border-slate-300 bg-slate-100 text-slate-700'
              : 'border border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          {showArchived ? 'Hide archived' : 'Show archived'}
        </button>
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
                  <input
                    type="text"
                    value={item.name}
                    disabled={item.name.includes('(archived)') || !canEditActiveEstimate || !activeEstimateId}
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
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={item.estimatedHours}
                    disabled={item.name.includes('(archived)') || !canEditActiveEstimate || !activeEstimateId}
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
                    className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </td>
                {canEdit && !item.name.includes('(archived)') ? (
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeWorkPackageRow(index)}
                      disabled={!canEditActiveEstimate || !activeEstimateId}
                      className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Archive
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

      {canEdit ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addWorkPackageRow}
            disabled={isLoading || !activeEstimateId || !canEditActiveEstimate}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            + Add Work Package
          </button>
          <button
            type="button"
            onClick={() => void saveDraftHandler()}
            disabled={isLoading || !activeEstimateId || !canEditActiveEstimate}
            className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => void approveHandler()}
            disabled={isLoading || !activeEstimateId || !canEditActiveEstimate}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Approve Estimate
          </button>
        </div>
      ) : null}
    </div>
  )
}
