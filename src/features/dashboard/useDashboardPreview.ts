import { useState } from 'react'
import {
  normalizeProjectRole,
  type ProjectRoleName,
} from '../../shared/utils/permissions'
import { createAccessControl } from './access-control'
import { createMemberActions } from './member-actions'
import { createProjectActions } from './project-actions'
import { createProjectSyncActions } from './project-sync'
import { createTaskActions } from './task-actions'
import {
  getMyProjectMemberships,
  getMyProjects,
  type ProjectMemberListItem,
  type ProjectPreview,
  type TaskPreview,
} from '../../lib/pm'
import { supabase } from '../../lib/supabase'

export function useDashboardPreview() {
  const [status, setStatus] = useState('Click the button to load dashboard data')
  const [isLoading, setIsLoading] = useState(false)
  const [projects, setProjects] = useState<ProjectPreview[]>([])
  const [tasks, setTasks] = useState<TaskPreview[]>([])
  const [projectMembers, setProjectMembers] = useState<ProjectMemberListItem[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [membershipRoleByProjectId, setMembershipRoleByProjectId] = useState<Record<string, ProjectRoleName>>({})

  const {
    applyProjectMetricsFromTasks,
    hydrateProjectsWithTaskMetrics,
    loadTasksByProject,
    reloadProjectsOnly,
    refreshProjectSnapshot,
  } = createProjectSyncActions({
    setProjects,
    setTasks,
    setProjectMembers,
    setSelectedProjectId,
  })

  const accessControl = createAccessControl({
    projects,
    currentUserId,
    membershipRoleByProjectId,
  })

  const {
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
  } = accessControl

  const ensureProjectEditable = (projectId: string | null | undefined, action: string) => {
    if (isProjectCompleted(projectId)) {
      setStatus(`Cannot ${action}: project is completed and read-only`)
      return false
    }

    return true
  }

  const {
    inviteMemberToSelectedProjectByEmail,
    changeSelectedProjectMemberRole,
    getSelectedProjectMemberUnfinishedTasksCount,
    removeSelectedProjectMember,
  } = createMemberActions({
    selectedProjectId,
    currentUserId,
    projectMembers,
    setStatus,
    setIsLoading,
    setProjectMembers,
    setTasks,
    ensureProjectEditable,
    canInviteToProject,
    canUpdateProjectMemberRoles,
    canRemoveProjectMembers,
    applyProjectMetricsFromTasks,
    reloadProjectsOnly,
  })

  const {
    addProject,
    editProject,
    removeProject,
    completeSelectedProject,
  } = createProjectActions({
    projects,
    selectedProjectId,
    setStatus,
    setIsLoading,
    setProjects,
    setTasks,
    setSelectedProjectId,
    setProjectMembers,
    ensureProjectEditable,
    canManageProject,
    canDeleteProject,
    isProjectCompleted,
    loadTasksByProject,
  })

  const {
    addTask,
    editTask,
    removeTask,
  } = createTaskActions({
    selectedProjectId,
    tasks,
    setStatus,
    setIsLoading,
    setTasks,
    ensureProjectEditable,
    canAssignTasksInProject,
    canManageTask,
    canDeleteTask,
    refreshProjectSnapshot,
    reloadProjectsOnly,
  })

  const loadDashboardPreview = async () => {
    setIsLoading(true)
    setStatus('Loading projects and tasks...')

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) {
        throw authError
      }

      setCurrentUserId(authData.user?.id ?? null)

      const memberships = await getMyProjectMemberships()
      setMembershipRoleByProjectId(
        memberships.reduce<Record<string, ProjectRoleName>>((acc: Record<string, ProjectRoleName>, membership) => {
          if (membership.project_id) {
            acc[membership.project_id] = normalizeProjectRole(membership.role)
          }
          return acc
        }, {}),
      )

      const nextProjects = await getMyProjects()
      const nextProjectsWithMetrics = await hydrateProjectsWithTaskMetrics(nextProjects)
      setProjects(nextProjectsWithMetrics)

      if (nextProjectsWithMetrics.length === 0) {
        setTasks([])
        setProjectMembers([])
        setSelectedProjectId(null)
        setStatus('No projects found. Create your first project in the database.')
        setIsLoading(false)
        return
      }

      const targetProjectId =
        selectedProjectId && nextProjectsWithMetrics.some((project) => project.id === selectedProjectId)
          ? selectedProjectId
          : nextProjectsWithMetrics[0].id

      const nextTasks = await loadTasksByProject(targetProjectId)

      setStatus(
        `Loaded: ${nextProjectsWithMetrics.length} project(s), ${nextTasks.length} task(s) in selected project`,
      )
    } catch (error) {
      setStatus(error instanceof Error ? `Error: ${error.message}` : 'Unknown error')
      setProjects([])
      setTasks([])
      setProjectMembers([])
      setSelectedProjectId(null)
      setMembershipRoleByProjectId({})
    }

    setIsLoading(false)
  }

  const selectProject = async (projectId: string) => {
    setIsLoading(true)

    try {
      const nextTasks = await loadTasksByProject(projectId)
      setStatus(`Loaded ${nextTasks.length} task(s) for selected project`)
    } catch (error) {
      setStatus(error instanceof Error ? `Error: ${error.message}` : 'Unknown error')
    }

    setIsLoading(false)
  }
  const resetDashboardPreview = () => {
    setProjects([])
    setTasks([])
    setProjectMembers([])
    setSelectedProjectId(null)
    setStatus('Click the button to load dashboard data')
  }

  return {
    status,
    setStatus,
    isLoading,
    projects,
    tasks,
    projectMembers,
    selectedProjectId,
    currentUserId,
    getProjectRole,
    canManageProject,
    canDeleteProject,
    canAssignTasksInProject,
    canInviteToProject,
    canUpdateProjectMemberRoles,
    canRemoveProjectMembers,
    loadDashboardPreview,
    selectProject,
    addProject,
    editProject,
    removeProject,
    addTask,
    editTask,
    removeTask,
    inviteMemberToSelectedProjectByEmail,
    changeSelectedProjectMemberRole,
    getSelectedProjectMemberUnfinishedTasksCount,
    removeSelectedProjectMember,
    completeSelectedProject,
    canManageTask,
    canDeleteTask,
    resetDashboardPreview,
  }
}
