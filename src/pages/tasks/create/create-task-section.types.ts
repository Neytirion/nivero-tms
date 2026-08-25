import type { ProjectMemberListItem, ProjectPreview, WorkPackagePreview } from '../../../lib/pm'

export type DependencyOption = {
  id: string
  label: string
}

export type CreateTaskSectionProps = {
  useEstimates: boolean
  selectedProjectId: string | null
  selectedProject: ProjectPreview | null
  isProjectMissing: boolean
  isTaskTitleMissing: boolean
  isEstimateHoursMissingOrInvalid: boolean
  isWorkPackageMissing: boolean
  taskTitle: string
  taskDescription: string
  taskEstimateHours: string
  taskPriority: string
  taskDueDate: string
  taskWorkPackageId: string
  taskBlockedByTaskId: string
  taskAssigneeId: string
  projectStartDate: string
  projectEndDate: string
  workPackages: Array<Pick<WorkPackagePreview, 'id' | 'name' | 'estimated_hours'>>
  dependencyOptions: DependencyOption[]
  canAssignAssignee: boolean
  projectMembers: ProjectMemberListItem[]
  memberDisplayRoleByUserId: Record<string, string>
  missingRequiredFields: string[]
  hasAttemptedSubmit: boolean
  isLoading: boolean
  canSubmit: boolean
  onTaskTitleChange: (value: string) => void
  onTaskDescriptionChange: (value: string) => void
  onTaskEstimateHoursChange: (value: string) => void
  onTaskPriorityChange: (value: string) => void
  onTaskDueDateChange: (value: string) => void
  onTaskWorkPackageIdChange: (value: string) => void
  onTaskBlockedByTaskIdChange: (value: string) => void
  onTaskAssigneeIdChange: (value: string) => void
  onCreateTask: () => void
  onSetHasAttemptedSubmit: (value: boolean) => void
}

export type CoreTaskFieldsProps = {
  selectedProject: ProjectPreview | null
  hasAttemptedSubmit: boolean
  isProjectMissing: boolean
  isTaskTitleMissing: boolean
  taskTitle: string
  taskDescription: string
  onTaskTitleChange: (value: string) => void
  onTaskDescriptionChange: (value: string) => void
}

export type PlanningTaskFieldsProps = {
  useEstimates: boolean
  hasAttemptedSubmit: boolean
  isEstimateHoursMissingOrInvalid: boolean
  taskEstimateHours: string
  taskPriority: string
  taskDueDate: string
  projectStartDate: string
  projectEndDate: string
  onTaskEstimateHoursChange: (value: string) => void
  onTaskPriorityChange: (value: string) => void
  onTaskDueDateChange: (value: string) => void
}

export type AssignmentScopeFieldsProps = {
  useEstimates: boolean
  selectedProjectId: string | null
  hasAttemptedSubmit: boolean
  isWorkPackageMissing: boolean
  taskWorkPackageId: string
  taskBlockedByTaskId: string
  taskAssigneeId: string
  workPackages: Array<Pick<WorkPackagePreview, 'id' | 'name' | 'estimated_hours'>>
  dependencyOptions: DependencyOption[]
  canAssignAssignee: boolean
  projectMembers: ProjectMemberListItem[]
  memberDisplayRoleByUserId: Record<string, string>
  onTaskWorkPackageIdChange: (value: string) => void
  onTaskBlockedByTaskIdChange: (value: string) => void
  onTaskAssigneeIdChange: (value: string) => void
}

export type CreateTaskFooterProps = {
  selectedProject: ProjectPreview | null
  selectedProjectId: string | null
  canSubmit: boolean
  missingRequiredFields: string[]
  isLoading: boolean
  isCreationBlocked: boolean
  onCreateTask: () => void
  onSetHasAttemptedSubmit: (value: boolean) => void
}