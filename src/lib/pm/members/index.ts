import { supabase } from '../../supabase'
import type {
  AddProjectMemberInput,
  InviteProjectMemberByEmailInput,
  ProjectMemberListItem,
  RemoveProjectMemberInput,
  UpdateProjectMemberRoleInput,
} from '../types'
import { assertProjectEditable } from '../helpers'

export async function getProjectMembers(projectId: string) {
  const { data, error } = await supabase.rpc('get_project_members_with_profile', {
    p_project_id: projectId,
  })

  if (error) {
    // If access is denied (e.g., project being deleted), return empty array instead of throwing
    if (error.message.includes('Access denied') || error.message.includes('denied')) {
      console.warn(`Access denied to project members list for project ${projectId}:`, error.message)
      return []
    }
    throw new Error(error.message)
  }

  return data satisfies ProjectMemberListItem[]
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