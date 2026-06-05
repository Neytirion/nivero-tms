import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResourcePlanningPage } from './ResourcePlanningPage'
import { useWorkspace } from '../features/dashboard/workspace-context.tsx'
import { getProjectMembers, getProjectTasks, getTimeEntries } from '../lib/pm'
import { createProjectPreview, createWorkspaceState } from '../test/workspace-factory'

vi.mock('../features/dashboard/workspace-context.tsx', () => ({
  useWorkspace: vi.fn(),
}))

vi.mock('../lib/pm', () => ({
  getProjectMembers: vi.fn(),
  getProjectTasks: vi.fn(),
  getTimeEntries: vi.fn(),
}))

const mockUseWorkspace = vi.mocked(useWorkspace)
const mockGetProjectMembers = vi.mocked(getProjectMembers)
const mockGetProjectTasks = vi.mocked(getProjectTasks)
const mockGetTimeEntries = vi.mocked(getTimeEntries)

describe('ResourcePlanningPage', () => {
  beforeEach(() => {
    mockUseWorkspace.mockReturnValue(createWorkspaceState({
      projects: [
        createProjectPreview({ id: 'p1', name: 'Apollo', status: 'active' }),
        createProjectPreview({ id: 'p2', name: 'Hermes', status: 'active' }),
        createProjectPreview({ id: 'p3', name: 'Atlas', status: 'active' }),
      ],
    }))

    mockGetProjectMembers.mockImplementation(async (projectId: string) => {
      if (projectId === 'p1') {
        return [
          { user_id: 'u1', full_name: 'Alice Johnson', email: 'alice@test.dev', project_id: 'p1' },
          { user_id: 'u2', full_name: 'Bob Smith', email: 'bob@test.dev', project_id: 'p1' },
        ] as never
      }
      if (projectId === 'p2') {
        return [{ user_id: 'u1', full_name: 'Alice Johnson', email: 'alice@test.dev', project_id: 'p2' }] as never
      }
      return [{ user_id: 'u2', full_name: 'Bob Smith', email: 'bob@test.dev', project_id: 'p3' }] as never
    })

    mockGetProjectTasks.mockImplementation(async (projectId: string) => {
      if (projectId === 'p1') {
        return [
          { id: 't1', assigned_to: 'u1', status: 'todo', estimate_hours: 25 },
          { id: 't2', assigned_to: 'u1', status: 'in_progress', estimate_hours: 20 },
          { id: 't4', assigned_to: 'u2', status: 'todo', estimate_hours: 8 },
        ] as never
      }
      if (projectId === 'p2') {
        return [{ id: 't3', assigned_to: 'u1', status: 'done', estimate_hours: 10 }] as never
      }
      return [{ id: 't5', assigned_to: 'u2', status: 'todo', estimate_hours: 4 }] as never
    })

    mockGetTimeEntries.mockResolvedValue([
      { id: 'e1', user_id: 'u1', minutes_spent: 180, project_id: 'p1', task_id: 't1', entry_date: '2026-06-05' },
    ] as never)
  })

  it('renders consultant allocation and overbooked status', async () => {
    render(<ResourcePlanningPage />)

    expect(await screen.findByText('Alice Johnson')).toBeTruthy()
    expect(screen.getAllByText('Apollo').length).toBeGreaterThan(0)
    expect(screen.getByText('45h')).toBeTruthy()
    expect(screen.getByText('3h')).toBeTruthy()
    expect(screen.getByText('113%')).toBeTruthy()
    expect(screen.getAllByText('Overbooked').length).toBeGreaterThan(0)
  })

  it('filters consultants by status when summary card is clicked', async () => {
    render(<ResourcePlanningPage />)

    await screen.findByText('Alice Johnson')
    expect(screen.getByText('Bob Smith')).toBeTruthy()
    fireEvent.click(screen.getAllByText('Overbooked')[0])

    expect(screen.getByText('Alice Johnson')).toBeTruthy()
    expect(screen.queryByText('Bob Smith')).toBeNull()
  })
})
