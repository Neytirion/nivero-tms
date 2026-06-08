import { supabase } from './supabase'
import type { CreateProjectInput, ProjectMemberPreview, ProjectPreview, TaskPreview, UpdateProjectInput } from './pm.types'
import { assertProjectEditable } from './pm.helpers'
import { isTaskClosedStatus } from '../shared/utils/task-status.ts'

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

export async function updateProject(projectId: string, patch: UpdateProjectInput) {
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