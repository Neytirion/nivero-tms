import { createTimeEntry, type TaskPreview } from '../../../lib/pm'
import type { TaskStatus } from '../../../features/tasks/constants.ts'
import { localDateTimeToISOString } from '../../time-tracking/utils/time-tracking.utils'

interface UseTaskControllerActionsInput {
  selectedProjectId: string | null
  useEstimates: boolean
  hasEstimateVersion: boolean | null
  canSubmit: boolean
  taskEstimateHours: string
  taskDueDate: string
  taskIsBillable: boolean
  projectStartDate: string
  projectEndDate: string
  taskTitle: string
  taskDescription: string
  taskPriority: string
  taskWorkPackageId: string
  canAssignAssignee: boolean
  currentUserId: string | null
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
    isBillable?: boolean
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
  reloadCurrentTasks: () => Promise<void>
}

export function useTaskControllerActions(input: UseTaskControllerActionsInput) {
  const createTaskHandler = async () => {
    input.setHasAttemptedSubmit(true)

    if (!input.selectedProjectId) {
      input.setStatus('Select a project before creating tasks')
      return false
    }

    if (!input.canSubmit) {
      input.setStatus('Task title is required')
      return false
    }

    const estimateHours = Number.parseFloat(input.taskEstimateHours)
    if (input.taskEstimateHours.trim().length > 0 && (!Number.isFinite(estimateHours) || estimateHours < 0)) {
      input.setStatus('Estimated hours must be a number greater than or equal to 0')
      return false
    }

    if (input.taskDueDate) {
      if (input.projectStartDate && input.taskDueDate < input.projectStartDate) {
        input.setStatus('Due date must be within project dates')
        return false
      }

      if (input.projectEndDate && input.taskDueDate > input.projectEndDate) {
        input.setStatus('Due date must be within project dates')
        return false
      }
    }

    await input.addTask({
      title: input.taskTitle.trim(),
      description: input.taskDescription.trim(),
      status: 'backlog',
      priority: input.taskPriority,
      estimateHours: input.taskEstimateHours.trim().length > 0 ? estimateHours : undefined,
      workPackageId: input.taskWorkPackageId || undefined,
      assignedTo: input.canAssignAssignee ? input.taskAssigneeId || undefined : undefined,
      blockedByTaskId: input.taskBlockedByTaskId || undefined,
      dueDate: input.taskDueDate || undefined,
      isBillable: input.taskIsBillable,
    })

    input.setHasAttemptedSubmit(false)
    input.reset()
    return true
  }

  const moveTaskToStatus = async (taskId: string, status: TaskStatus) => {
    await input.editTask(taskId, { status })
  }

  const claimTaskHandler = async (taskId: string) => {
    if (!input.canAssignAssignee) {
      return
    }

    if (!input.currentUserId) {
      return
    }

    await input.editTask(taskId, {
      assignedTo: input.currentUserId,
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

  const submitTaskLogTime = async (startTime: string, endTime: string) => {
    if (!input.logTimeTask || !input.selectedProjectId) {
      input.setStatus('Select project and task before logging time')
      return
    }

    if (!startTime || !endTime) {
      input.setStatus('Select both start and end time')
      return
    }

    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)
    const startTotalMin = startH * 60 + startM
    const endTotalMin = endH * 60 + endM

    if (endTotalMin <= startTotalMin) {
      input.setStatus('End time must be after start time')
      return
    }

    const durationMin = endTotalMin - startTotalMin
    const hoursSpent = durationMin / 60

    const entryDate = new Date().toISOString().slice(0, 10)
    const startedAt = localDateTimeToISOString(entryDate, startTime)
    const endedAt = localDateTimeToISOString(entryDate, endTime)

    await createTimeEntry({
      projectId: input.selectedProjectId,
      taskId: input.logTimeTask.id,
      entryDate,
      hoursSpent,
      isBillable: true,
      startedAt,
      endedAt,
    })

    await input.reloadCurrentTasks()
    input.setStatus(`Time logged for task: ${input.logTimeTask.title}`)
    input.setLogTimeTask(null)
  }

  return {
    createTaskHandler,
    moveTaskToStatus,
    claimTaskHandler,
    updateTaskDueDateHandler,
    submitTaskLogTime,
  }
}
