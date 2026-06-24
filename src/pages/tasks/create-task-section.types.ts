import type { ProjectMemberListItem, ProjectPreview, WorkPackagePreview } from '../../lib/pm'

export type DependencyOption = {
  id: string
  label: string
}

export type CreateTaskSectionProps = {
  hasEstimateVersion: boolean | null
  selectedProjectId: string | null
  isMemberInSelectedProject: boolean
  projects: ProjectPreview[]
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
  missingRequiredFields: string[]
  hasAttemptedSubmit: boolean
  isLoading: boolean
  canSubmit: boolean
  onSelectProject: (projectId: string) => void
  onTaskTitleChange: (value: string) => void
  onTaskDescriptionChange: (value: string) => void
  onTaskEstimateHoursChange: (value: string) => void
  onTaskPriorityChange: (value: string) => void
  onTaskDueDateChange: (value: string) => void
  onTaskWorkPackageIdChange: (value: string) => void
  onTaskBlockedByTaskIdChange: (value: string) => void
  onTaskAssigneeIdChange: (value: string) => void
  onCreateTask: () => void
}

export type CoreTaskFieldsProps = {
  projects: ProjectPreview[]
  selectedProjectId: string | null
  hasAttemptedSubmit: boolean
  isProjectMissing: boolean
  isTaskTitleMissing: boolean
  taskTitle: string
  taskDescription: string
  onSelectProject: (projectId: string) => void
  onTaskTitleChange: (value: string) => void
  onTaskDescriptionChange: (value: string) => void
}

export type PlanningTaskFieldsProps = {
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
  selectedProjectId: string | null
  hasEstimateVersion: boolean | null
  hasAttemptedSubmit: boolean
  isWorkPackageMissing: boolean
  taskWorkPackageId: string
  taskBlockedByTaskId: string
  taskAssigneeId: string
  workPackages: Array<Pick<WorkPackagePreview, 'id' | 'name' | 'estimated_hours'>>
  dependencyOptions: DependencyOption[]
  canAssignAssignee: boolean
  projectMembers: ProjectMemberListItem[]
  onTaskWorkPackageIdChange: (value: string) => void
  onTaskBlockedByTaskIdChange: (value: string) => void
  onTaskAssigneeIdChange: (value: string) => void
}

export type CreateTaskFooterProps = {
  selectedProject: ProjectPreview | null
  selectedProjectId: string | null
  hasEstimateVersion: boolean | null
  canSubmit: boolean
  missingRequiredFields: string[]
  isLoading: boolean
  onCreateTask: () => void
}