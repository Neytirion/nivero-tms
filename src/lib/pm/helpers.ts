import { supabase } from '../supabase'
import { hasProjectPermission, resolveProjectRole } from '../../shared/utils/permissions'
import { databaseError, notFound, permissionDenied, validationError } from '../errors'

export async function getProjectStatusById(projectId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .maybeSingle()

  if (error) {
    throw databaseError(error.message, error)
  }

  return (data?.status ?? '').toLowerCase()
}

export async function getProjectDateBounds(projectId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('start_date,end_date')
    .eq('id', projectId)
    .maybeSingle()

  if (error) {
    throw databaseError(error.message, error)
  }

  return {
    startDate: data?.start_date ?? null,
    endDate: data?.end_date ?? null,
  }
}

export async function assertTaskDueDateWithinProjectRange(projectId: string, dueDate: string | null | undefined) {
  if (!dueDate) {
    return
  }

  const normalizedDueDate = dueDate.slice(0, 10)
  const { startDate, endDate } = await getProjectDateBounds(projectId)

  if (startDate && normalizedDueDate < startDate) {
    throw validationError('Due date must be within project dates')
  }

  if (endDate && normalizedDueDate > endDate) {
    throw validationError('Due date must be within project dates')
  }
}

export async function assertProjectEditable(projectId: string, action: string) {
  const projectStatus = await getProjectStatusById(projectId)

  if (projectStatus === 'completed') {
    throw permissionDenied(`Cannot ${action}: project is completed and read-only`)
  }
}

export async function getUserProjectRole(projectId: string, userId: string) {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .maybeSingle()

  if (projectError) {
    throw databaseError(projectError.message, projectError)
  }

  if (!project) {
    return null
  }

  const { data: membership, error: membershipError } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (membershipError) {
    throw databaseError(membershipError.message, membershipError)
  }

  return resolveProjectRole({
    currentUserId: userId,
    ownerId: project.owner_id,
    membershipRole: membership?.role ?? null,
  })
}

export async function canUserAssignTasksInProject(projectId: string, userId: string) {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .maybeSingle()

  if (projectError) {
    throw databaseError(projectError.message, projectError)
  }

  if (!project) {
    return false
  }

  const { data: membership, error: membershipError } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (membershipError) {
    throw databaseError(membershipError.message, membershipError)
  }

  const role = resolveProjectRole({
    currentUserId: userId,
    ownerId: project.owner_id,
    membershipRole: membership?.role ?? null,
  })

  return hasProjectPermission(role, 'task.assign')
}

export async function assertTaskWorkPackageValid(projectId: string, workPackageId: string | null | undefined) {
  if (!workPackageId || workPackageId.trim().length === 0) {
    throw validationError('Work package is required')
  }

  const { data: workPackage, error: workPackageError } = await supabase
    .from('work_packages')
    .select('id,estimate_id,is_active')
    .eq('id', workPackageId)
    .maybeSingle()

  if (workPackageError) {
    throw databaseError(workPackageError.message, workPackageError)
  }

  if (!workPackage) {
    throw notFound('Selected work package was not found')
  }

  if (!workPackage.is_active) {
    throw validationError('Selected work package is archived and cannot be used for new tasks')
  }

  const { data: estimate, error: estimateError } = await supabase
    .from('estimates')
    .select('project_id')
    .eq('id', workPackage.estimate_id)
    .maybeSingle()

  if (estimateError) {
    throw databaseError(estimateError.message, estimateError)
  }

  if (!estimate || estimate.project_id !== projectId) {
    throw permissionDenied('Selected work package does not belong to this project')
  }
}

export async function assertUserCanModifyTask(taskId: string, userId: string, mode: 'update' | 'delete') {
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('project_id,assigned_to,created_by')
    .eq('id', taskId)
    .maybeSingle()

  if (taskError) {
    throw databaseError(taskError.message, taskError)
  }

  if (!task) {
    throw notFound('Task not found')
  }

  const role = task.project_id ? await getUserProjectRole(task.project_id, userId) : null
  const isCreator = task.created_by === userId
  const canManageAny = hasProjectPermission(role, mode === 'delete' ? 'task.delete.any' : 'task.manage.any')
  const canManageOwn =
    hasProjectPermission(role, mode === 'delete' ? 'task.delete.own' : 'task.manage.own') &&
    (mode === 'delete' ? isCreator : task.assigned_to === userId || (isCreator && !task.assigned_to))
  const canTakeUnassignedTask =
    mode === 'update' &&
    !task.assigned_to &&
    hasProjectPermission(role, 'task.assign')

  if (!canManageAny && !canManageOwn && !canTakeUnassignedTask) {
    throw permissionDenied(
      mode === 'delete'
        ? 'Permission denied: you cannot delete this task'
        : 'Permission denied: you cannot update this task',
    )
  }
}

export async function getTaskProjectId(taskId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', taskId)
    .maybeSingle()

  if (error) {
    throw databaseError(error.message, error)
  }

  return data?.project_id ?? null
}

export async function assertTaskDependencyValid(projectId: string, taskId: string | null, blockedByTaskId: string | null | undefined) {
  if (!blockedByTaskId) {
    return null
  }

  if (taskId && blockedByTaskId === taskId) {
    throw validationError('Task cannot be blocked by itself')
  }

  const { data: blockerTask, error: blockerTaskError } = await supabase
    .from('tasks')
    .select('id,project_id,status')
    .eq('id', blockedByTaskId)
    .maybeSingle()

  if (blockerTaskError) {
    throw databaseError(blockerTaskError.message, blockerTaskError)
  }

  if (!blockerTask) {
    throw notFound('Blocked-by task was not found')
  }

  if (blockerTask.project_id !== projectId) {
    throw permissionDenied('Blocked-by task must belong to the same project')
  }

  return blockerTask
}