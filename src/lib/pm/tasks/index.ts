import { supabase } from '../../supabase'
import type { CreateTaskInput, TaskPreview, UpdateTaskInput } from '../types'
import {
  assertProjectEditable,
  assertTaskDependencyValid,
  assertTaskDueDateWithinProjectRange,
  assertTaskWorkPackageValid,
  assertUserCanModifyTask,
  canUserAssignTasksInProject,
  getTaskProjectId,
} from '../helpers'
import { isExecutionTaskStatus, isTaskClosedStatus } from '../../../shared/utils/task-status.ts'
import { getProjectMemberEmail, notifySlackPilot, taskUrl } from '../../slack-notifications'

export async function createTask(input: CreateTaskInput) {
  await assertProjectEditable(input.projectId, 'create task')

  if (input.estimateHours !== undefined && input.estimateHours !== null) {
    if (!Number.isFinite(input.estimateHours) || input.estimateHours < 0) {
      throw new Error('Estimated hours must be a number greater than or equal to 0')
    }
  }

  if ((input.workPackageId?.trim().length ?? 0) > 0) {
    await assertTaskWorkPackageValid(input.projectId, input.workPackageId)
  }
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
      throw new Error('Permission denied: only project members can assign tasks')
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
      is_billable: input.isBillable ?? true,
      created_by: userData.user.id,
    })
    .select('id,work_package_id,title,description,status,priority,assigned_to,created_by,estimate_hours,actual_hours,blocked_by_task_id,due_date,project_id,created_at,is_billable')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  const createdTask = data satisfies TaskPreview
  if (createdTask.assigned_to && createdTask.assigned_to !== userData.user.id) {
    const recipientEmail = await getProjectMemberEmail(input.projectId, createdTask.assigned_to)
    notifySlackPilot({
      recipientEmail,
      actorEmail: userData.user.email,
      text: `You were assigned the task: ${createdTask.title}\n${taskUrl(createdTask.id)}`,
    })
  }

  return createdTask
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
    .select('status,blocked_by_task_id,assigned_to,due_date')
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

    const currentAssignee = currentTask.assigned_to ?? null
    const nextAssignee = patch.assigned_to ?? null
    const isClaimingUnassignedTask = currentAssignee === null && nextAssignee === userData.user.id
    const hasNonAssigneeUpdates = [
      patch.title,
      patch.description,
      patch.status,
      patch.priority,
      patch.work_package_id,
      patch.estimate_hours,
      patch.actual_hours,
      patch.blocked_by_task_id,
      patch.due_date,
    ].some((value) => value !== undefined)

    if (currentAssignee === null && hasNonAssigneeUpdates) {
      throw new Error('Unassigned task must be taken before editing')
    }

    if (patch.assigned_to !== undefined && nextAssignee !== currentAssignee && !isClaimingUnassignedTask) {
      throw new Error('Only unassigned tasks can be taken by yourself')
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
    .select('id,work_package_id,title,description,status,priority,assigned_to,created_by,estimate_hours,actual_hours,blocked_by_task_id,due_date,project_id,created_at,is_billable')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Permission denied: you cannot update this task')
  }

  const updatedTask = data satisfies TaskPreview
  const notificationLines: string[] = []
  const nextStatus = updatedTask.status?.toLowerCase() ?? ''
  const previousStatus = currentTask.status?.toLowerCase() ?? ''

  if (patch.status !== undefined && nextStatus === 'blocked' && previousStatus !== 'blocked') {
    notificationLines.push('This task is blocked.')
  }
  if (patch.status !== undefined && isTaskClosedStatus(previousStatus) && !isTaskClosedStatus(nextStatus)) {
    notificationLines.push('This task was reopened.')
  }
  if (patch.due_date !== undefined && patch.due_date !== currentTask.due_date) {
    notificationLines.push(`Due date changed to ${patch.due_date || 'not set'}.`)
  }

  if (notificationLines.length > 0 && updatedTask.project_id && updatedTask.assigned_to && updatedTask.assigned_to !== userData.user.id) {
    const recipientEmail = await getProjectMemberEmail(updatedTask.project_id, updatedTask.assigned_to)
    notifySlackPilot({
      recipientEmail,
      actorEmail: userData.user.email,
      text: `${updatedTask.title}\n${notificationLines.join('\n')}\n${taskUrl(updatedTask.id)}`,
    })
  }

  return updatedTask
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