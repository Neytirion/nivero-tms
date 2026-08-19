import { useCallback, useLayoutEffect, useRef } from 'react'
import { createTask, deleteTask, updateTask, type TaskPreview } from '../../lib/pm'
import { supabase } from '../../lib/supabase'

type SetStatus = (value: string | ((prev: string) => string)) => void
type SetIsLoading = (value: boolean | ((prev: boolean) => boolean)) => void

interface TaskActionsDeps {
  selectedProjectId: string | null
  tasks: TaskPreview[]
  setStatus: SetStatus
  setIsLoading: SetIsLoading
  ensureProjectEditable: (projectId: string | null | undefined, action: string) => boolean
  canAssignTasksInProject: (projectId: string) => boolean
  canManageTask: (task: TaskPreview) => boolean
  canDeleteTask: (task: TaskPreview) => boolean
  /** Reload tasks + members and refresh project metrics — called after any task mutation */
  reloadTasksAndMembers: (projectId: string) => Promise<void>
}

/**
 * Hook that exposes memoized task CRUD actions.
 * Uses a ref to always read the latest deps without re-creating callbacks.
 */
export function useTaskActions(deps: TaskActionsDeps) {
  const depsRef = useRef(deps)
  useLayoutEffect(() => {
    depsRef.current = deps
  })

  const addTask = useCallback(
    async (input: {
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
      const { selectedProjectId, ensureProjectEditable, canAssignTasksInProject, setStatus, setIsLoading, reloadTasksAndMembers } =
        depsRef.current

      if (!selectedProjectId) {
        setStatus('Select a project before creating tasks')
        return
      }
      if (!ensureProjectEditable(selectedProjectId, 'create task')) return

      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) {
        setStatus(`Create task error: ${authError.message}`)
        return
      }
      const authUserId = authData.user?.id ?? null
      if (!authUserId) {
        setStatus('Create task error: user is not authenticated')
        return
      }

      const canAssign = canAssignTasksInProject(selectedProjectId)
      const normalizedAssignedTo = input.assignedTo ?? (canAssign ? undefined : authUserId)
      if (normalizedAssignedTo && normalizedAssignedTo !== authUserId && !canAssign) {
        setStatus('Permission denied: only project members can assign tasks')
        return
      }

      setIsLoading(true)

      try {
        const createdTask = await createTask({
          projectId: selectedProjectId,
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
        await reloadTasksAndMembers(selectedProjectId)
        setStatus(`Task created: ${createdTask.title}`)
      } catch (error) {
        if (error instanceof Error && error.message.includes('row-level security policy')) {
          setStatus('Create task error: RLS blocks insert into tasks. Apply tasks policies in Supabase SQL Editor, then retry.')
        } else {
          setStatus(error instanceof Error ? `Create task error: ${error.message}` : 'Unknown error')
        }
      }

      setIsLoading(false)
    },
    [],
  )

  const editTask = useCallback(
    async (
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
      const { tasks, selectedProjectId, ensureProjectEditable, canManageTask, canAssignTasksInProject, setStatus, reloadTasksAndMembers } =
        depsRef.current

      const targetTask = tasks.find((t) => t.id === taskId)
      if (targetTask?.project_id && !ensureProjectEditable(targetTask.project_id, 'update task')) return
      if (targetTask && !canManageTask(targetTask)) {
        setStatus('Permission denied: you cannot update this task')
        return
      }
      if (patch.assignedTo !== undefined && targetTask && patch.assignedTo !== targetTask.assigned_to) {
        setStatus('Assignee can only be set during task creation')
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
        const projectIdToRefresh = updatedTask.project_id ?? targetTask?.project_id ?? selectedProjectId
        if (projectIdToRefresh) {
          await reloadTasksAndMembers(projectIdToRefresh)
        }
        setStatus(`Task updated: ${updatedTask.title}`)
      } catch (error) {
        setStatus(error instanceof Error ? `Update task error: ${error.message}` : 'Unknown error')
      }
    },
    [],
  )

  const removeTask = useCallback(
    async (taskId: string) => {
      const { tasks, selectedProjectId, ensureProjectEditable, canDeleteTask, setStatus, reloadTasksAndMembers } =
        depsRef.current

      const targetTask = tasks.find((t) => t.id === taskId)
      if (targetTask?.project_id && !ensureProjectEditable(targetTask.project_id, 'delete task')) return
      if (targetTask && !canDeleteTask(targetTask)) {
        setStatus('Permission denied: you cannot delete this task')
        return
      }

      try {
        await deleteTask(taskId)
        if (selectedProjectId) {
          await reloadTasksAndMembers(selectedProjectId)
        }
        setStatus('Task deleted')
      } catch (error) {
        setStatus(error instanceof Error ? `Delete task error: ${error.message}` : 'Unknown error')
      }
    },
    [],
  )

  return { addTask, editTask, removeTask }
}
