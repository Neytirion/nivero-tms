import { supabase } from './supabase'
import type { CreateTaskInput, TaskPreview, UpdateTaskInput } from './pm.types'
import {
  assertProjectEditable,
  assertTaskDependencyValid,
  assertTaskDueDateWithinProjectRange,
  assertTaskWorkPackageValid,
  assertUserCanModifyTask,
  canUserAssignTasksInProject,
  getTaskProjectId,
} from './pm.helpers'
import { hasProjectEstimateVersion } from './pm.estimates'
import { isExecutionTaskStatus, isTaskClosedStatus } from '../shared/utils/task-status.ts'

export async function createTask(input: CreateTaskInput) {
  await assertProjectEditable(input.projectId, 'create task')

  const hasEstimateVersion = await hasProjectEstimateVersion(input.projectId)
  if (!hasEstimateVersion) {
    throw new Error('Cannot create task: create estimate version v1 first')
  }

  if (input.estimateHours === undefined || input.estimateHours === null) {
    throw new Error('Estimated hours is required')
  }

  if (!Number.isFinite(input.estimateHours) || input.estimateHours < 0) {
    throw new Error('Estimated hours must be a number greater than or equal to 0')
  }

  await assertTaskWorkPackageValid(input.projectId, input.workPackageId)
  await assertTaskDueDateWithinProjectRange(input.projectId, input.dueDate)

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!userData.user) {
    throw new Error('User is not authenticated')
  }

  if (input.assignedTo && input.assignedTo !== userData.user.id) {
    const canAssign = await canUserAssignTasksInProject(input.projectId, userData.user.id)
    if (!canAssign) {
      throw new Error('Permission denied: only owner, admin, or manager can assign tasks')
    }
  }

  const blockerTask = await assertTaskDependencyValid(input.projectId, null, input.blockedByTaskId ?? null)

  if (isExecutionTaskStatus(input.status) && blockerTask && !isTaskClosedStatus(blockerTask.status)) {
    throw new Error('Cannot move task forward: dependency task is not completed yet')
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: input.projectId,
      work_package_id: input.workPackageId,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? 'todo',
      priority: input.priority ?? 'medium',
      assigned_to: input.assignedTo ?? null,
      estimate_hours: input.estimateHours,
      actual_hours: input.actualHours ?? 0,
      blocked_by_task_id: input.blockedByTaskId ?? null,
      due_date: input.dueDate ?? null,
      created_by: userData.user.id,
    })
    .select('id,work_package_id,title,description,status,priority,assigned_to,created_by,estimate_hours,actual_hours,blocked_by_task_id,due_date,project_id,created_at')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies TaskPreview
}

export async function updateTask(taskId: string, patch: UpdateTaskInput) {
  const projectId = await getTaskProjectId(taskId)

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!userData.user) {
    throw new Error('User is not authenticated')
  }

  await assertUserCanModifyTask(taskId, userData.user.id, 'update')

  const { data: currentTask, error: currentTaskError } = await supabase
    .from('tasks')
    .select('status,blocked_by_task_id')
    .eq('id', taskId)
    .maybeSingle()

  if (currentTaskError) {
    throw new Error(currentTaskError.message)
  }

  if (!currentTask) {
    throw new Error('Task not found')
  }

  if (projectId) {
    await assertProjectEditable(projectId, 'update task')

    if (patch.due_date !== undefined) {
      await assertTaskDueDateWithinProjectRange(projectId, patch.due_date)
    }

    if (patch.blocked_by_task_id !== undefined) {
      const nextBlockedByTaskId = patch.blocked_by_task_id
      if (nextBlockedByTaskId !== currentTask.blocked_by_task_id) {
        throw new Error('Permission denied: dependency cannot be changed after task creation')
      }
    }

    if (patch.assigned_to !== undefined) {
      const canAssign = await canUserAssignTasksInProject(projectId, userData.user.id)
      if (!canAssign) {
        throw new Error('Permission denied: only owner, admin, or manager can assign tasks')
      }
    }

    const nextBlockedByTaskId =
      patch.blocked_by_task_id === undefined ? currentTask.blocked_by_task_id : patch.blocked_by_task_id
    const blockerTask = await assertTaskDependencyValid(projectId, taskId, nextBlockedByTaskId)
    const nextStatus = patch.status ?? currentTask.status

    if (isExecutionTaskStatus(nextStatus) && blockerTask && !isTaskClosedStatus(blockerTask.status)) {
      throw new Error('Cannot move task forward: dependency task is not completed yet')
    }
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select('id,work_package_id,title,description,status,priority,assigned_to,created_by,estimate_hours,actual_hours,blocked_by_task_id,due_date,project_id,created_at')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Permission denied: you cannot update this task')
  }

  return data satisfies TaskPreview
}

export async function deleteTask(taskId: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!userData.user) {
    throw new Error('User is not authenticated')
  }

  await assertUserCanModifyTask(taskId, userData.user.id, 'delete')

  const projectId = await getTaskProjectId(taskId)

  if (projectId) {
    await assertProjectEditable(projectId, 'delete task')
  }

  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
    .select('id')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Permission denied: you cannot delete this task')
  }
}