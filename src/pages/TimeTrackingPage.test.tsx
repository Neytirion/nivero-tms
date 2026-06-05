import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TimeTrackingPage } from './TimeTrackingPage'
import { useWorkspace } from '../features/dashboard/workspace-context.tsx'
import { createTimeEntry, getProjectTasks, getTimeEntries } from '../lib/pm'
import { createProjectPreview, createWorkspaceState } from './test-helpers.ts'

vi.mock('../features/dashboard/workspace-context.tsx', () => ({
  useWorkspace: vi.fn(),
}))

vi.mock('../lib/pm', () => ({
  createTimeEntry: vi.fn(),
  getProjectTasks: vi.fn(),
  getTimeEntries: vi.fn(),
}))

const mockUseWorkspace = vi.mocked(useWorkspace)
const mockCreateTimeEntry = vi.mocked(createTimeEntry)
const mockGetProjectTasks = vi.mocked(getProjectTasks)
const mockGetTimeEntries = vi.mocked(getTimeEntries)

function createWorkspace(selectedProjectId: string | null = 'p1') {
  return createWorkspaceState({
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
    expect(screen.getByText('Allowed range: 2026-06-01 - 2026-06-30')).toBeTruthy()
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
          category: 'delivery',
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

    expect((screen.getByText('Save manual entry') as HTMLButtonElement).disabled).toBe(true)
  })
})
