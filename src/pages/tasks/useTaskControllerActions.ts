import { createTimeEntry, type TaskPreview } from '../../lib/pm'
import type { TaskStatus } from '../../features/tasks/constants.ts'

interface UseTaskControllerActionsInput {
  selectedProjectId: string | null
  hasEstimateVersion: boolean | null
  isMemberInSelectedProject: boolean
  canSubmit: boolean
  isWorkPackageMissing: boolean
  taskEstimateHours: string
  taskDueDate: string
  projectStartDate: string
  projectEndDate: string
  taskTitle: string
  taskDescription: string
  taskPriority: string
  taskWorkPackageId: string
  canAssignAssignee: boolean
  taskAssigneeId: string
  taskBlockedByTaskId: string
  reset: () => void
  addTask: (input: {
    title: string
    description?: string
    status?: string
    priority?: string
    estimateHours?: number
    workPackageId?: string
    assignedTo?: string
    blockedByTaskId?: string
    dueDate?: string
  }) => Promise<void>
  editTask: (taskId: string, patch: {
    status?: string
    assignedTo?: string
    dueDate?: string
  }) => Promise<void>
  setStatus: (status: string) => void
  setHasAttemptedSubmit: (value: boolean) => void
  logTimeTask: TaskPreview | null
  setLogTimeTask: (task: TaskPreview | null) => void
  selectProject: (projectId: string) => Promise<void>
}

export function useTaskControllerActions(input: UseTaskControllerActionsInput) {
  const createTaskHandler = async () => {
    input.setHasAttemptedSubmit(true)

    if (!input.selectedProjectId) {
      input.setStatus('Select a project before creating tasks')
      return
    }

    if (input.hasEstimateVersion === null) {
      input.setStatus('Checking estimate version...')
      return
    }

    if (!input.hasEstimateVersion) {
      input.setStatus(
        input.isMemberInSelectedProject
          ? 'Estimate version is not created yet. Task creation is unavailable.'
          : 'Create estimate version v1 first before creating tasks',
      )
      return
    }

    if (!input.canSubmit) {
      input.setStatus('Task title, estimated hours, and work package are required')
      return
    }

    if (input.isWorkPackageMissing) {
      input.setStatus('Work package is required')
      return
    }

    const estimateHours = Number.parseFloat(input.taskEstimateHours)
    if (!Number.isFinite(estimateHours) || estimateHours < 0) {
      input.setStatus('Estimated hours must be a number greater than or equal to 0')
      return
    }

    if (input.taskDueDate) {
      if (input.projectStartDate && input.taskDueDate < input.projectStartDate) {
        input.setStatus('Due date must be within project dates')
        return
      }

      if (input.projectEndDate && input.taskDueDate > input.projectEndDate) {
        input.setStatus('Due date must be within project dates')
        return
      }
    }

    await input.addTask({
      title: input.taskTitle.trim(),
      description: input.taskDescription.trim(),
      status: 'backlog',
      priority: input.taskPriority,
      estimateHours,
      workPackageId: input.taskWorkPackageId,
      assignedTo: input.canAssignAssignee ? input.taskAssigneeId || undefined : undefined,
      blockedByTaskId: input.taskBlockedByTaskId || undefined,
      dueDate: input.taskDueDate || undefined,
    })

    input.setHasAttemptedSubmit(false)
    input.reset()
  }

  const moveTaskToStatus = async (taskId: string, status: TaskStatus) => {
    await input.editTask(taskId, { status })
  }

  const assignTaskHandler = async (taskId: string, userId: string) => {
    if (!input.canAssignAssignee) {
      return
    }

    await input.editTask(taskId, {
      assignedTo: userId || undefined,
    })
  }

  const updateTaskDueDateHandler = async (taskId: string, dueDate: string) => {
    if (dueDate) {
      if (input.projectStartDate && dueDate < input.projectStartDate) {
        input.setStatus('Due date must be within project dates')
        return
      }

      if (input.projectEndDate && dueDate > input.projectEndDate) {
        input.setStatus('Due date must be within project dates')
        return
      }
    }

    await input.editTask(taskId, {
      dueDate: dueDate || undefined,
    })
  }

  const submitTaskLogTime = async (hours: number, comment: string) => {
    if (!input.logTimeTask || !input.selectedProjectId) {
      input.setStatus('Select project and task before logging time')
      return
    }

    if (!Number.isFinite(hours) || hours <= 0) {
      input.setStatus('Hours must be a number greater than 0')
      return
    }

    await createTimeEntry({
      projectId: input.selectedProjectId,
      taskId: input.logTimeTask.id,
      entryDate: new Date().toISOString().slice(0, 10),
      hoursSpent: hours,
      isBillable: true,
      notes: comment,
    })

    await input.selectProject(input.selectedProjectId)
    input.setStatus(`Time logged for task: ${input.logTimeTask.title}`)
    input.setLogTimeTask(null)
  }

  return {
    createTaskHandler,
    moveTaskToStatus,
    assignTaskHandler,
    updateTaskDueDateHandler,
    submitTaskLogTime,
  }
}
