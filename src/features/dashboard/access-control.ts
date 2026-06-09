import {
  hasProjectPermission,
  resolveProjectRole,
  type ProjectRoleName,
} from '../../shared/utils/permissions'
import type { ProjectPreview, TaskPreview } from '../../lib/pm'

interface AccessControlInput {
  projects: ProjectPreview[]
  currentUserId: string | null
  membershipRoleByProjectId: Record<string, ProjectRoleName>
}

export function createAccessControl(input: AccessControlInput) {
  const isProjectCompleted = (projectId: string | null | undefined) => {
    if (!projectId) {
      return false
    }

    const project = input.projects.find((item) => item.id === projectId)
    return (project?.status ?? '').toLowerCase() === 'completed'
  }

  const getProjectRole = (projectId: string) => {
    const project = input.projects.find((item) => item.id === projectId)
    if (!project) {
      return null
    }

    return resolveProjectRole({
      currentUserId: input.currentUserId,
      ownerId: project.owner_id,
      membershipRole: input.membershipRoleByProjectId[projectId] ?? null,
    })
  }

  const canManageProject = (projectId: string) => {
    const role = getProjectRole(projectId)
    return hasProjectPermission(role, 'project.manage') && !isProjectCompleted(projectId)
  }

  const canDeleteProject = (projectId: string) => {
    const role = getProjectRole(projectId)

    if (isProjectCompleted(projectId)) {
      return role === 'owner'
    }

    return hasProjectPermission(role, 'project.delete')
  }

  const canAssignTasksInProject = (projectId: string) => {
    const role = getProjectRole(projectId)
    return !isProjectCompleted(projectId) && hasProjectPermission(role, 'task.assign')
  }

  const canInviteToProject = (projectId: string) => {
    const role = getProjectRole(projectId)
    return !isProjectCompleted(projectId) && hasProjectPermission(role, 'project.invite')
  }

  const canUpdateProjectMemberRoles = (projectId: string) => {
    const role = getProjectRole(projectId)
    return !isProjectCompleted(projectId) && hasProjectPermission(role, 'member.role.update')
  }

  const canRemoveProjectMembers = (projectId: string) => {
    const role = getProjectRole(projectId)
    return !isProjectCompleted(projectId) && hasProjectPermission(role, 'member.remove')
  }

  const canManageTask = (task: TaskPreview) => {
    if (!input.currentUserId) {
      return false
    }

    const isCreator = task.created_by === input.currentUserId
    const isAssignee = task.assigned_to === input.currentUserId
    const isUnassigned = !task.assigned_to
    const role = task.project_id ? getProjectRole(task.project_id) : null
    const isReadOnlyProject = isProjectCompleted(task.project_id)
    const canManageAnyTask = hasProjectPermission(role, 'task.manage.any')
    const canManageOwnTask =
      hasProjectPermission(role, 'task.manage.own') && (isAssignee || (isCreator && isUnassigned))

    return !isReadOnlyProject && (canManageAnyTask || canManageOwnTask)
  }

  const canDeleteTask = (task: TaskPreview) => {
    if (!input.currentUserId) {
      return false
    }

    const isCreator = task.created_by === input.currentUserId
    const isAssignee = task.assigned_to === input.currentUserId
    const isUnassigned = !task.assigned_to
    const role = task.project_id ? getProjectRole(task.project_id) : null
    const isReadOnlyProject = isProjectCompleted(task.project_id)
    const canDeleteAnyTask = hasProjectPermission(role, 'task.delete.any')
    const canDeleteOwnTask =
      hasProjectPermission(role, 'task.delete.own') && (isAssignee || (isCreator && isUnassigned))

    return !isReadOnlyProject && (canDeleteAnyTask || canDeleteOwnTask)
  }

  return {
    isProjectCompleted,
    getProjectRole,
    canManageProject,
    canDeleteProject,
    canAssignTasksInProject,
    canInviteToProject,
    canUpdateProjectMemberRoles,
    canRemoveProjectMembers,
    canManageTask,
    canDeleteTask,
  }
}
