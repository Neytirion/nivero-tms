import type { Database } from './database.types'
import { supabase } from './supabase'
import { hasProjectPermission, resolveProjectRole } from '../shared/utils/permissions'
import { isExecutionTaskStatus, isTaskClosedStatus } from '../shared/utils/task-status.ts'

export type Project = Database['public']['Tables']['projects']['Row']
export type Estimate = Database['public']['Tables']['estimates']['Row']
export type WorkPackage = Database['public']['Tables']['work_packages']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type ProjectDocument = Database['public']['Tables']['project_documents']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type TimeEntry = Database['public']['Tables']['time_entries']['Row']
export type ProjectPreview = Pick<
  Project,
  | 'id'
  | 'name'
  | 'description'
  | 'owner_id'
  | 'customer_name'
  | 'project_manager_id'
  | 'start_date'
  | 'end_date'
  | 'estimated_hours'
  | 'actual_hours'
  | 'progress_percent'
  | 'risk_status'
  | 'status'
  | 'completed_at'
  | 'deadline_at'
  | 'created_at'
>
export type TaskPreview = Pick<
  Task,
  | 'id'
  | 'work_package_id'
  | 'title'
  | 'description'
  | 'status'
  | 'priority'
  | 'assigned_to'
  | 'created_by'
  | 'estimate_hours'
  | 'actual_hours'
  | 'blocked_by_task_id'
  | 'due_date'
  | 'project_id'
  | 'created_at'
>
export type ProjectMemberPreview = Pick<
  Database['public']['Tables']['project_members']['Row'],
  'project_id' | 'role'
>
export type ProjectMemberListItem = Pick<
  Database['public']['Functions']['get_project_members_with_profile']['Returns'][number],
  'member_id' | 'project_id' | 'user_id' | 'role' | 'joined_at' | 'full_name' | 'email'
>
export type TimeEntryPreview = Pick<
  TimeEntry,
  | 'id'
  | 'user_id'
  | 'project_id'
  | 'task_id'
  | 'entry_date'
  | 'minutes_spent'
  | 'is_billable'
  | 'category'
  | 'notes'
  | 'started_at'
  | 'ended_at'
  | 'created_at'
>
export type EstimatePreview = Pick<
  Estimate,
  'id' | 'project_id' | 'version_number' | 'status' | 'created_by' | 'approved_at' | 'created_at' | 'updated_at'
>
export type WorkPackagePreview = Pick<WorkPackage, 'id' | 'estimate_id' | 'name' | 'estimated_hours' | 'sort_order' | 'created_at'>
export type EstimateWithPackages = EstimatePreview & {
  work_packages: WorkPackagePreview[]
}
export type CommentPreview = Pick<Comment, 'id' | 'project_id' | 'task_id' | 'user_id' | 'message' | 'created_at'>
export type ProjectDocumentPreview = Pick<
  ProjectDocument,
  'id' | 'project_id' | 'user_id' | 'file_url' | 'name' | 'mime_type' | 'size_bytes' | 'created_at'
>

interface CreateProjectInput {
  name: string
  customerName?: string
  startDate?: string
  endDate?: string
  estimatedHours?: number
}

interface CreateTaskInput {
  projectId: string
  workPackageId?: string
  title: string
  description?: string
  status?: string
  priority?: string
  assignedTo?: string
  estimateHours?: number
  actualHours?: number
  blockedByTaskId?: string
  dueDate?: string
}

interface AddProjectMemberInput {
  projectId: string
  userId: string
  role?: string
}

interface InviteProjectMemberByEmailInput {
  projectId: string
  email: string
  role?: string
}

interface UpdateProjectMemberRoleInput {
  projectId: string
  userId: string
  role: string
}

interface RemoveProjectMemberInput {
  projectId: string
  userId: string
  unassignUnfinishedTasks: boolean
}

interface CreateTimeEntryInput {
  projectId: string
  taskId?: string
  entryDate: string
  hoursSpent: number
  isBillable: boolean
  category: string
  notes?: string
}

interface GetTimeEntriesInput {
  projectId?: string
  fromDate?: string
  toDate?: string
}

interface SaveEstimateDraftInput {
  estimateId: string
  workPackages: Array<{
    name: string
    estimatedHours: number
  }>
}

interface UploadProjectDocumentInput {
  projectId: string
  file: File
}

async function getProjectStatusById(projectId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('status')
    .eq('id', projectId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return (data?.status ?? '').toLowerCase()
}

async function assertProjectEditable(projectId: string, action: string) {
  const projectStatus = await getProjectStatusById(projectId)

  if (projectStatus === 'completed') {
    throw new Error(`Cannot ${action}: project is completed and read-only`)
  }
}

async function canUserAssignTasksInProject(projectId: string, userId: string) {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .maybeSingle()

  if (projectError) {
    throw new Error(projectError.message)
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
    throw new Error(membershipError.message)
  }

  const role = resolveProjectRole({
    currentUserId: userId,
    ownerId: project.owner_id,
    membershipRole: membership?.role ?? null,
  })

  return hasProjectPermission(role, 'task.assign')
}

async function getUserProjectRole(projectId: string, userId: string) {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .maybeSingle()

  if (projectError) {
    throw new Error(projectError.message)
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
    throw new Error(membershipError.message)
  }

  return resolveProjectRole({
    currentUserId: userId,
    ownerId: project.owner_id,
    membershipRole: membership?.role ?? null,
  })
}

async function assertUserCanModifyTask(taskId: string, userId: string, mode: 'update' | 'delete') {
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('project_id,assigned_to,created_by')
    .eq('id', taskId)
    .maybeSingle()

  if (taskError) {
    throw new Error(taskError.message)
  }

  if (!task) {
    throw new Error('Task not found')
  }

  const role = task.project_id ? await getUserProjectRole(task.project_id, userId) : null
  const isCreatorOfUnassignedTask = task.created_by === userId && !task.assigned_to
  const canManageAny = hasProjectPermission(role, mode === 'delete' ? 'task.delete.any' : 'task.manage.any')
  const canManageOwn =
    hasProjectPermission(role, mode === 'delete' ? 'task.delete.own' : 'task.manage.own') &&
    (task.assigned_to === userId || isCreatorOfUnassignedTask)

  if (!canManageAny && !canManageOwn) {
    throw new Error(
      mode === 'delete'
        ? 'Permission denied: you cannot delete this task'
        : 'Permission denied: you cannot update this task',
    )
  }
}

async function getTaskProjectId(taskId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('id', taskId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data?.project_id ?? null
}

async function assertTaskDependencyValid(projectId: string, taskId: string | null, blockedByTaskId: string | null | undefined) {
  if (!blockedByTaskId) {
    return null
  }

  if (taskId && blockedByTaskId === taskId) {
    throw new Error('Task cannot be blocked by itself')
  }

  const { data: blockerTask, error: blockerTaskError } = await supabase
    .from('tasks')
    .select('id,project_id,status')
    .eq('id', blockedByTaskId)
    .maybeSingle()

  if (blockerTaskError) {
    throw new Error(blockerTaskError.message)
  }

  if (!blockerTask) {
    throw new Error('Blocked-by task was not found')
  }

  if (blockerTask.project_id !== projectId) {
    throw new Error('Blocked-by task must belong to the same project')
  }

  return blockerTask
}

export async function getMyProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select(
      'id,name,description,owner_id,customer_name,project_manager_id,start_date,end_date,estimated_hours,actual_hours,progress_percent,risk_status,status,completed_at,deadline_at,created_at',
    )
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies ProjectPreview[]
}

export async function getMyProjectMemberships() {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!userData.user) {
    throw new Error('User is not authenticated')
  }

  const { data, error } = await supabase
    .from('project_members')
    .select('project_id,role')
    .eq('user_id', userData.user.id)

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies ProjectMemberPreview[]
}

export async function getProjectTasks(projectId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('id,work_package_id,title,description,status,priority,assigned_to,created_by,estimate_hours,actual_hours,blocked_by_task_id,due_date,project_id,created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies TaskPreview[]
}

export async function getProjectMembers(projectId: string) {
  const { data, error } = await supabase.rpc('get_project_members_with_profile', {
    p_project_id: projectId,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies ProjectMemberListItem[]
}

export async function createProject(input: CreateProjectInput) {
  if (!input.startDate || !input.endDate) {
    throw new Error('Start date and end date are required')
  }

  if (input.endDate < input.startDate) {
    throw new Error('End date cannot be earlier than start date')
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!userData.user) {
    throw new Error('User is not authenticated')
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: input.name,
      customer_name: input.customerName ?? null,
      project_manager_id: userData.user.id,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      estimated_hours: input.estimatedHours ?? null,
      deadline_at: input.endDate ?? null,
      owner_id: userData.user.id,
    })
    .select(
      'id,name,description,owner_id,customer_name,project_manager_id,start_date,end_date,estimated_hours,actual_hours,progress_percent,risk_status,status,completed_at,deadline_at,created_at',
    )
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies ProjectPreview
}

export async function deleteProject(projectId: string) {
  const { data, error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .select('id')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Permission denied: only owner or admin can delete this project')
  }
}

export async function updateProject(
  projectId: string,
  patch: Pick<Database['public']['Tables']['projects']['Update'], 'name' | 'description' | 'deadline_at'>,
) {
  await assertProjectEditable(projectId, 'edit project')

  const { data, error } = await supabase
    .from('projects')
    .update({
      name: patch.name,
      description: patch.description ?? null,
      deadline_at: patch.deadline_at ?? null,
    })
    .eq('id', projectId)
    .select(
      'id,name,description,owner_id,customer_name,project_manager_id,start_date,end_date,estimated_hours,actual_hours,progress_percent,risk_status,status,completed_at,deadline_at,created_at',
    )
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Permission denied: only owner or admin can edit this project')
  }

  return data satisfies ProjectPreview
}

export async function completeProject(projectId: string) {
  await assertProjectEditable(projectId, 'complete project')

  const { data: projectTasks, error: tasksError } = await supabase
    .from('tasks')
    .select('status')
    .eq('project_id', projectId)

  if (tasksError) {
    throw new Error(tasksError.message)
  }

  const unfinishedTasks = (projectTasks ?? []).filter((task) => !isTaskClosedStatus(task.status)).length
  if (unfinishedTasks > 0) {
    throw new Error(`Cannot complete project: ${unfinishedTasks} unfinished task(s) remain`)
  }

  const { data, error } = await supabase
    .from('projects')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .select(
      'id,name,description,owner_id,customer_name,project_manager_id,start_date,end_date,estimated_hours,actual_hours,progress_percent,risk_status,status,completed_at,deadline_at,created_at',
    )
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Permission denied: only owner or admin can complete this project')
  }

  return data satisfies ProjectPreview
}

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
      work_package_id: input.workPackageId ?? null,
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

export async function updateTask(
  taskId: string,
  patch: Pick<
    Database['public']['Tables']['tasks']['Update'],
    | 'title'
    | 'description'
    | 'status'
    | 'priority'
    | 'assigned_to'
    | 'estimate_hours'
    | 'actual_hours'
    | 'blocked_by_task_id'
    | 'due_date'
    | 'work_package_id'
  >,
) {
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

export async function addProjectMember(input: AddProjectMemberInput) {
  await assertProjectEditable(input.projectId, 'add member')

  const { data, error } = await supabase
    .from('project_members')
    .insert({
      project_id: input.projectId,
      user_id: input.userId,
      role: input.role ?? 'member',
    })
    .select('id,project_id,user_id,role,created_at')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function inviteProjectMemberByEmail(input: InviteProjectMemberByEmailInput) {
  await assertProjectEditable(input.projectId, 'invite members')

  const preferredCall = await supabase.rpc('invite_project_member_by_email', {
    p_email: input.email,
    p_project_id: input.projectId,
    p_role: input.role ?? 'member',
  })

  if (!preferredCall.error) {
    return preferredCall.data
  }

  // Backward-compatible retry if DB still has an older 2-arg function version.
  if (preferredCall.error.message.includes('Could not find the function')) {
    const fallbackCall = await supabase.rpc('invite_project_member_by_email', {
      p_email: input.email,
      p_project_id: input.projectId,
    })

    if (!fallbackCall.error) {
      return fallbackCall.data
    }

    throw new Error(fallbackCall.error.message)
  }

  throw new Error(preferredCall.error.message)
}

export async function updateProjectMemberRole(input: UpdateProjectMemberRoleInput) {
  await assertProjectEditable(input.projectId, 'change member roles')

  const { error } = await supabase.rpc('update_project_member_role', {
    p_project_id: input.projectId,
    p_user_id: input.userId,
    p_role: input.role,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function getProjectMemberUnfinishedTasksCount(projectId: string, userId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('status')
    .eq('project_id', projectId)
    .eq('assigned_to', userId)

  if (error) {
    throw new Error(error.message)
  }

  const unfinishedTasks = (data ?? []).filter((task) => {
    const normalized = (task.status ?? '').toLowerCase()
    return normalized !== 'done' && normalized !== 'completed'
  })

  return unfinishedTasks.length
}

export async function removeProjectMember(input: RemoveProjectMemberInput) {
  await assertProjectEditable(input.projectId, 'remove project member')

  const rpcCall = await supabase.rpc('remove_project_member', {
    p_project_id: input.projectId,
    p_user_id: input.userId,
    p_unassign_unfinished_tasks: input.unassignUnfinishedTasks,
  })

  if (rpcCall.error) {
    throw new Error(rpcCall.error.message)
  }
}

export async function getTimeEntries(input: GetTimeEntriesInput = {}) {
  let query = supabase
    .from('time_entries')
    .select('id,user_id,project_id,task_id,entry_date,minutes_spent,is_billable,category,notes,started_at,ended_at,created_at')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (input.projectId) {
    query = query.eq('project_id', input.projectId)
  }

  if (input.fromDate) {
    query = query.gte('entry_date', input.fromDate)
  }

  if (input.toDate) {
    query = query.lte('entry_date', input.toDate)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies TimeEntryPreview[]
}

export async function createTimeEntry(input: CreateTimeEntryInput) {
  await assertProjectEditable(input.projectId, 'log time')

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!userData.user) {
    throw new Error('User is not authenticated')
  }

  const minutesSpent = Math.round(input.hoursSpent * 60)
  if (minutesSpent <= 0) {
    throw new Error('Hours spent must be greater than 0')
  }

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      user_id: userData.user.id,
      project_id: input.projectId,
      task_id: input.taskId ?? null,
      entry_date: input.entryDate,
      minutes_spent: minutesSpent,
      is_billable: input.isBillable,
      category: input.category,
      notes: input.notes?.trim() ? input.notes.trim() : null,
    })
    .select('id,user_id,project_id,task_id,entry_date,minutes_spent,is_billable,category,notes,started_at,ended_at,created_at')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies TimeEntryPreview
}

export async function getProjectEstimates(projectId: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!userData.user) {
    throw new Error('User is not authenticated')
  }

  const actorId = userData.user.id

  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .maybeSingle()

  if (projectError) {
    throw new Error(projectError.message)
  }

  const { data: membershipData, error: membershipError } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', actorId)
    .maybeSingle()

  if (membershipError) {
    throw new Error(membershipError.message)
  }

  const isOwner = projectData?.owner_id === actorId
  const isAdmin = (membershipData?.role ?? '').toLowerCase() === 'admin'
  const canViewDrafts = isOwner || isAdmin

  let estimatesQuery = supabase
    .from('estimates')
    .select('id,project_id,version_number,status,created_by,approved_at,created_at,updated_at')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false })

  if (!canViewDrafts) {
    estimatesQuery = estimatesQuery.eq('status', 'approved')
  }

  const { data: estimatesData, error: estimatesError } = await estimatesQuery

  if (estimatesError) {
    throw new Error(estimatesError.message)
  }

  const estimates = estimatesData satisfies EstimatePreview[]

  if (estimates.length === 0) {
    return [] as EstimateWithPackages[]
  }

  const estimateIds = estimates.map((estimate) => estimate.id)
  const { data: packagesData, error: packagesError } = await supabase
    .from('work_packages')
    .select('id,estimate_id,name,estimated_hours,sort_order,created_at')
    .in('estimate_id', estimateIds)
    .order('sort_order', { ascending: true })

  if (packagesError) {
    throw new Error(packagesError.message)
  }

  const packagesByEstimateId = (packagesData satisfies WorkPackagePreview[]).reduce<
    Record<string, WorkPackagePreview[]>
  >((acc, item) => {
    if (!acc[item.estimate_id]) {
      acc[item.estimate_id] = []
    }

    acc[item.estimate_id].push(item)
    return acc
  }, {})

  return estimates.map((estimate) => ({
    ...estimate,
    work_packages: packagesByEstimateId[estimate.id] ?? [],
  }))
}

export async function hasProjectEstimateVersion(projectId: string) {
  const { count, error } = await supabase
    .from('estimates')
    .select('id', { head: true, count: 'exact' })
    .eq('project_id', projectId)

  if (error) {
    throw new Error(error.message)
  }

  return (count ?? 0) > 0
}

export async function getProjectTaskWorkPackages(projectId: string) {
  const estimates = await getProjectEstimates(projectId)

  const preferredEstimate = estimates.find((item) => item.status === 'approved') ?? estimates[0] ?? null

  if (!preferredEstimate) {
    return [] as Array<Pick<WorkPackagePreview, 'id' | 'name' | 'estimated_hours'>>
  }

  return preferredEstimate.work_packages.map((item) => ({
    id: item.id,
    name: item.name,
    estimated_hours: item.estimated_hours,
  }))
}

export async function createEstimateVersion(projectId: string) {
  await assertProjectEditable(projectId, 'create estimate version')

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!userData.user) {
    throw new Error('User is not authenticated')
  }

  const estimates = await getProjectEstimates(projectId)
  const latest = estimates[0] ?? null
  const nextVersion = latest ? latest.version_number + 1 : 1

  const { data: estimateData, error: estimateError } = await supabase
    .from('estimates')
    .insert({
      project_id: projectId,
      version_number: nextVersion,
      status: 'draft',
      created_by: userData.user.id,
    })
    .select('id,project_id,version_number,status,created_by,approved_at,created_at,updated_at')
    .single()

  if (estimateError) {
    throw new Error(estimateError.message)
  }

  const createdEstimate = estimateData satisfies EstimatePreview

  if (latest && latest.work_packages.length > 0) {
    const clonedPackages = latest.work_packages.map((item, index) => ({
      estimate_id: createdEstimate.id,
      name: item.name,
      estimated_hours: item.estimated_hours,
      sort_order: index,
    }))

    const { error: cloneError } = await supabase.from('work_packages').insert(clonedPackages)

    if (cloneError) {
      throw new Error(cloneError.message)
    }
  }

  return createdEstimate
}

async function assertEstimateIsLatestDraft(estimateId: string, action: string) {
  const { data: estimate, error: estimateError } = await supabase
    .from('estimates')
    .select('id,project_id,version_number,status')
    .eq('id', estimateId)
    .maybeSingle()

  if (estimateError) {
    throw new Error(estimateError.message)
  }

  if (!estimate) {
    throw new Error('Estimate version not found')
  }

  await assertProjectEditable(estimate.project_id, action)

  const { data: latestEstimate, error: latestEstimateError } = await supabase
    .from('estimates')
    .select('version_number')
    .eq('project_id', estimate.project_id)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestEstimateError) {
    throw new Error(latestEstimateError.message)
  }

  if (latestEstimate && latestEstimate.version_number !== estimate.version_number) {
    throw new Error(`Cannot ${action}: previous estimate versions are read-only`)
  }

  if ((estimate.status ?? '').toLowerCase() !== 'draft') {
    throw new Error(`Cannot ${action}: only current draft version can be changed`)
  }

  return estimate
}

export async function saveEstimateDraft(input: SaveEstimateDraftInput) {
  await assertEstimateIsLatestDraft(input.estimateId, 'save estimate version')

  const sanitizedPackages = input.workPackages
    .map((item) => ({
      name: item.name.trim(),
      estimatedHours: Number(item.estimatedHours) || 0,
    }))
    .filter((item) => item.name.length > 0)

  const { error: deleteError } = await supabase
    .from('work_packages')
    .delete()
    .eq('estimate_id', input.estimateId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  if (sanitizedPackages.length > 0) {
    const payload = sanitizedPackages.map((item, index) => ({
      estimate_id: input.estimateId,
      name: item.name,
      estimated_hours: item.estimatedHours,
      sort_order: index,
    }))

    const { error: insertError } = await supabase.from('work_packages').insert(payload)

    if (insertError) {
      throw new Error(insertError.message)
    }
  }

  const { error: updateEstimateError } = await supabase
    .from('estimates')
    .update({ status: 'draft', updated_at: new Date().toISOString() })
    .eq('id', input.estimateId)

  if (updateEstimateError) {
    throw new Error(updateEstimateError.message)
  }
}

export async function approveEstimate(estimateId: string) {
  const targetEstimate = await assertEstimateIsLatestDraft(estimateId, 'approve estimate')

  const { error: approveError } = await supabase
    .from('estimates')
    .update({ status: 'approved', approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', estimateId)

  if (approveError) {
    throw new Error(approveError.message)
  }

  const { data: packagesData, error: packagesError } = await supabase
    .from('work_packages')
    .select('estimated_hours')
    .eq('estimate_id', estimateId)

  if (packagesError) {
    throw new Error(packagesError.message)
  }

  const nextEstimatedHours = (packagesData ?? []).reduce((sum, item) => sum + (item.estimated_hours ?? 0), 0)

  const { error: projectUpdateError } = await supabase
    .from('projects')
    .update({ estimated_hours: nextEstimatedHours })
    .eq('id', targetEstimate.project_id)

  if (projectUpdateError) {
    throw new Error(projectUpdateError.message)
  }
}

export async function getTaskComments(taskId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('id,project_id,task_id,user_id,message,created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies CommentPreview[]
}

export async function getTaskCommentsCount(taskId: string) {
  const { count, error } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('task_id', taskId)

  if (error) {
    throw new Error(error.message)
  }

  return count ?? 0
}

export async function createTaskComment(input: { projectId: string; taskId: string; message: string }) {
  await assertProjectEditable(input.projectId, 'create task comment')

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!userData.user) {
    throw new Error('User is not authenticated')
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      project_id: input.projectId,
      task_id: input.taskId,
      user_id: userData.user.id,
      message: input.message.trim(),
    })
    .select('id,project_id,task_id,user_id,message,created_at')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies CommentPreview
}

export async function getProjectDocuments(projectId: string) {
  const { data, error } = await supabase
    .from('project_documents')
    .select('id,project_id,user_id,file_url,name,mime_type,size_bytes,created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies ProjectDocumentPreview[]
}

export async function uploadProjectDocument(input: UploadProjectDocumentInput) {
  await assertProjectEditable(input.projectId, 'upload document')

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!userData.user) {
    throw new Error('User is not authenticated')
  }

  const extension = input.file.name.split('.').pop()?.toLowerCase() || 'bin'
  const filePath = `${input.projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('project-documents')
    .upload(filePath, input.file, { upsert: false, cacheControl: '3600' })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { data: publicUrlData } = supabase.storage.from('project-documents').getPublicUrl(filePath)

  const { data, error } = await supabase
    .from('project_documents')
    .insert({
      project_id: input.projectId,
      user_id: userData.user.id,
      file_url: publicUrlData.publicUrl,
      name: input.file.name,
      mime_type: input.file.type || null,
      size_bytes: input.file.size,
    })
    .select('id,project_id,user_id,file_url,name,mime_type,size_bytes,created_at')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies ProjectDocumentPreview
}
