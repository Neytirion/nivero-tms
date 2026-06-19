import type { ProjectMemberListItem, ProjectPreview, TaskPreview } from '../../lib/pm'
import { deriveRisk } from '../../features/projects/utils/project-metrics'
import {
  hasProjectPermission,
  normalizeProjectRole,
  type ProjectRoleName,
} from '../../shared/utils/permissions'

interface UseProjectsDerivedStateInput {
  selectedProject: ProjectPreview | null
  projects: ProjectPreview[]
  tasks: TaskPreview[]
  projectMembers: ProjectMemberListItem[]
  currentUserId: string | null
  getProjectRole: (projectId: string) => string | null
  canManageProject: (projectId: string) => boolean
  canDeleteProject: (projectId: string) => boolean
  canInviteToProject: (projectId: string) => boolean
}

function toProjectRoleName(role: string | null): ProjectRoleName | null {
  if (!role) {
    return null
  }

  if (role === 'owner' || role === 'admin' || role === 'manager' || role === 'member') {
    return role
  }

  return normalizeProjectRole(role)
}

export function useProjectsDerivedState({
  selectedProject,
  projects,
  tasks,
  projectMembers,
  currentUserId,
  getProjectRole,
  canManageProject,
  canDeleteProject,
  canInviteToProject,
}: UseProjectsDerivedStateInput) {
  const myRoleInSelectedProject = toProjectRoleName(
    selectedProject ? getProjectRole(selectedProject.id) : null,
  )
  const canEditSelectedProject = selectedProject ? canManageProject(selectedProject.id) : false
  const canDeleteSelectedProject = selectedProject ? canDeleteProject(selectedProject.id) : false
  const canInviteToSelectedProject = selectedProject
    ? canInviteToProject(selectedProject.id)
    : false
  const canManageMemberRoles = hasProjectPermission(myRoleInSelectedProject, 'member.role.update')
  const canAssignAdminRole =
    selectedProject?.owner_id != null && selectedProject.owner_id === currentUserId
  const canAssignManagerRole = myRoleInSelectedProject === 'owner' || myRoleInSelectedProject === 'admin'

  const totalProjects = projects.length
  const activeProjects = projects.filter(
    (project) => (project.status ?? '').toLowerCase() !== 'completed',
  ).length
  const completedProjects = projects.filter(
    (project) => (project.status ?? '').toLowerCase() === 'completed',
  ).length
  const riskProjects = projects.filter((project) => deriveRisk(project) === 'Red').length

  const teamMemberNames = projectMembers.map((member) => member.full_name ?? member.email ?? 'Unknown')
  const teamMemberNameByUserId = projectMembers.reduce<Record<string, string>>((acc, member) => {
    if (member.user_id) {
      acc[member.user_id] = member.full_name ?? member.email ?? member.user_id
    }
    return acc
  }, {})

  const projectManagerName = selectedProject?.project_manager_id
    ? teamMemberNameByUserId[selectedProject.project_manager_id] ?? 'Assigned'
    : 'Not set'

  const incompleteTaskCount = tasks.filter(
    (task) =>
      (task.status ?? '').toLowerCase() !== 'done' &&
      (task.status ?? '').toLowerCase() !== 'completed',
  ).length

  return {
    myRoleInSelectedProject,
    canEditSelectedProject,
    canDeleteSelectedProject,
    canInviteToSelectedProject,
    canManageMemberRoles,
    canAssignAdminRole,
    canAssignManagerRole,
    totalProjects,
    activeProjects,
    completedProjects,
    riskProjects,
    teamMemberNames,
    projectManagerName,
    incompleteTaskCount,
  }
}
