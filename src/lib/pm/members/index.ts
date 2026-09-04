import { supabase } from '../../supabase'
import type {
  AddProjectMemberInput,
  CreateProjectDisplayRoleInput,
  DeleteProjectDisplayRoleInput,
  InvitableUserProfile,
  InviteProjectMemberByEmailInput,
  ProjectDisplayRolePreview,
  ProjectMemberListItem,
  ProjectMemberDisplayRolePreview,
  RemoveProjectMemberInput,
  SetProjectMemberDisplayRoleInput,
  UpdateProjectMemberRoleInput,
} from '../types'
import { assertProjectEditable } from '../helpers'
import { databaseError, validationError } from '../../errors'

export async function getProjectMembers(projectId: string) {
  const { data, error } = await supabase.rpc('get_project_members_with_profile', {
    p_project_id: projectId,
  })

  if (error) {
    // If access is denied (e.g., project being deleted), return empty array instead of throwing
    if (error.message.includes('Access denied') || error.message.includes('denied')) {
      if (import.meta.env.DEV) {
        console.debug(`[getProjectMembers] Access denied for project ${projectId}. Returning empty array.`)
      }
      return []
    }
    throw databaseError(error.message, error)
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

export async function getUserProfileByEmail(email: string): Promise<InvitableUserProfile | null> {
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail) {
    return null
  }

  const { data, error } = await supabase.rpc('get_user_profile_by_email', {
    p_email: normalizedEmail,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data?.[0] ?? null
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

export async function getProjectDisplayRoles(projectId: string): Promise<ProjectDisplayRolePreview[]> {
  const { data, error } = await supabase
    .from('project_display_roles')
    .select('id,project_id,name,created_by,created_at,updated_at')
    .eq('project_id', projectId)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies ProjectDisplayRolePreview[]
}

export async function getProjectMemberDisplayRoles(
  projectId: string,
): Promise<ProjectMemberDisplayRolePreview[]> {
  const { data, error } = await supabase
    .from('project_member_display_roles')
    .select('project_id,user_id,display_role,created_at,updated_at')
    .eq('project_id', projectId)

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies ProjectMemberDisplayRolePreview[]
}

export async function createProjectDisplayRole(input: CreateProjectDisplayRoleInput) {
  await assertProjectEditable(input.projectId, 'create display role')

  const normalizedName = input.name.trim()
  if (!normalizedName) {
    throw validationError('Display role name is required')
  }

  const { data, error } = await supabase
    .from('project_display_roles')
    .insert({
      project_id: input.projectId,
      name: normalizedName,
    })
    .select('id,project_id,name,created_by,created_at,updated_at')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies ProjectDisplayRolePreview
}

export async function deleteProjectDisplayRole(input: DeleteProjectDisplayRoleInput) {
  await assertProjectEditable(input.projectId, 'delete display role')

  const { error: deleteRoleError } = await supabase
    .from('project_display_roles')
    .delete()
    .eq('project_id', input.projectId)
    .eq('id', input.roleId)

  if (deleteRoleError) {
    throw new Error(deleteRoleError.message)
  }

  const { error: cleanupError } = await supabase
    .from('project_member_display_roles')
    .delete()
    .eq('project_id', input.projectId)
    .ilike('display_role', input.roleName)

  if (cleanupError) {
    throw new Error(cleanupError.message)
  }
}

export async function setProjectMemberDisplayRole(input: SetProjectMemberDisplayRoleInput) {
  await assertProjectEditable(input.projectId, 'set member display role')

  const normalizedRole = input.displayRole.trim()
  if (!normalizedRole) {
    throw validationError('Display role is required')
  }

  const { error } = await supabase
    .from('project_member_display_roles')
    .upsert(
      {
        project_id: input.projectId,
        user_id: input.userId,
        display_role: normalizedRole,
      },
      { onConflict: 'project_id,user_id' },
    )

  if (error) {
    throw new Error(error.message)
  }
}

export async function clearProjectMemberDisplayRole(projectId: string, userId: string) {
  await assertProjectEditable(projectId, 'clear member display role')

  const { error } = await supabase
    .from('project_member_display_roles')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }
}