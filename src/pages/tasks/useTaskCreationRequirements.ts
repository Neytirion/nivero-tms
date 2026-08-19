import { useMemo } from 'react'

interface UseTaskCreationRequirementsInput {
  selectedProjectId: string | null
  useEstimates: boolean
  taskTitle: string
  taskEstimateHours: string
  taskWorkPackageId: string
}

export function useTaskCreationRequirements(input: UseTaskCreationRequirementsInput) {
  const parsedEstimateHours = Number.parseFloat(input.taskEstimateHours)
  const isProjectMissing = !input.selectedProjectId
  const isTaskTitleMissing = input.taskTitle.trim().length === 0
  const estimateHoursRaw = input.taskEstimateHours.trim()
  const isEstimateHoursMissingOrInvalid = input.useEstimates
    ? (estimateHoursRaw.length === 0 || !Number.isFinite(parsedEstimateHours) || parsedEstimateHours < 0)
    : (estimateHoursRaw.length > 0 && (!Number.isFinite(parsedEstimateHours) || parsedEstimateHours < 0))
  const isWorkPackageMissing = input.useEstimates
    ? input.taskWorkPackageId.trim().length === 0
    : false

  const missingRequiredFields = useMemo(() => {
    const fields: string[] = []

    if (isProjectMissing) {
      fields.push('Project')
    }

    if (isTaskTitleMissing) {
      fields.push('Task title')
    }

    if (isEstimateHoursMissingOrInvalid) {
      fields.push('Estimated hours')
    }

    if (isWorkPackageMissing) {
      fields.push('Work package')
    }

    return fields
  }, [isEstimateHoursMissingOrInvalid, isProjectMissing, isTaskTitleMissing, isWorkPackageMissing])

  return {
    parsedEstimateHours,
    isProjectMissing,
    isTaskTitleMissing,
    isEstimateHoursMissingOrInvalid,
    isWorkPackageMissing,
    missingRequiredFields,
  }
}
