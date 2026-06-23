import { useState } from 'react'
import { createMemberActions } from './member-actions'
import { createProjectActions } from './project-actions'
import { createProjectSyncActions } from './project-sync'
import { createTaskActions } from './task-actions'
import { useAccessControl } from './useAccessControl'
import { useWorkspaceAuth } from './useWorkspaceAuth'
import {
  getMyProjects,
  type ProjectMemberListItem,
  type ProjectPreview,
  type TaskPreview,
} from '../../lib/pm'

export function useDashboardPreview() {
  const [status, setStatus] = useState('Click the button to load dashboard data')
  const [isLoading, setIsLoading] = useState(false)
  const [projects, setProjects] = useState<ProjectPreview[]>([])
  const [tasks, setTasks] = useState<TaskPreview[]>([])
  const [projectMembers, setProjectMembers] = useState<ProjectMemberListItem[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  // Auth management - separated into its own hook
  const auth = useWorkspaceAuth()

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

  // Access control - memoized permission checks
  const accessControl = useAccessControl({
    projects,
    currentUserId: auth.currentUserId,
    membershipRoleByProjectId: auth.membershipRoleByProjectId,
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
    currentUserId: auth.currentUserId,
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
      // Load auth data
      await auth.loadAuth()
      if (auth.error) {
        throw new Error(auth.error)
      }

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
    currentUserId: auth.currentUserId,
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
