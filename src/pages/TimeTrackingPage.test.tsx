import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TimeTrackingPage } from './TimeTrackingPage'
import { useWorkspace } from '../features/dashboard/workspace-context.tsx'
import { createTimeEntry, deleteTimeEntry, getProjectTasks, getTimeEntries, updateTimeEntry } from '../lib/pm'
import { createProjectPreview, createWorkspaceState } from './test-helpers.ts'

vi.mock('../features/dashboard/workspace-context.tsx', () => ({
  useWorkspace: vi.fn(),
}))

vi.mock('../lib/pm', () => ({
  createTimeEntry: vi.fn(),
  deleteTimeEntry: vi.fn(),
  getProjectTasks: vi.fn(),
  getTimeEntries: vi.fn(),
  updateTimeEntry: vi.fn(),
}))

const mockUseWorkspace = vi.mocked(useWorkspace)
const mockCreateTimeEntry = vi.mocked(createTimeEntry)
const mockDeleteTimeEntry = vi.mocked(deleteTimeEntry)
const mockGetProjectTasks = vi.mocked(getProjectTasks)
const mockGetTimeEntries = vi.mocked(getTimeEntries)
const mockUpdateTimeEntry = vi.mocked(updateTimeEntry)

function createWorkspace(selectedProjectId: string | null = 'p1') {
  return createWorkspaceState({
    currentUserId: 'u1',
    projects: [
      createProjectPreview({
        id: 'p1',
        name: 'Apollo',
        start_date: '2026-06-01',
        end_date: '2026-06-30',
      }),
    ],
    selectedProjectId,
  })
}

describe('TimeTrackingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetTimeEntries.mockResolvedValue([])
    mockGetProjectTasks.mockResolvedValue([
      {
        id: 't1',
        title: 'Implement API',
        assigned_to: 'u1',
        status: 'todo',
      },
    ] as never)
    mockCreateTimeEntry.mockResolvedValue({ id: 'entry-1' } as never)
    mockUpdateTimeEntry.mockResolvedValue({ id: 'entry-1' } as never)
    mockDeleteTimeEntry.mockResolvedValue(undefined as never)
  })

  it('shows project date constraints on manual entry date field', async () => {
    mockUseWorkspace.mockReturnValue(createWorkspace())

    render(<TimeTrackingPage />)

    const todayValue = new Date().toISOString().slice(0, 10)
    const dateInput = (await screen.findAllByDisplayValue(todayValue)).find(
      (element) => element.getAttribute('min') === '2026-06-01',
    )!
    expect(dateInput.getAttribute('min')).toBe('2026-06-01')
    expect(dateInput.getAttribute('max')).toBe('2026-06-30')
    expect(screen.getByText('Allowed range: 2026-06-01 - 2026-06-30')).toBeInTheDocument()
  })

  it('creates a manual time entry and refreshes workspace metrics', async () => {
    const workspace = createWorkspace()
    mockUseWorkspace.mockReturnValue(workspace)

    render(<TimeTrackingPage />)

    fireEvent.click(screen.getByText('Save manual entry'))

    await waitFor(() => {
      expect(mockCreateTimeEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'p1',
          hoursSpent: 1,
          isBillable: true,
        }),
      )
    })

    await waitFor(() => {
      expect(workspace.loadDashboardPreview).toHaveBeenCalled()
    })
  })

  it('disables manual save when there is no selected project', async () => {
    const workspace = createWorkspace(null)
    mockUseWorkspace.mockReturnValue(workspace)

    render(<TimeTrackingPage />)

    expect(screen.getByRole('button', { name: 'Save manual entry' })).toBeDisabled()
  })

  it('shows only current user tasks in task selectors', async () => {
    const workspace = createWorkspace()
    mockUseWorkspace.mockReturnValue(workspace)
    mockGetProjectTasks.mockResolvedValue([
      {
        id: 't1',
        title: 'My task',
        assigned_to: 'u1',
        status: 'todo',
      },
      {
        id: 't2',
        title: 'Other user task',
        assigned_to: 'u2',
        status: 'todo',
      },
    ] as never)

    render(<TimeTrackingPage />)

    expect((await screen.findAllByText('My task')).length).toBeGreaterThan(0)
    expect(screen.queryByText('Other user task')).not.toBeInTheDocument()
  })

  it('edits and deletes own logs even when task is missing', async () => {
    const workspace = createWorkspace()
    mockUseWorkspace.mockReturnValue(workspace)
    mockGetTimeEntries.mockResolvedValue([
      {
        id: 'te-1',
        user_id: 'u1',
        project_id: 'p1',
        task_id: null,
        entry_date: '2026-06-05',
        minutes_spent: 30000,
        is_billable: true,
        notes: 'bad log',
        started_at: null,
        ended_at: null,
        created_at: '2026-06-05T10:00:00.000Z',
      },
    ] as never)

    render(<TimeTrackingPage />)

    expect((await screen.findAllByText('bad log')).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByText('Edit'))

    await waitFor(() => {
      const entryDateInput = screen
        .getAllByDisplayValue('2026-06-05')
        .find((element) => element.getAttribute('min') === '2026-06-01')

      expect(entryDateInput).toBeDefined()
      expect(screen.getByDisplayValue('500.00')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByDisplayValue('500.00'), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update entry' }))

    await waitFor(() => {
      expect(mockUpdateTimeEntry).toHaveBeenCalledWith(
        'te-1',
        expect.objectContaining({
          projectId: 'p1',
          hoursSpent: 2,
          taskId: undefined,
          entryDate: '2026-06-05',
        }),
      )
    })

    fireEvent.click(screen.getByText('Delete'))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete entry' }))

    await waitFor(() => {
      expect(mockDeleteTimeEntry).toHaveBeenCalledWith('te-1')
    })
  })

  it('prevents manual entry with non-positive hours', async () => {
    const workspace = createWorkspace()
    mockUseWorkspace.mockReturnValue(workspace)

    render(<TimeTrackingPage />)

    fireEvent.change(screen.getByLabelText('Hours'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save manual entry' }))

    await waitFor(() => {
      expect(workspace.setStatus).toHaveBeenCalledWith('Hours must be greater than 0')
    })
    expect(mockCreateTimeEntry).not.toHaveBeenCalled()
  })

  it('shows an error when weekly entries fail to load', async () => {
    const workspace = createWorkspace()
    mockUseWorkspace.mockReturnValue(workspace)
    mockGetTimeEntries.mockRejectedValueOnce(new Error('network down'))

    render(<TimeTrackingPage />)

    await waitFor(() => {
      expect(workspace.setStatus).toHaveBeenCalledWith('Time entries load error: network down')
    })
  })
})
