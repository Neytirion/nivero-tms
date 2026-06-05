import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import { useWorkspace } from '../features/dashboard/workspace-context.tsx'
import { createProjectPreview, createTaskPreview, createWorkspaceState } from '../test/workspace-factory'

vi.mock('../features/dashboard/workspace-context.tsx', () => ({
  useWorkspace: vi.fn(),
}))

const mockUseWorkspace = vi.mocked(useWorkspace)

describe('DashboardPage', () => {
  beforeEach(() => {
    mockUseWorkspace.mockReturnValue(createWorkspaceState({
      projects: [
        createProjectPreview({
          id: 'p1',
          name: 'Apollo',
          status: 'active',
          estimated_hours: 100,
          actual_hours: 120,
          progress_percent: 80,
          risk_status: 'red',
        }),
        createProjectPreview({
          id: 'p2',
          name: 'Hermes',
          status: 'completed',
          estimated_hours: 20,
          actual_hours: 20,
          progress_percent: 100,
          risk_status: 'green',
        }),
      ],
      tasks: [
        createTaskPreview({
          id: 't1',
          title: 'Implement API',
          status: 'in_progress',
          priority: 'high',
          assigned_to: 'u1',
          actual_hours: 5,
          project_id: 'p1',
        }),
        createTaskPreview({
          id: 't2',
          title: 'Write docs',
          status: 'done',
          priority: 'low',
          assigned_to: 'u1',
          actual_hours: 2,
          project_id: 'p1',
        }),
      ],
      selectedProjectId: 'p1',
      currentUserId: 'u1',
    }))
  })

  it('renders portfolio summary cards and project health', () => {
    render(<DashboardPage />)

    expect(screen.getByText('Portfolio Overview')).toBeTruthy()
    expect(screen.getByText('Active Projects')).toBeTruthy()
    expect(screen.getByText('Total Tasks')).toBeTruthy()
    expect(screen.getByText('Logged Hours')).toBeTruthy()
    expect(screen.getByText('Apollo')).toBeTruthy()
    expect(screen.getByText('Risk: Red')).toBeTruthy()
    expect(screen.getByText('80% · Hours: 120 / 100')).toBeTruthy()
  })

  it('shows only open tasks assigned to current user in My Tasks', () => {
    render(<DashboardPage />)

    expect(screen.getByText('My Tasks')).toBeTruthy()
    expect(screen.getByText(/Implement API/)).toBeTruthy()
    expect(screen.queryByText(/Write docs/)).toBeNull()
    expect(screen.getByText('Current project: Apollo')).toBeTruthy()
  })
})
