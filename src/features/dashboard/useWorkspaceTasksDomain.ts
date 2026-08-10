import { useState, useEffect, useRef } from 'react'
import { getProjectMembers, getProjectTasks, type ProjectMemberListItem, type TaskPreview } from '../../lib/pm'
import { createTaskActions } from './task-actions'
import { createMemberActions } from './member-actions'

export interface WorkspaceTasksDeps {
  selectedProjectId: string | null
  currentUserId: string | null
  setStatus: (value: string | ((prev: string) => string)) => void
  setIsLoading: (value: boolean | ((prev: boolean) => boolean)) => void
  ensureProjectEditable: (projectId: string | null | undefined, action: string) => boolean
  canAssignTasksInProject: (projectId: string) => boolean
  canManageTask: (task: TaskPreview) => boolean
  canDeleteTask: (task: TaskPreview) => boolean
  canInviteToProject: (projectId: string) => boolean
  canUpdateProjectMemberRoles: (projectId: string) => boolean
  canRemoveProjectMembers: (projectId: string) => boolean
  /** Called by tasks domain after any mutation to refresh project-level metrics */
  refreshAfterTaskChange: (projectId: string, tasks: TaskPreview[]) => Promise<void>
}

export function useWorkspaceTasksDomain(deps: WorkspaceTasksDeps) {
  const [tasks, setTasks] = useState<TaskPreview[]>([])
  const [projectMembers, setProjectMembers] = useState<ProjectMemberListItem[]>([])
  const [isTasksLoading, setIsTasksLoading] = useState(false)

  // Stable ref so callbacks inside task/member actions always see the latest deps
  const depsRef = useRef(deps)
  depsRef.current = deps

  // Reload tasks + members for a given project, then notify projects domain
  const reloadTasksAndMembers = async (projectId: string) => {
    const [nextTasks, nextMembers] = await Promise.all([
      getProjectTasks(projectId),
      getProjectMembers(projectId),
    ])
    setTasks(nextTasks)
    setProjectMembers(nextMembers)
    await depsRef.current.refreshAfterTaskChange(projectId, nextTasks)
  }

  // Reactive load: whenever selected project changes, load its tasks + members
  useEffect(() => {
    if (!deps.selectedProjectId) {
      setTasks([])
      setProjectMembers([])
      return
    }

    let cancelled = false

    const load = async () => {
      setIsTasksLoading(true)
      try {
        const [nextTasks, nextMembers] = await Promise.all([
          getProjectTasks(deps.selectedProjectId!),
          getProjectMembers(deps.selectedProjectId!),
        ])
        if (!cancelled) {
          setTasks(nextTasks)
          setProjectMembers(nextMembers)
        }
      } catch (error) {
        if (!cancelled) {
          depsRef.current.setStatus(
            error instanceof Error ? `Error loading tasks: ${error.message}` : 'Unknown error',
          )
        }
      }
      if (!cancelled) {
        setIsTasksLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps.selectedProjectId])

  const { addTask, editTask, removeTask } = createTaskActions({
    selectedProjectId: deps.selectedProjectId,
    tasks,
    setStatus: deps.setStatus,
    setIsLoading: deps.setIsLoading,
    ensureProjectEditable: deps.ensureProjectEditable,
    canAssignTasksInProject: deps.canAssignTasksInProject,
    canManageTask: deps.canManageTask,
    canDeleteTask: deps.canDeleteTask,
    reloadTasksAndMembers,
  })

  const {
    inviteMemberToSelectedProjectByEmail,
    changeSelectedProjectMemberRole,
    getSelectedProjectMemberUnfinishedTasksCount,
    removeSelectedProjectMember,
  } = createMemberActions({
    selectedProjectId: deps.selectedProjectId,
    currentUserId: deps.currentUserId,
    projectMembers,
    setStatus: deps.setStatus,
    setIsLoading: deps.setIsLoading,
    setProjectMembers,
    ensureProjectEditable: deps.ensureProjectEditable,
    canInviteToProject: deps.canInviteToProject,
    canUpdateProjectMemberRoles: deps.canUpdateProjectMemberRoles,
    canRemoveProjectMembers: deps.canRemoveProjectMembers,
    reloadTasksAndMembers,
  })

  return {
    tasks,
    projectMembers,
    isTasksLoading,
    addTask,
    editTask,
    removeTask,
    inviteMemberToSelectedProjectByEmail,
    changeSelectedProjectMemberRole,
    getSelectedProjectMemberUnfinishedTasksCount,
    removeSelectedProjectMember,
    /** Force-reload tasks + members for the currently selected project */
    reloadCurrentTasks: async () => {
      if (depsRef.current.selectedProjectId) {
        await reloadTasksAndMembers(depsRef.current.selectedProjectId)
      }
    },
  }
}
