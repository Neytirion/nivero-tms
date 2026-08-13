import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { TaskDetailsPage } from './TaskDetailsPage'
import { useTasksPageController } from './useTasksPageController'
import { createTaskPreview } from '../test-helpers'

vi.mock('./useTasksPageController', () => ({
  useTasksPageController: vi.fn(),
}))

vi.mock('../../features/tasks/components/comments', () => ({
  TaskCommentsPanel: () => <div>comments</div>,
}))

const mockUseTasksPageController = vi.mocked(useTasksPageController)

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

function renderTaskDetails(initialEntry: string | { pathname: string; state?: unknown }) {
  return render(
    <MemoryRouter initialEntries={[initialEntry as never]}>
      <Routes>
        <Route
          path="/app/tasks/:taskId"
          element={
            <>
              <TaskDetailsPage />
              <LocationProbe />
            </>
          }
        />
        <Route path="/app/tasks" element={<LocationProbe />} />
        <Route path="/app/projects/:projectId" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TaskDetailsPage', () => {
  beforeEach(() => {
    mockUseTasksPageController.mockReturnValue({
      tasks: [
        createTaskPreview({
          id: 't1',
          title: 'Task A',
          description: 'Task description',
          project_id: 'p1',
        }),
      ],
      canAssignAssignee: false,
      canManageTask: vi.fn(() => true),
      canDeleteTaskInView: vi.fn(() => false),
      projectStartDate: '',
      projectEndDate: '',
      assigneeLabelByUserId: {},
      workPackageLabelById: {},
      dependencyLabelByTaskId: {},
      assigneeOptions: [],
      assignTaskHandler: vi.fn(async () => undefined),
      updateTaskDueDateHandler: vi.fn(async () => undefined),
      removeTask: vi.fn(async () => undefined),
    } as unknown as ReturnType<typeof useTasksPageController>)
  })

  it('navigates back to passed origin path', async () => {
    renderTaskDetails({
      pathname: '/app/tasks/t1',
      state: { backTo: '/app/projects/p1?tab=tasks' },
    })

    fireEvent.click(screen.getByRole('button', { name: /project details/i }))

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/app/projects/p1?tab=tasks')
    })
  })

  it('falls back to tasks module when no origin is provided', async () => {
    renderTaskDetails('/app/tasks/t1')

    fireEvent.click(screen.getByRole('button', { name: /^tasks$/i }))

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/app/tasks')
    })
  })

  it('redirects to fallback path when task is missing', async () => {
    mockUseTasksPageController.mockReturnValueOnce({
      tasks: [],
      canAssignAssignee: false,
      canManageTask: vi.fn(() => true),
      canDeleteTaskInView: vi.fn(() => false),
      projectStartDate: '',
      projectEndDate: '',
      assigneeLabelByUserId: {},
      workPackageLabelById: {},
      dependencyLabelByTaskId: {},
      assigneeOptions: [],
      assignTaskHandler: vi.fn(async () => undefined),
      updateTaskDueDateHandler: vi.fn(async () => undefined),
      removeTask: vi.fn(async () => undefined),
    } as unknown as ReturnType<typeof useTasksPageController>)

    renderTaskDetails({
      pathname: '/app/tasks/t1',
      state: { backTo: '/app/projects/p1?tab=tasks' },
    })

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/app/projects/p1?tab=tasks')
    })
  })
})
