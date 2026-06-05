import { createContext, useContext, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useDashboardPreview } from './useDashboardPreview'

export type WorkspaceState = ReturnType<typeof useDashboardPreview>

const WorkspaceContext = createContext<WorkspaceState | null>(null)

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

  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace() {
  const context = useContext(WorkspaceContext)

  if (!context) {
    throw new Error('useWorkspace must be used inside WorkspaceProvider')
  }

  return context
}
