import { useState } from 'react'
import { useProjectActions } from '../../projects/hooks/useProjectActions'
import { createProjectSyncActions } from '../utils/project-sync'
import { useAccessControl } from './useAccessControl'
import { useWorkspaceAuth } from '../../workspace/useWorkspaceAuth'
import { useToast } from '../../../shared/components'
import {
  getMyProjects,
  type ProjectPreview,
  type TaskPreview,
} from '../../../lib/pm'

/** Messages that represent transient loading state — not shown as toasts */
function isLoadingMessage(message: string) {
  return (
    message.startsWith('Loading') ||
    message.startsWith('Loaded') ||
    message.startsWith('Click') ||
    message.startsWith('No projects found')
  )
}

function classifyToastType(message: string): 'success' | 'error' {
  const lower = message.toLowerCase()
  if (
    lower.includes('error') ||
    lower.includes('permission denied') ||
    lower.includes('cannot ') ||
    lower.includes('user with this email') ||
    lower.includes('rls block')
  ) {
    return 'error'
  }
  return 'success'
}

export function useDashboardPreview() {
  const { showToast } = useToast()
  const [status, setStatusRaw] = useState('Click the button to load dashboard data')
  const [isLoading, setIsLoading] = useState(false)
  const [projects, setProjects] = useState<ProjectPreview[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  /** Wrapper: stores status for loading messages, fires toast for action results */
  const setStatus = (value: string | ((prev: string) => string)) => {
    const message = typeof value === 'function' ? value(status) : value
    setStatusRaw(message)
    if (!isLoadingMessage(message)) {
      showToast(message, classifyToastType(message))
    }
  }

  // Auth management - separated into its own hook
  const auth = useWorkspaceAuth()

  const {
    applyProjectMetricsFromTasks,
    hydrateProjectsWithTaskMetrics,
    reloadProjectsOnly,
  } = createProjectSyncActions({ setProjects })

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
    addProject,
    editProject,
    removeProject,
    completeSelectedProject,
  } = useProjectActions({
    projects,
    selectedProjectId,
    setStatus,
    setIsLoading,
    setProjects,
    setSelectedProjectId,
    ensureProjectEditable,
    canManageProject,
    canDeleteProject,
    isProjectCompleted,
  })

  /**
   * Called by WorkspaceTasksContext after any task mutation to keep project
   * metrics (progress_percent, actual_hours, risk_status) in sync.
   */
  const refreshAfterTaskChange = async (projectId: string, tasks: TaskPreview[]) => {
    applyProjectMetricsFromTasks(projectId, tasks)
    await reloadProjectsOnly()
    applyProjectMetricsFromTasks(projectId, tasks)
  }

  const loadDashboardPreview = async () => {
    setIsLoading(true)
    setStatus('Loading projects...')

    try {
      await auth.loadAuth()
      if (auth.error) {
        throw new Error(auth.error)
      }

      const nextProjects = await getMyProjects()
      const nextProjectsWithMetrics = await hydrateProjectsWithTaskMetrics(nextProjects)
      setProjects(nextProjectsWithMetrics)

      if (nextProjectsWithMetrics.length === 0) {
        setSelectedProjectId(null)
        setStatus('No projects found. Create your first project in the database.')
        setIsLoading(false)
        return
      }

      const targetProjectId =
        selectedProjectId && nextProjectsWithMetrics.some((project) => project.id === selectedProjectId)
          ? selectedProjectId
          : nextProjectsWithMetrics[0].id

      setSelectedProjectId(targetProjectId)
      setStatus(`Loaded ${nextProjectsWithMetrics.length} project(s)`)
    } catch (error) {
      setStatus(error instanceof Error ? `Error: ${error.message}` : 'Unknown error')
      setProjects([])
      setSelectedProjectId(null)
    }

    setIsLoading(false)
  }

  const selectProject = (projectId: string) => {
    // Tasks context reacts to selectedProjectId change and loads tasks automatically
    setSelectedProjectId(projectId)
  }

  const resetDashboardPreview = () => {
    setProjects([])
    setSelectedProjectId(null)
    setStatus('Click the button to load dashboard data')
  }

  return {
    status,
    setStatus,
    isLoading,
    setIsLoading,
    projects,
    selectedProjectId,
    currentUserId: auth.currentUserId,
    currentUserProfile: auth.currentUserProfile,
    getProjectRole,
    canManageProject,
    canDeleteProject,
    canAssignTasksInProject,
    canInviteToProject,
    canUpdateProjectMemberRoles,
    canRemoveProjectMembers,
    canManageTask,
    canDeleteTask,
    ensureProjectEditable,
    refreshAfterTaskChange,
    loadDashboardPreview,
    selectProject,
    addProject,
    editProject,
    removeProject,
    completeSelectedProject,
    resetDashboardPreview,
  }
}
