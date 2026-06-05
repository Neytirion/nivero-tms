import { useEffect, useMemo, useState } from 'react'
import {
  approveEstimate,
  createEstimateVersion,
  getProjectEstimates,
  saveEstimateDraft,
  type EstimateWithPackages,
  type WorkPackagePreview,
} from '../../../../lib/pm'
import { useWorkspace } from '../../../dashboard/workspace-context'

interface EstimatesTabProps {
  projectId: string
  canEdit: boolean
}

interface EditableWorkPackage {
  name: string
  estimatedHours: string
}

function toEditablePackages(estimate: EstimateWithPackages | null) {
  if (!estimate || estimate.work_packages.length === 0) {
    return [] as EditableWorkPackage[]
  }

  return estimate.work_packages
    .slice()
    .filter((item: WorkPackagePreview) => item.is_active)
    .sort((a: WorkPackagePreview, b: WorkPackagePreview) => a.sort_order - b.sort_order)
    .map((item: WorkPackagePreview) => ({
      name: item.name,
      estimatedHours: String(item.estimated_hours ?? 0),
    }))
}

export function EstimatesTab({ projectId, canEdit }: EstimatesTabProps) {
  const { loadDashboardPreview } = useWorkspace()
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [estimates, setEstimates] = useState<EstimateWithPackages[]>([])
  const [activeEstimateId, setActiveEstimateId] = useState<string | null>(null)
  const [packages, setPackages] = useState<EditableWorkPackage[]>(toEditablePackages(null))
  const [showArchived, setShowArchived] = useState(false)

  const totalHours = useMemo(
    () =>
      packages.reduce((sum, item) => {
        const next = Number(item.estimatedHours)
        return sum + (Number.isFinite(next) ? Math.max(0, next) : 0)
      }, 0),
    [packages],
  )

  const activeEstimate = estimates.find((item) => item.id === activeEstimateId) ?? null

  const archivedPackages = useMemo(
    () =>
      activeEstimate?.work_packages
        .filter((item: WorkPackagePreview) => !item.is_active)
        .sort((a: WorkPackagePreview, b: WorkPackagePreview) => a.sort_order - b.sort_order)
        .map((item: WorkPackagePreview) => ({
          name: `${item.name} (archived)`,
          estimatedHours: String(item.estimated_hours ?? 0),
        })) ?? [],
    [activeEstimate],
  )

  const displayedPackages = showArchived ? [...packages, ...archivedPackages] : packages
  const canEditActiveEstimate = canEdit && activeEstimate?.status !== 'approved'

  const addWorkPackageRow = () => {
    if (!canEditActiveEstimate || !activeEstimateId) {
      return
    }

    setPackages((prev) => [
      ...prev,
      {
        name: '',
        estimatedHours: '',
      },
    ])
  }

  const removeWorkPackageRow = (index: number) => {
    if (!canEditActiveEstimate || !activeEstimateId) {
      return
    }

    setPackages((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
  }

  const loadEstimates = async (preferredEstimateId?: string | null) => {
    setIsLoading(true)

    try {
      const data = await getProjectEstimates(projectId)
      setEstimates(data)

      if (data.length === 0) {
        setActiveEstimateId(null)
        setPackages(toEditablePackages(null))
        setStatus('No estimate versions yet. Create v1 to begin planning.')
        setIsLoading(false)
        return
      }

      const targetId = preferredEstimateId && data.some((item: EstimateWithPackages) => item.id === preferredEstimateId)
        ? preferredEstimateId
        : data[0].id

      setActiveEstimateId(targetId)
      setPackages(toEditablePackages(data.find((item: EstimateWithPackages) => item.id === targetId) ?? null))
      setStatus(`Loaded ${data.length} estimate version(s).`)
    } catch (error) {
      setStatus(error instanceof Error ? `Estimate load error: ${error.message}` : 'Estimate load error')
    }

    setIsLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadEstimates()
    // Project scope reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const createVersionHandler = async () => {
    if (!canEdit) {
      return
    }

    setIsLoading(true)

    try {
      const created = await createEstimateVersion(projectId)
      await loadEstimates(created.id)
      setStatus(`Estimate v${created.version_number} created.`)
    } catch (error) {
      setStatus(error instanceof Error ? `Create version error: ${error.message}` : 'Create version error')
      setIsLoading(false)
    }
  }

  const saveDraftHandler = async () => {
    if (!canEditActiveEstimate || !activeEstimateId) {
      return
    }

    setIsLoading(true)

    try {
      await saveEstimateDraft({
        estimateId: activeEstimateId,
        workPackages: packages.map((item) => ({
          name: item.name,
          estimatedHours: Number(item.estimatedHours) || 0,
        })),
      })

      await loadEstimates(activeEstimateId)
      setStatus('Estimate draft saved.')
    } catch (error) {
      setStatus(error instanceof Error ? `Save draft error: ${error.message}` : 'Save draft error')
      setIsLoading(false)
    }
  }

  const approveHandler = async () => {
    if (!canEditActiveEstimate || !activeEstimateId) {
      return
    }

    setIsLoading(true)

    try {
      await approveEstimate(activeEstimateId)
      await loadEstimates(activeEstimateId)
      await loadDashboardPreview()
      setStatus('Estimate approved. Team can use this baseline.')
    } catch (error) {
      setStatus(error instanceof Error ? `Approve error: ${error.message}` : 'Approve error')
      setIsLoading(false)
    }
  }

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
                setPackages(toEditablePackages(estimate))
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
