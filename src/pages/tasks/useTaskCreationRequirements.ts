import { useMemo } from 'react'

interface UseTaskCreationRequirementsInput {
  selectedProjectId: string | null
  taskTitle: string
  taskEstimateHours: string
  taskWorkPackageId: string
}

export function useTaskCreationRequirements(input: UseTaskCreationRequirementsInput) {
  const parsedEstimateHours = Number.parseFloat(input.taskEstimateHours)
  const isProjectMissing = !input.selectedProjectId
  const isTaskTitleMissing = input.taskTitle.trim().length === 0
  const isEstimateHoursMissingOrInvalid =
    input.taskEstimateHours.trim().length === 0 || !Number.isFinite(parsedEstimateHours) || parsedEstimateHours < 0
  const isWorkPackageMissing = input.taskWorkPackageId.trim().length === 0

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
