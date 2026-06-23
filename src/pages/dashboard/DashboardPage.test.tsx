import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import { useWorkspace } from '../../features/dashboard/workspace-context.tsx'
import { getProjectTasks } from '../../lib/pm'
import { createProjectPreview, createTaskPreview, createWorkspaceState } from '../test-helpers'

vi.mock('../../features/dashboard/workspace-context.tsx', () => ({
  useWorkspace: vi.fn(),
}))

vi.mock('../../lib/pm', () => ({
  getProjectTasks: vi.fn(),
}))

const mockUseWorkspace = vi.mocked(useWorkspace)
const mockGetProjectTasks = vi.mocked(getProjectTasks)

describe('DashboardPage', () => {
  beforeEach(() => {
    mockGetProjectTasks.mockReset()

    mockUseWorkspace.mockReturnValue(createWorkspaceState({
      projects: [
        createProjectPreview({
          id: 'p1',
          name: 'Apollo',
          status: 'active',
          start_date: '2026-06-01',
          end_date: '2026-06-25',
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
      getProjectRole: vi.fn(() => 'manager' as const),
    }))
  })

  it('renders portfolio summary cards and project health', () => {
    render(<DashboardPage />)

    expect(screen.getByText('Portfolio Overview')).toBeTruthy()
    expect(screen.getByText('Active Projects')).toBeTruthy()
    expect(screen.getByText('Total Tasks')).toBeTruthy()
    expect(screen.getByText('Logged Hours')).toBeTruthy()
    expect(screen.getAllByText('Apollo').length).toBeGreaterThan(0)
    expect(screen.getByText('Risk: Red')).toBeTruthy()
    expect(screen.getByText('80% · Hours: 120 / 100')).toBeTruthy()
    expect(screen.getAllByText(/Start:/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Planned End:/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Forecast:/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Budget:/).length).toBeGreaterThan(0)
  })

  it('shows only open tasks assigned to current user in My Tasks', () => {
    render(<DashboardPage />)

    expect(screen.getByText('My Tasks')).toBeTruthy()
    expect(screen.getByText(/Implement API/)).toBeTruthy()
    expect(screen.queryByText(/Write docs/)).toBeNull()
    expect(screen.getByText('Current project: Apollo')).toBeTruthy()
  })

  it('shows consultant summary when user has no manager access', () => {
    mockUseWorkspace.mockReturnValue(createWorkspaceState({
      projects: [createProjectPreview({ id: 'p1', name: 'Apollo', status: 'active' })],
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
      ],
      selectedProjectId: 'p1',
      currentUserId: 'u1',
      getProjectRole: vi.fn(() => 'member' as const),
    }))

    render(<DashboardPage />)

    expect(screen.getByText('Consultant dashboard: assigned tasks, due dates, and your tracked task hours.')).toBeTruthy()
    expect(screen.getByText('My Open Tasks')).toBeTruthy()
    expect(screen.getByText('Due This Week')).toBeTruthy()
    expect(screen.getByText('My Tracked Task Hours')).toBeTruthy()
    expect(screen.queryByText('Project Health')).toBeNull()
  })

  it('shows member tasks from all projects with priority and due date', async () => {
    mockUseWorkspace.mockReturnValue(createWorkspaceState({
      projects: [
        createProjectPreview({ id: 'p1', name: 'Apollo', status: 'active' }),
        createProjectPreview({ id: 'p2', name: 'Hermes', status: 'active' }),
      ],
      tasks: [],
      selectedProjectId: 'p1',
      currentUserId: 'u1',
      getProjectRole: vi.fn(() => 'member' as const),
    }))

    mockGetProjectTasks.mockImplementation(async (projectId: string) => {
      if (projectId === 'p1') {
        return [
          createTaskPreview({
            id: 'm1',
            title: 'API integration',
            assigned_to: 'u1',
            status: 'todo',
            priority: 'high',
            due_date: '2026-06-11',
            project_id: 'p1',
          }),
        ]
      }

      return [
        createTaskPreview({
          id: 'm2',
          title: 'QA checklist',
          assigned_to: 'u1',
          status: 'in_progress',
          priority: 'medium',
          due_date: '2026-06-12',
          project_id: 'p2',
        }),
      ]
    })

    render(<DashboardPage />)

    expect(await screen.findByText(/API integration/)).toBeTruthy()
    expect(screen.getByText(/QA checklist/)).toBeTruthy()
    expect(screen.getByText('All projects assigned to me')).toBeTruthy()
    expect(screen.getByText(/Priority: high/)).toBeTruthy()
    expect(screen.getAllByText('Apollo').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Hermes').length).toBeGreaterThan(0)
  })
})
