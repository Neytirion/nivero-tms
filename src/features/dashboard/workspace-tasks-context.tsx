import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { useWorkspaceTasksDomain } from './useWorkspaceTasksDomain'
import { useWorkspaceCore } from './workspace-context.tsx'

export type WorkspaceTasksState = ReturnType<typeof useWorkspaceTasksDomain>

type GlobalWorkspaceTasksContextStore = typeof globalThis & {
  __niveroWorkspaceTasksContext?: ReturnType<typeof createContext<WorkspaceTasksState | null>>
}

const globalWorkspaceTasksStore = globalThis as GlobalWorkspaceTasksContextStore

const WorkspaceTasksContext = globalWorkspaceTasksStore.__niveroWorkspaceTasksContext
  ?? createContext<WorkspaceTasksState | null>(null)

if (!globalWorkspaceTasksStore.__niveroWorkspaceTasksContext) {
  globalWorkspaceTasksStore.__niveroWorkspaceTasksContext = WorkspaceTasksContext
}

interface WorkspaceTasksProviderProps {
  children: ReactNode
}

export function WorkspaceTasksProvider({ children }: WorkspaceTasksProviderProps) {
  const {
    selectedProjectId,
    currentUserId,
    setStatus,
    setIsLoading,
    ensureProjectEditable,
    canAssignTasksInProject,
    canManageTask,
    canDeleteTask,
    canInviteToProject,
    canUpdateProjectMemberRoles,
    canRemoveProjectMembers,
    refreshAfterTaskChange,
  } = useWorkspaceCore()

  const tasksDomain = useWorkspaceTasksDomain({
    selectedProjectId,
    currentUserId,
    setStatus,
    setIsLoading,
    ensureProjectEditable,
    canAssignTasksInProject,
    canManageTask,
    canDeleteTask,
    canInviteToProject,
    canUpdateProjectMemberRoles,
    canRemoveProjectMembers,
    refreshAfterTaskChange,
  })

  return (
    <WorkspaceTasksContext.Provider value={tasksDomain}>
      {children}
    </WorkspaceTasksContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspaceTasks() {
  const context = useContext(WorkspaceTasksContext)

  if (!context) {
    throw new Error('useWorkspaceTasks must be used inside WorkspaceTasksProvider')
  }

  return context
}
