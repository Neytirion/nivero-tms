export type ProjectRoleName = 'owner' | 'admin' | 'member' | 'manager'

export type ProjectPermission =
  | 'project.manage'
  | 'project.delete'
  | 'project.invite'
  | 'project.complete'
  | 'member.role.update'
  | 'member.remove'
  | 'task.assign'
  | 'task.manage.any'
  | 'task.manage.own'
  | 'task.delete.any'
  | 'task.delete.own'

const ROLE_PERMISSIONS: Record<ProjectRoleName, readonly ProjectPermission[]> = {
  owner: [
    'project.manage',
    'project.delete',
    'project.invite',
    'project.complete',
    'member.role.update',
    'member.remove',
    'task.assign',
    'task.manage.any',
    'task.manage.own',
    'task.delete.any',
    'task.delete.own',
  ],
  admin: [
    'project.manage',
    'project.invite',
    'project.complete',
    'member.role.update',
    'member.remove',
    'task.assign',
    'task.manage.any',
    'task.manage.own',
    'task.delete.any',
    'task.delete.own',
  ],
  member: [
    'project.invite',
    'task.manage.own',
    'task.delete.own',
  ],
  manager: [
    'project.manage',
    'project.invite',
    'project.complete',
    'task.assign',
    'task.manage.any',
    'task.manage.own',
    'task.delete.any',
    'task.delete.own',
  ],
}

export function normalizeProjectRole(role: string | null | undefined): Exclude<ProjectRoleName, 'owner'> {
  const normalized = (role ?? '').toLowerCase()
  if (normalized === 'admin') {
    return 'admin'
  }
  if (normalized === 'manager') {
    return 'manager'
  }
  return 'member'
}

export function resolveProjectRole(input: {
  currentUserId: string | null | undefined
  ownerId: string | null | undefined
  membershipRole: string | null | undefined
}): ProjectRoleName | null {
  if (!input.currentUserId) {
    return null
  }

  if (input.ownerId && input.ownerId === input.currentUserId) {
    return 'owner'
  }

  if (!input.membershipRole) {
    return null
  }

  return normalizeProjectRole(input.membershipRole)
}

export function hasProjectPermission(
  role: ProjectRoleName | null | undefined,
  permission: ProjectPermission,
): boolean {
  if (!role) {
    return false
  }

  return ROLE_PERMISSIONS[role].includes(permission)
}
