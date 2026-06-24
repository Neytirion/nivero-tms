import { render, screen, within } from '@testing-library/react'
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

    expect(screen.getByRole('heading', { name: 'Portfolio Overview' })).toBeInTheDocument()
    expect(screen.getByText('Active Projects')).toBeInTheDocument()
    expect(screen.getByText('Total Tasks')).toBeInTheDocument()
    expect(screen.getByText('Logged Hours')).toBeInTheDocument()
    expect(screen.getByText('Total Projects:')).toBeInTheDocument()
    expect(screen.getByText('Active:')).toBeInTheDocument()
    expect(screen.getByText('Completed:')).toBeInTheDocument()
    expect(screen.getByText('Risks:')).toBeInTheDocument()

    const projectHealthSection = screen.getByRole('heading', { name: 'Project Health' }).closest('section')
    expect(projectHealthSection).not.toBeNull()

    const apolloHealthCard = screen.getByText('Risk: Red').closest('article')
    expect(apolloHealthCard).not.toBeNull()

    const card = within(apolloHealthCard as HTMLElement)
    expect(card.getByText('Apollo')).toBeInTheDocument()
    expect(card.getByText('80% · Hours: 120 / 100')).toBeInTheDocument()
    expect(card.getByText(/Start:/)).toBeInTheDocument()
    expect(card.getByText(/Planned End:/)).toBeInTheDocument()
    expect(card.getByText(/Forecast:/)).toBeInTheDocument()
    expect(card.getByText(/Budget:/)).toBeInTheDocument()
  })

  it('shows only open tasks assigned to current user in My Tasks', () => {
    render(<DashboardPage />)

    const myTasksSection = screen.getByRole('heading', { name: 'My Tasks' }).closest('section')
    expect(myTasksSection).not.toBeNull()

    const section = within(myTasksSection as HTMLElement)
    expect(section.getByText('Current project: Apollo')).toBeInTheDocument()
    expect(section.getByText(/Implement API/)).toBeInTheDocument()
    expect(section.queryByText(/Write docs/)).not.toBeInTheDocument()
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

    expect(
      screen.getByText('Consultant dashboard: assigned tasks, due dates, and your tracked task hours.'),
    ).toBeInTheDocument()
    expect(screen.getByText('My Open Tasks')).toBeInTheDocument()
    expect(screen.getByText('Due This Week')).toBeInTheDocument()
    expect(screen.getByText('My Tracked Task Hours')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Project Health' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Project Manager' })).not.toBeInTheDocument()
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

    expect(await screen.findByText(/API integration/)).toBeInTheDocument()

    const myTasksSection = screen.getByText('All projects assigned to me').closest('section')
    expect(myTasksSection).not.toBeNull()

    const section = within(myTasksSection as HTMLElement)
    expect(section.getByText(/QA checklist/)).toBeInTheDocument()
    expect(section.getByText('All projects assigned to me')).toBeInTheDocument()
    expect(section.getByText(/Priority: high/)).toBeInTheDocument()
    expect(section.getByText(/Priority: medium/)).toBeInTheDocument()
    expect(section.getByRole('heading', { name: 'Apollo' })).toBeInTheDocument()
    expect(section.getByRole('heading', { name: 'Hermes' })).toBeInTheDocument()
  })
})
