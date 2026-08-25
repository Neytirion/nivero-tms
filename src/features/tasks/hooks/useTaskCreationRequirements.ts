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
  const isEstimateHoursMissingOrInvalid =
    estimateHoursRaw.length > 0 && (!Number.isFinite(parsedEstimateHours) || parsedEstimateHours < 0)
  const isWorkPackageMissing = false

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

    return fields
  }, [isEstimateHoursMissingOrInvalid, isProjectMissing, isTaskTitleMissing])

  return {
    parsedEstimateHours,
    isProjectMissing,
    isTaskTitleMissing,
    isEstimateHoursMissingOrInvalid,
    isWorkPackageMissing,
    missingRequiredFields,
  }
}
