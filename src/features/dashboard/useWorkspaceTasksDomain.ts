import { useState, useEffect, useRef } from 'react'
import {
  getProjectMembers,
  getProjectTasksPage,
  type ProjectMemberListItem,
  type TaskPreview,
} from '../../lib/pm'
import { useTaskActions } from './useTaskActions'
import { useMemberActions } from './useMemberActions'

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
  const [tasksTotalCount, setTasksTotalCount] = useState(0)
  const [tasksPage, setTasksPage] = useState(0)

  const hasMoreTasks = tasks.length < tasksTotalCount

  // Stable ref so callbacks inside task/member actions always see the latest deps
  const depsRef = useRef(deps)
  depsRef.current = deps

  // Reload tasks + members for a given project (page 0), then notify projects domain
  const reloadTasksAndMembers = async (projectId: string) => {
    const [{ data: nextTasks, totalCount }, nextMembers] = await Promise.all([
      getProjectTasksPage(projectId, 0),
      getProjectMembers(projectId),
    ])
    setTasks(nextTasks)
    setProjectMembers(nextMembers)
    setTasksTotalCount(totalCount)
    setTasksPage(0)
    await depsRef.current.refreshAfterTaskChange(projectId, nextTasks)
  }

  // Load the next page of tasks (appended to existing)
  const loadMoreTasks = async () => {
    if (!deps.selectedProjectId || !hasMoreTasks || isTasksLoading) return
    const nextPage = tasksPage + 1
    setIsTasksLoading(true)
    try {
      const { data: moreTasks } = await getProjectTasksPage(deps.selectedProjectId, nextPage)
      setTasks((prev) => [...prev, ...moreTasks])
      setTasksPage(nextPage)
    } catch (error) {
      depsRef.current.setStatus(
        error instanceof Error ? `Error loading more tasks: ${error.message}` : 'Unknown error',
      )
    }
    setIsTasksLoading(false)
  }

  // Reactive load: whenever selected project changes, load its first page of tasks + members
  useEffect(() => {
    if (!deps.selectedProjectId) {
      setTasks([])
      setProjectMembers([])
      setTasksTotalCount(0)
      setTasksPage(0)
      return
    }

    let cancelled = false

    const load = async () => {
      setIsTasksLoading(true)
      try {
        const [{ data: nextTasks, totalCount }, nextMembers] = await Promise.all([
          getProjectTasksPage(deps.selectedProjectId!, 0),
          getProjectMembers(deps.selectedProjectId!),
        ])
        if (!cancelled) {
          setTasks(nextTasks)
          setProjectMembers(nextMembers)
          setTasksTotalCount(totalCount)
          setTasksPage(0)
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

  const { addTask, editTask, removeTask } = useTaskActions({
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
  } = useMemberActions({
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
    tasksTotalCount,
    hasMoreTasks,
    loadMoreTasks,
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
