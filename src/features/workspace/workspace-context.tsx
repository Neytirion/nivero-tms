import { createContext, useContext, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useDashboardPreview } from '../dashboard/hooks/useDashboardPreview'
import { WorkspaceTasksProvider, useWorkspaceTasks } from './workspace-tasks-context'

/** Core workspace state: projects, auth, permissions, project CRUD */
export type WorkspaceCoreState = ReturnType<typeof useDashboardPreview>

/** Combined workspace state: core + tasks domain (backward-compatible) */
export type WorkspaceState = WorkspaceCoreState & ReturnType<typeof useWorkspaceTasks>

type GlobalWorkspaceCoreContextStore = typeof globalThis & {
  __niveroWorkspaceCoreContext?: ReturnType<typeof createContext<WorkspaceCoreState | null>>
}

const globalWorkspaceCoreStore = globalThis as GlobalWorkspaceCoreContextStore

const WorkspaceCoreContext = globalWorkspaceCoreStore.__niveroWorkspaceCoreContext
  ?? createContext<WorkspaceCoreState | null>(null)

if (!globalWorkspaceCoreStore.__niveroWorkspaceCoreContext) {
  globalWorkspaceCoreStore.__niveroWorkspaceCoreContext = WorkspaceCoreContext
}

interface WorkspaceProviderProps {
  children: ReactNode
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const workspace = useDashboardPreview()

  useEffect(() => {
    void workspace.loadDashboardPreview()
    // Intentionally run only once to bootstrap workspace data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <WorkspaceCoreContext.Provider value={workspace}>
      <WorkspaceTasksProvider>
        {children}
      </WorkspaceTasksProvider>
    </WorkspaceCoreContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspaceCore() {
  const context = useContext(WorkspaceCoreContext)

  if (!context) {
    throw new Error('useWorkspaceCore must be used inside WorkspaceProvider')
  }

  return context
}

/**
 * Backward-compatible hook that merges both workspace contexts.
 * Prefer useWorkspaceCore() or useWorkspaceTasks() in new code for
 * more granular subscriptions and fewer re-renders.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace(): WorkspaceState {
  const core = useWorkspaceCore()
  const tasks = useWorkspaceTasks()

  return {
    ...core,
    ...tasks,
    // Merge loading: either domain loading counts as global loading
    isLoading: core.isLoading || tasks.isTasksLoading,
  }
}

