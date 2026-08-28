import { useEffect, useMemo, useState } from 'react'
import {
  approveEstimate,
  createEstimateVersion,
  getDefaultWorkPackageColor,
  getProjectEstimates,
  getWorkPackageColor,
  saveEstimateDraft,
  type EstimateWithPackages,
  type WorkPackagePreview,
} from '../../../../lib/pm'
import { useWorkspace } from '../../../workspace/workspace-context.tsx'

export interface EditableWorkPackage {
  name: string
  estimatedHours: string
  color: string
}

export interface PackageFieldError {
  index: number
  field: 'name' | 'estimatedHours'
  message: string
}

function toEditablePackages(estimate: EstimateWithPackages | null) {
  if (!estimate || estimate.work_packages.length === 0) {
    return [] as EditableWorkPackage[]
  }

  return estimate.work_packages
    .slice()
    .filter((item: WorkPackagePreview) => item.is_active)
    .sort((a: WorkPackagePreview, b: WorkPackagePreview) => a.sort_order - b.sort_order)
    .map((item: WorkPackagePreview, index: number) => ({
      name: item.name,
      estimatedHours: String(item.estimated_hours ?? 0),
      color: getWorkPackageColor(item.color, index),
    }))
}

function validatePackages(packages: EditableWorkPackage[]): PackageFieldError[] {
  const errors: PackageFieldError[] = []
  const seenNames = new Set<string>()

  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i]

    if (!pkg.name.trim() && !pkg.estimatedHours.trim()) {
      continue
    }

    if (!pkg.name.trim()) {
      errors.push({
        index: i,
        field: 'name',
        message: 'Name is required',
      })
      continue
    }

    const normalizedName = pkg.name.trim().toLowerCase()
    if (seenNames.has(normalizedName)) {
      errors.push({
        index: i,
        field: 'name',
        message: `Duplicate: "${pkg.name}" already used`,
      })
    }
    seenNames.add(normalizedName)

    const hours = Number(pkg.estimatedHours)
    if (!Number.isFinite(hours) || hours < 0) {
      errors.push({
        index: i,
        field: 'estimatedHours',
        message: 'Must be 0 or more',
      })
    }
  }

  return errors
}

interface UseEstimatesTabControllerInput {
  projectId: string
  canEdit: boolean
  onEstimateCreated?: (estimateId: string) => void
}

export function useEstimatesTabController(input: UseEstimatesTabControllerInput) {
  const { projectId, canEdit, onEstimateCreated } = input
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
        .map((item: WorkPackagePreview, index: number) => ({
          name: `${item.name} (archived)`,
          estimatedHours: String(item.estimated_hours ?? 0),
          color: getWorkPackageColor(item.color, index),
        })) ?? [],
    [activeEstimate],
  )

  const displayedPackages = showArchived ? [...packages, ...archivedPackages] : packages
  const packageValidationErrors = useMemo(() => validatePackages(packages), [packages])
  const canEditActiveEstimate = canEdit && activeEstimate?.status !== 'approved'
  const latestEstimate = estimates[0] ?? null
  const canCreateNewVersion = canEdit && (!latestEstimate || (latestEstimate.status ?? '').toLowerCase() === 'approved')

  const addWorkPackageRow = () => {
    if (!canEditActiveEstimate || !activeEstimateId) {
      return
    }

    setPackages((prev) => [
      ...prev,
      {
        name: '',
        estimatedHours: '',
        color: getDefaultWorkPackageColor(prev.length),
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
      setStatus('')
    } catch (error) {
      setStatus(error instanceof Error ? `Estimate load error: ${error.message}` : 'Estimate load error')
    }

    setIsLoading(false)
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadEstimates()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const createVersionHandler = async () => {
    if (!canEdit) {
      return
    }

    if (!canCreateNewVersion) {
      setStatus('Finalize & Approve the current estimate version before creating a new one.')
      return
    }

    setIsLoading(true)

    try {
      const created = await createEstimateVersion(projectId)
      await loadEstimates(created.id)
      onEstimateCreated?.(created.id)
      setStatus(`Estimate v${created.version_number} created.`)
    } catch (error) {
      setStatus(error instanceof Error ? `Create version error: ${error.message}` : 'Create version error')
      setIsLoading(false)
    }
  }

  const saveDraftHandler = async () => {
    if (!canEditActiveEstimate || !activeEstimateId) {
      return false
    }

    if (packageValidationErrors.length > 0) {
      setStatus('Fix validation errors before saving.')
      return false
    }

    setIsLoading(true)

    try {
      await saveEstimateDraft({
        estimateId: activeEstimateId,
        workPackages: packages.map((item, index) => ({
          name: item.name,
          estimatedHours: Number(item.estimatedHours) || 0,
          color: getWorkPackageColor(item.color, index),
        })),
      })

      await loadEstimates(activeEstimateId)
      setStatus('Estimate draft saved.')
      return true
    } catch (error) {
      setStatus(error instanceof Error ? `Save draft error: ${error.message}` : 'Save draft error')
      setIsLoading(false)
      return false
    }
  }

  const approveHandler = async () => {
    if (!canEditActiveEstimate || !activeEstimateId) {
      return
    }

    if (packageValidationErrors.length > 0) {
      setStatus('Fix validation errors before approval.')
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

  const startStandardEstimatesHandler = async () => {
    if (!canEdit || estimates.length > 0) {
      return
    }

    setIsLoading(true)

    try {
      // Create first estimate version
      const created = await createEstimateVersion(projectId)
      
      // Standard work packages provided by the team
      const standardPackages = [
        { name: 'UX/UI', estimatedHours: 0 },
        { name: 'Backend/Integrations', estimatedHours: 0 },
        { name: 'Frontend', estimatedHours: 0 },
        { name: 'Test and QA', estimatedHours: 0 },
        { name: 'Iterations', estimatedHours: 0 },
        { name: 'Project management', estimatedHours: 0 },
      ]

      // Save with standard packages
      await saveEstimateDraft({
        estimateId: created.id,
        workPackages: standardPackages.map((pkg, index) => ({
          name: pkg.name,
          estimatedHours: pkg.estimatedHours,
          color: getDefaultWorkPackageColor(index),
        })),
      })

      await loadEstimates(created.id)
      onEstimateCreated?.(created.id)
      setStatus(`Estimate v${created.version_number} created with standard work packages.`)
    } catch (error) {
      setStatus(error instanceof Error ? `Start estimates error: ${error.message}` : 'Start estimates error')
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
    canCreateNewVersion,
    totalHours,
    addWorkPackageRow,
    removeWorkPackageRow,
    createVersionHandler,
    saveDraftHandler,
    approveHandler,
    startStandardEstimatesHandler,
    packageValidationErrors,
  }
}
