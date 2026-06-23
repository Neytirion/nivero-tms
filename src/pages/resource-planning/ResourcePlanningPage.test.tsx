import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResourcePlanningPage } from './ResourcePlanningPage'
import { useWorkspace } from '../../features/dashboard/workspace-context.tsx'
import { getProjectMembers, getProjectTasks, getTimeEntries } from '../../lib/pm'
import { createProjectPreview, createWorkspaceState } from '../test-helpers'

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function startOfWeek(date: Date) {
  const value = new Date(date)
  const day = value.getDay()
  value.setDate(value.getDate() - (day === 0 ? 6 : day - 1))
  value.setHours(0, 0, 0, 0)
  return value
}

vi.mock('../../features/dashboard/workspace-context.tsx', () => ({
  useWorkspace: vi.fn(),
}))

vi.mock('../../lib/pm', () => ({
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
    const weekStart = startOfWeek(new Date())
    const weekDay2 = new Date(weekStart)
    weekDay2.setDate(weekDay2.getDate() + 1)
    const weekDay5 = new Date(weekStart)
    weekDay5.setDate(weekDay5.getDate() + 4)
    const nextWeekDay3 = new Date(weekStart)
    nextWeekDay3.setDate(nextWeekDay3.getDate() + 9)
    const nextWeekDay4 = new Date(weekStart)
    nextWeekDay4.setDate(nextWeekDay4.getDate() + 10)

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
          { id: 't1', assigned_to: 'u1', status: 'todo', estimate_hours: 25, due_date: toDateInputValue(weekDay2) },
          { id: 't2', assigned_to: 'u1', status: 'in_progress', estimate_hours: 20, due_date: toDateInputValue(weekDay5) },
          { id: 't4', assigned_to: 'u2', status: 'todo', estimate_hours: 8, due_date: toDateInputValue(nextWeekDay3) },
        ] as never
      }
      if (projectId === 'p2') {
        return [{ id: 't3', assigned_to: 'u1', status: 'done', estimate_hours: 10, due_date: toDateInputValue(weekDay2) }] as never
      }
      return [{ id: 't5', assigned_to: 'u2', status: 'todo', estimate_hours: 4, due_date: toDateInputValue(nextWeekDay4) }] as never
    })

    mockGetTimeEntries.mockResolvedValue([
      { id: 'e1', user_id: 'u1', minutes_spent: 180, project_id: 'p1', task_id: 't1', entry_date: '2026-06-05' },
    ] as never)
  })

  it('blocks access for users without owner/admin/manager role', async () => {
    mockUseWorkspace.mockReturnValue(createWorkspaceState({
      projects: [
        createProjectPreview({ id: 'p1', name: 'Apollo', status: 'active' }),
      ],
      getProjectRole: vi.fn(() => 'member' as const),
    }))

    render(<ResourcePlanningPage />)

    expect(await screen.findByText(/available only for owner, admin, or manager roles/i)).toBeTruthy()
    expect(screen.queryByText('Alice Johnson')).toBeNull()
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

  it('sums weekly allocation across multiple active projects for the same consultant', async () => {
    const weekStart = startOfWeek(new Date())
    const weekDay2 = new Date(weekStart)
    weekDay2.setDate(weekDay2.getDate() + 1)
    const weekDay4 = new Date(weekStart)
    weekDay4.setDate(weekDay4.getDate() + 3)

    mockUseWorkspace.mockReturnValue(createWorkspaceState({
      projects: [
        createProjectPreview({ id: 'p1', name: 'Apollo', status: 'active' }),
        createProjectPreview({ id: 'p2', name: 'Hermes', status: 'active' }),
      ],
    }))

    mockGetProjectMembers.mockImplementation(async (projectId: string) => {
      if (projectId === 'p1') {
        return [{ user_id: 'u1', full_name: 'Alice Johnson', email: 'alice@test.dev', project_id: 'p1' }] as never
      }

      return [{ user_id: 'u1', full_name: 'Alice Johnson', email: 'alice@test.dev', project_id: 'p2' }] as never
    })

    mockGetProjectTasks.mockImplementation(async (projectId: string) => {
      if (projectId === 'p1') {
        return [
          { id: 't1', assigned_to: 'u1', status: 'todo', estimate_hours: 40, due_date: toDateInputValue(weekDay2) },
        ] as never
      }

      return [
        { id: 't2', assigned_to: 'u1', status: 'in_progress', estimate_hours: 40, due_date: toDateInputValue(weekDay4) },
      ] as never
    })

    mockGetTimeEntries.mockResolvedValue([] as never)

    render(<ResourcePlanningPage />)

    expect(await screen.findByText('Alice Johnson')).toBeTruthy()
    expect(screen.getByText('80h')).toBeTruthy()
    expect(screen.getByText('200%')).toBeTruthy()
    expect(screen.getAllByText('Overbooked').length).toBeGreaterThan(0)
  })
})
