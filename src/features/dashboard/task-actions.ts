import { createTask, deleteTask, updateTask, type TaskPreview } from '../../lib/pm'
import { supabase } from '../../lib/supabase'

type SetStatus = (value: string | ((prev: string) => string)) => void
type SetIsLoading = (value: boolean | ((prev: boolean) => boolean)) => void
type SetTasks = (value: TaskPreview[] | ((prev: TaskPreview[]) => TaskPreview[])) => void

interface TaskActionsConfig {
  selectedProjectId: string | null
  tasks: TaskPreview[]
  setStatus: SetStatus
  setIsLoading: SetIsLoading
  setTasks: SetTasks
  ensureProjectEditable: (projectId: string | null | undefined, action: string) => boolean
  canAssignTasksInProject: (projectId: string) => boolean
  canManageTask: (task: TaskPreview) => boolean
  canDeleteTask: (task: TaskPreview) => boolean
  refreshProjectSnapshot: (projectId: string) => Promise<TaskPreview[]>
  reloadProjectsOnly: () => Promise<unknown>
}

export function createTaskActions(config: TaskActionsConfig) {
  const addTask = async (input: {
    title: string
    description?: string
    status?: string
    priority?: string
    workPackageId?: string
    assignedTo?: string
    estimateHours?: number
    actualHours?: number
    blockedByTaskId?: string
    dueDate?: string
  }) => {
    if (!config.selectedProjectId) {
      config.setStatus('Select a project before creating tasks')
      return
    }

    if (!config.ensureProjectEditable(config.selectedProjectId, 'create task')) {
      return
    }

    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) {
      config.setStatus(`Create task error: ${authError.message}`)
      return
    }

    const authUserId = authData.user?.id ?? null
    if (!authUserId) {
      config.setStatus('Create task error: user is not authenticated')
      return
    }

    const canAssignInProject = config.canAssignTasksInProject(config.selectedProjectId)
    const normalizedAssignedTo = input.assignedTo ?? (canAssignInProject ? undefined : authUserId)

    if (normalizedAssignedTo && normalizedAssignedTo !== authUserId && !canAssignInProject) {
      config.setStatus('Permission denied: only owner, admin, or manager can assign tasks')
      return
    }

    config.setIsLoading(true)

    try {
      const createdTask = await createTask({
        projectId: config.selectedProjectId,
        workPackageId: input.workPackageId,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        assignedTo: normalizedAssignedTo,
        estimateHours: input.estimateHours,
        actualHours: input.actualHours,
        blockedByTaskId: input.blockedByTaskId,
        dueDate: input.dueDate,
      })

      await config.refreshProjectSnapshot(config.selectedProjectId)
      config.setStatus(`Task created: ${createdTask.title}`)
    } catch (error) {
      if (error instanceof Error && error.message.includes('row-level security policy')) {
        config.setStatus(
          'Create task error: RLS blocks insert into tasks. Apply tasks policies in Supabase SQL Editor, then retry.',
        )
      } else {
        config.setStatus(error instanceof Error ? `Create task error: ${error.message}` : 'Unknown error')
      }
    }

    config.setIsLoading(false)
  }

  const editTask = async (
    taskId: string,
    patch: {
      title?: string
      description?: string
      status?: string
      priority?: string
      workPackageId?: string
      assignedTo?: string
      estimateHours?: number
      actualHours?: number
      dueDate?: string
    },
  ) => {
    const targetTask = config.tasks.find((task) => task.id === taskId)

    if (targetTask?.project_id && !config.ensureProjectEditable(targetTask.project_id, 'update task')) {
      return
    }

    if (targetTask && !config.canManageTask(targetTask)) {
      config.setStatus('Permission denied: you cannot update this task')
      return
    }

    if (patch.assignedTo !== undefined && targetTask?.project_id && !config.canAssignTasksInProject(targetTask.project_id)) {
      config.setStatus('Permission denied: only owner, admin, or manager can assign tasks')
      return
    }

    try {
      const updatedTask = await updateTask(taskId, {
        title: patch.title,
        description: patch.description,
        status: patch.status,
        priority: patch.priority,
        work_package_id: patch.workPackageId,
        assigned_to: patch.assignedTo,
        estimate_hours: patch.estimateHours,
        actual_hours: patch.actualHours,
        due_date: patch.dueDate,
      })

      const projectIdToRefresh = updatedTask.project_id ?? targetTask?.project_id ?? config.selectedProjectId
      if (projectIdToRefresh) {
        await config.refreshProjectSnapshot(projectIdToRefresh)
      } else {
        config.setTasks((prev) => prev.map((task) => (task.id === taskId ? updatedTask : task)))
      }

      config.setStatus(`Task updated: ${updatedTask.title}`)
    } catch (error) {
      config.setStatus(error instanceof Error ? `Update task error: ${error.message}` : 'Unknown error')
    }
  }

  const removeTask = async (taskId: string) => {
    const targetTask = config.tasks.find((task) => task.id === taskId)

    if (targetTask?.project_id && !config.ensureProjectEditable(targetTask.project_id, 'delete task')) {
      return
    }

    if (targetTask && !config.canDeleteTask(targetTask)) {
      config.setStatus('Permission denied: you cannot delete this task')
      return
    }

    try {
      await deleteTask(taskId)

      if (config.selectedProjectId) {
        await config.refreshProjectSnapshot(config.selectedProjectId)
      } else {
        config.setTasks((prev) => prev.filter((task) => task.id !== taskId))
        await config.reloadProjectsOnly()
      }

      config.setStatus('Task deleted')
    } catch (error) {
      config.setStatus(error instanceof Error ? `Delete task error: ${error.message}` : 'Unknown error')
    }
  }

  return {
    addTask,
    editTask,
    removeTask,
  }
}
