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

export interface EditableWorkPackage {
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

interface UseEstimatesTabControllerInput {
  projectId: string
  canEdit: boolean
}

export function useEstimatesTabController(input: UseEstimatesTabControllerInput) {
  const { projectId, canEdit } = input
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

  return {
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
  }
}
