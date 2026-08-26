import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { TaskDetailsPage } from './TaskDetailsPage'
import { useTasksPageController } from './useTasksPageController'
import { createTaskPreview } from '../test-helpers'
import { getTimeEntries } from '../../lib/pm'

vi.mock('./useTasksPageController', () => ({
  useTasksPageController: vi.fn(),
}))

vi.mock('../../features/tasks/components/comments', () => ({
  TaskCommentsPanel: () => <div>comments</div>,
}))

vi.mock('../../lib/pm', () => ({
  getTimeEntries: vi.fn(),
}))

const mockUseTasksPageController = vi.mocked(useTasksPageController)
const mockGetTimeEntries = vi.mocked(getTimeEntries)

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
  const editTaskMock = vi.fn(async () => undefined)

  beforeEach(() => {
    editTaskMock.mockClear()
    mockGetTimeEntries.mockResolvedValue([] as never)

    mockUseTasksPageController.mockReturnValue({
      tasks: [
        createTaskPreview({
          id: 't1',
          title: 'Task A',
          description: 'Task description',
          project_id: 'p1',
        }),
      ],
      myRoleInSelectedProject: 'member',
      canAssignAssignee: false,
      canTakeUnassignedTasks: false,
      canManageTask: vi.fn(() => true),
      canDeleteTaskInView: vi.fn(() => false),
      projectStartDate: '',
      projectEndDate: '',
      currentUserProfile: { userId: 'u1', fullName: 'Alice' },
      assigneeLabelByUserId: {},
      workPackageLabelById: {},
      dependencyLabelByTaskId: {},
      assigneeOptions: [],
      updateTaskDueDateHandler: vi.fn(async () => undefined),
      removeTask: vi.fn(async () => undefined),
      editTask: editTaskMock,
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

    fireEvent.click(screen.getByRole('button', { name: /tasks/i }))

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/app/tasks')
    })
  })

  it('redirects to fallback path when task is missing', async () => {
    mockUseTasksPageController.mockReturnValueOnce({
      tasks: [],
      canAssignAssignee: false,
      canTakeUnassignedTasks: false,
      canManageTask: vi.fn(() => true),
      canDeleteTaskInView: vi.fn(() => false),
      projectStartDate: '',
      projectEndDate: '',
      currentUserProfile: { userId: 'u1', fullName: 'Alice' },
      assigneeLabelByUserId: {},
      workPackageLabelById: {},
      dependencyLabelByTaskId: {},
      assigneeOptions: [],
      updateTaskDueDateHandler: vi.fn(async () => undefined),
      removeTask: vi.fn(async () => undefined),
      editTask: editTaskMock,
    } as unknown as ReturnType<typeof useTasksPageController>)

    renderTaskDetails({
      pathname: '/app/tasks/t1',
      state: { backTo: '/app/projects/p1?tab=tasks' },
    })

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/app/projects/p1?tab=tasks')
    })
  })

  it('allows project owners/admins to update estimated hours inside task details', async () => {
    mockUseTasksPageController.mockReturnValue({
      tasks: [
        createTaskPreview({
          id: 't1',
          title: 'Task A',
          project_id: 'p1',
          estimate_hours: 8,
          assigned_to: 'u1',
        }),
      ],
      myRoleInSelectedProject: 'admin',
      canAssignAssignee: true,
      canTakeUnassignedTasks: true,
      canManageTask: vi.fn(() => true),
      canDeleteTaskInView: vi.fn(() => false),
      projectStartDate: '',
      projectEndDate: '',
      currentUserProfile: { userId: 'u1', fullName: 'Alice' },
      assigneeLabelByUserId: {},
      workPackageLabelById: {},
      dependencyLabelByTaskId: {},
      assigneeOptions: [],
      updateTaskDueDateHandler: vi.fn(async () => undefined),
      removeTask: vi.fn(async () => undefined),
      editTask: editTaskMock,
    } as unknown as ReturnType<typeof useTasksPageController>)

    renderTaskDetails('/app/tasks/t1')

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    const estimateInput = screen.getByLabelText(/estimate hours/i)
    fireEvent.change(estimateInput, { target: { value: '12.5' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(editTaskMock).toHaveBeenCalledWith('t1', { estimateHours: 12.5 })
    })
  })

  it('shows estimated hours as text for manager role', () => {
    mockUseTasksPageController.mockReturnValue({
      tasks: [
        createTaskPreview({
          id: 't1',
          title: 'Task A',
          project_id: 'p1',
          estimate_hours: 8,
          assigned_to: 'u1',
        }),
      ],
      myRoleInSelectedProject: 'manager',
      canAssignAssignee: true,
      canTakeUnassignedTasks: true,
      canManageTask: vi.fn(() => true),
      canDeleteTaskInView: vi.fn(() => false),
      projectStartDate: '',
      projectEndDate: '',
      currentUserProfile: { userId: 'u1', fullName: 'Alice' },
      assigneeLabelByUserId: {},
      workPackageLabelById: {},
      dependencyLabelByTaskId: {},
      assigneeOptions: [],
      updateTaskDueDateHandler: vi.fn(async () => undefined),
      removeTask: vi.fn(async () => undefined),
      editTask: editTaskMock,
    } as unknown as ReturnType<typeof useTasksPageController>)

    renderTaskDetails('/app/tasks/t1')

    expect(document.getElementById('task-estimate-hours')).not.toBeInTheDocument()
    expect(document.getElementById('task-estimate-hours-readonly')).not.toBeInTheDocument()
    expect(screen.getByText('Estimate')).toBeInTheDocument()
  })

  it('shows estimated hours as text for member role', () => {
    renderTaskDetails('/app/tasks/t1')

    expect(document.getElementById('task-estimate-hours')).not.toBeInTheDocument()
    expect(document.getElementById('task-estimate-hours-readonly')).not.toBeInTheDocument()
    expect(screen.getByText('Estimate')).toBeInTheDocument()
  })

  it('shows take-task button for unassigned task when user can claim and updates assignee to current user', async () => {
    mockUseTasksPageController.mockReturnValue({
      tasks: [
        createTaskPreview({
          id: 't1',
          title: 'Task A',
          project_id: 'p1',
          assigned_to: null,
          created_by: 'u2',
        }),
      ],
      myRoleInSelectedProject: 'member',
      canAssignAssignee: true,
      canTakeUnassignedTasks: true,
      canManageTask: vi.fn(() => false),
      canDeleteTaskInView: vi.fn(() => false),
      projectStartDate: '',
      projectEndDate: '',
      currentUserProfile: { userId: 'u1', fullName: 'Alice' },
      assigneeLabelByUserId: {},
      workPackageLabelById: {},
      dependencyLabelByTaskId: {},
      assigneeOptions: [],
      updateTaskDueDateHandler: vi.fn(async () => undefined),
      removeTask: vi.fn(async () => undefined),
      editTask: editTaskMock,
    } as unknown as ReturnType<typeof useTasksPageController>)

    renderTaskDetails('/app/tasks/t1')

    fireEvent.click(screen.getByRole('button', { name: /take task/i }))

    await waitFor(() => {
      expect(editTaskMock).toHaveBeenCalledWith('t1', { assignedTo: 'u1' })
    })
  })

  it('hides take-task button when task already assigned', () => {
    mockUseTasksPageController.mockReturnValue({
      tasks: [
        createTaskPreview({
          id: 't1',
          title: 'Task A',
          project_id: 'p1',
          assigned_to: 'u2',
          created_by: 'u1',
        }),
      ],
      myRoleInSelectedProject: 'member',
      canAssignAssignee: true,
      canTakeUnassignedTasks: true,
      canManageTask: vi.fn(() => true),
      canDeleteTaskInView: vi.fn(() => false),
      projectStartDate: '',
      projectEndDate: '',
      currentUserProfile: { userId: 'u1', fullName: 'Alice' },
      assigneeLabelByUserId: {},
      workPackageLabelById: {},
      dependencyLabelByTaskId: {},
      assigneeOptions: [],
      updateTaskDueDateHandler: vi.fn(async () => undefined),
      removeTask: vi.fn(async () => undefined),
      editTask: editTaskMock,
    } as unknown as ReturnType<typeof useTasksPageController>)

    renderTaskDetails('/app/tasks/t1')

    expect(screen.queryByRole('button', { name: /take task/i })).not.toBeInTheDocument()
  })

  it('updates description only after clicking Save', async () => {
    mockUseTasksPageController.mockReturnValue({
      tasks: [
        createTaskPreview({
          id: 't1',
          title: 'Task A',
          description: 'Old description',
          project_id: 'p1',
          assigned_to: 'u1',
        }),
      ],
      myRoleInSelectedProject: 'member',
      canAssignAssignee: false,
      canTakeUnassignedTasks: false,
      canManageTask: vi.fn(() => true),
      canDeleteTaskInView: vi.fn(() => false),
      projectStartDate: '',
      projectEndDate: '',
      currentUserProfile: { userId: 'u1', fullName: 'Alice' },
      assigneeLabelByUserId: {},
      workPackageLabelById: {},
      dependencyLabelByTaskId: {},
      assigneeOptions: [],
      updateTaskDueDateHandler: vi.fn(async () => undefined),
      removeTask: vi.fn(async () => undefined),
      editTask: editTaskMock,
    } as unknown as ReturnType<typeof useTasksPageController>)

    renderTaskDetails('/app/tasks/t1')

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))

    const descriptionInput = screen.getByPlaceholderText(/add description/i)
    fireEvent.change(descriptionInput, { target: { value: 'New description value' } })

    expect(editTaskMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(editTaskMock).toHaveBeenCalledWith('t1', { description: 'New description value' })
    })
  })

  it('renders attachment previews and file links from client intake description', () => {
    mockUseTasksPageController.mockReturnValue({
      tasks: [
        createTaskPreview({
          id: 't1',
          title: 'Client bug report',
          description: [
            'Client request submitted via public intake link.',
            '',
            'Request details:',
            'UI issue with order summary.',
            '',
            'Attachments:',
            '1. screenshot.png | https://cdn.example.com/files/screenshot.png',
            '2. console-log.txt | https://cdn.example.com/files/console-log.txt',
          ].join('\n'),
          project_id: 'p1',
          assigned_to: 'u1',
        }),
      ],
      myRoleInSelectedProject: 'member',
      canAssignAssignee: false,
      canTakeUnassignedTasks: false,
      canManageTask: vi.fn(() => true),
      canDeleteTaskInView: vi.fn(() => false),
      projectStartDate: '',
      projectEndDate: '',
      currentUserProfile: { userId: 'u1', fullName: 'Alice' },
      assigneeLabelByUserId: {},
      workPackageLabelById: {},
      dependencyLabelByTaskId: {},
      assigneeOptions: [],
      updateTaskDueDateHandler: vi.fn(async () => undefined),
      removeTask: vi.fn(async () => undefined),
      editTask: editTaskMock,
    } as unknown as ReturnType<typeof useTasksPageController>)

    renderTaskDetails('/app/tasks/t1')

    expect(screen.getByText(/client request/i)).toBeInTheDocument()
    expect(screen.getByText(/client name/i)).toBeInTheDocument()
    expect(screen.getByText(/client email/i)).toBeInTheDocument()
    expect(screen.getByText(/request details/i)).toBeInTheDocument()
    expect(screen.getAllByText('Not provided')).toHaveLength(2)
    expect(screen.getByText('UI issue with order summary.')).toBeInTheDocument()
    expect(screen.getByText('No description')).toBeInTheDocument()
    expect(screen.queryByText(/Client request submitted via public intake link\./i)).not.toBeInTheDocument()

    expect(screen.getByRole('img', { name: /attachment preview: screenshot\.png/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /console-log\.txt/i })).toBeInTheDocument()
  })

  it('shows unified edit button for members on assigned client-intake tasks', () => {
    mockUseTasksPageController.mockReturnValue({
      tasks: [
        createTaskPreview({
          id: 't1',
          title: 'Client bug report',
          description: [
            'Client request submitted via public intake link.',
            '',
            'Client name: John',
            'Client email: john@example.com',
            '',
            'Request details:',
            'Please fix checkout behavior.',
          ].join('\n'),
          project_id: 'p1',
          assigned_to: 'u1',
        }),
      ],
      myRoleInSelectedProject: 'member',
      canAssignAssignee: false,
      canTakeUnassignedTasks: false,
      canManageTask: vi.fn(() => true),
      canDeleteTaskInView: vi.fn(() => false),
      projectStartDate: '',
      projectEndDate: '',
      currentUserProfile: { userId: 'u1', fullName: 'Alice' },
      assigneeLabelByUserId: {},
      workPackageLabelById: {},
      dependencyLabelByTaskId: {},
      assigneeOptions: [],
      updateTaskDueDateHandler: vi.fn(async () => undefined),
      removeTask: vi.fn(async () => undefined),
      editTask: editTaskMock,
    } as unknown as ReturnType<typeof useTasksPageController>)

    renderTaskDetails('/app/tasks/t1')

    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument()
  })

  it('edits only internal description for members on client-intake tasks', async () => {
    mockUseTasksPageController.mockReturnValue({
      tasks: [
        createTaskPreview({
          id: 't1',
          title: 'Client bug report',
          description: [
            'Client request submitted via public intake link.',
            '',
            'Client name: John',
            'Client email: john@example.com',
            '',
            'Request details:',
            'Please fix checkout behavior.',
            '',
            'Attachments:',
            '1. screenshot.png | https://cdn.example.com/files/screenshot.png',
          ].join('\n'),
          project_id: 'p1',
          assigned_to: 'u1',
        }),
      ],
      myRoleInSelectedProject: 'member',
      canAssignAssignee: false,
      canTakeUnassignedTasks: false,
      canManageTask: vi.fn(() => true),
      canDeleteTaskInView: vi.fn(() => false),
      projectStartDate: '',
      projectEndDate: '',
      currentUserProfile: { userId: 'u1', fullName: 'Alice' },
      assigneeLabelByUserId: {},
      workPackageLabelById: {},
      dependencyLabelByTaskId: {},
      assigneeOptions: [],
      updateTaskDueDateHandler: vi.fn(async () => undefined),
      removeTask: vi.fn(async () => undefined),
      editTask: editTaskMock,
    } as unknown as ReturnType<typeof useTasksPageController>)

    renderTaskDetails('/app/tasks/t1')

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))

    const descriptionInput = screen.getByPlaceholderText(/add description/i) as HTMLTextAreaElement
    expect(descriptionInput.value).toBe('')
    expect(screen.queryByPlaceholderText(/client name/i)).not.toBeInTheDocument()

    fireEvent.change(descriptionInput, { target: { value: 'Team note for implementation' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(editTaskMock).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({
          description: expect.stringContaining('Internal description:\nTeam note for implementation'),
        }),
      )
    })
  })

  it('allows admin to edit client request block', async () => {
    mockUseTasksPageController.mockReturnValue({
      tasks: [
        createTaskPreview({
          id: 't1',
          title: 'Client bug report',
          description: [
            'Client request submitted via public intake link.',
            '',
            'Client name: John',
            'Client email: john@example.com',
            '',
            'Request details:',
            'Please fix checkout behavior.',
          ].join('\n'),
          project_id: 'p1',
          assigned_to: 'u1',
        }),
      ],
      myRoleInSelectedProject: 'admin',
      canAssignAssignee: true,
      canTakeUnassignedTasks: true,
      canManageTask: vi.fn(() => true),
      canDeleteTaskInView: vi.fn(() => false),
      projectStartDate: '',
      projectEndDate: '',
      currentUserProfile: { userId: 'u1', fullName: 'Alice' },
      assigneeLabelByUserId: {},
      workPackageLabelById: {},
      dependencyLabelByTaskId: {},
      assigneeOptions: [],
      updateTaskDueDateHandler: vi.fn(async () => undefined),
      removeTask: vi.fn(async () => undefined),
      editTask: editTaskMock,
    } as unknown as ReturnType<typeof useTasksPageController>)

    renderTaskDetails('/app/tasks/t1')

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))

    const clientNameInput = screen.getByPlaceholderText(/client name/i)
    fireEvent.change(clientNameInput, { target: { value: 'Jane' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(editTaskMock).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({
          description: expect.stringContaining('Client name: Jane'),
        }),
      )
    })
  })

  it('allows admin to remove client-request attachment', async () => {
    mockUseTasksPageController.mockReturnValue({
      tasks: [
        createTaskPreview({
          id: 't1',
          title: 'Client bug report',
          description: [
            'Client request submitted via public intake link.',
            '',
            'Client name: John',
            'Client email: john@example.com',
            '',
            'Request details:',
            'Please fix checkout behavior.',
            '',
            'Attachments:',
            '1. screenshot.png | https://cdn.example.com/files/screenshot.png',
            '2. console-log.txt | https://cdn.example.com/files/console-log.txt',
          ].join('\n'),
          project_id: 'p1',
          assigned_to: 'u1',
        }),
      ],
      myRoleInSelectedProject: 'admin',
      canAssignAssignee: true,
      canTakeUnassignedTasks: true,
      canManageTask: vi.fn(() => true),
      canDeleteTaskInView: vi.fn(() => false),
      projectStartDate: '',
      projectEndDate: '',
      currentUserProfile: { userId: 'u1', fullName: 'Alice' },
      assigneeLabelByUserId: {},
      workPackageLabelById: {},
      dependencyLabelByTaskId: {},
      assigneeOptions: [],
      updateTaskDueDateHandler: vi.fn(async () => undefined),
      removeTask: vi.fn(async () => undefined),
      editTask: editTaskMock,
    } as unknown as ReturnType<typeof useTasksPageController>)

    renderTaskDetails('/app/tasks/t1')

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    const removeButtons = screen.getAllByRole('button', { name: /remove/i })
    fireEvent.click(removeButtons[0])
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(editTaskMock).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({
          description: expect.not.stringContaining('https://cdn.example.com/files/screenshot.png'),
        }),
      )
    })

    expect(editTaskMock).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({
        description: expect.stringContaining('https://cdn.example.com/files/console-log.txt'),
      }),
    )
  })

  it('allows member to edit task title', async () => {
    mockUseTasksPageController.mockReturnValue({
      tasks: [
        createTaskPreview({
          id: 't1',
          title: 'Task A',
          description: 'Task description',
          project_id: 'p1',
          assigned_to: 'u1',
        }),
      ],
      myRoleInSelectedProject: 'member',
      canAssignAssignee: false,
      canTakeUnassignedTasks: false,
      canManageTask: vi.fn(() => true),
      canDeleteTaskInView: vi.fn(() => false),
      projectStartDate: '',
      projectEndDate: '',
      currentUserProfile: { userId: 'u1', fullName: 'Alice' },
      assigneeLabelByUserId: {},
      workPackageLabelById: {},
      dependencyLabelByTaskId: {},
      assigneeOptions: [],
      updateTaskDueDateHandler: vi.fn(async () => undefined),
      removeTask: vi.fn(async () => undefined),
      editTask: editTaskMock,
    } as unknown as ReturnType<typeof useTasksPageController>)

    renderTaskDetails('/app/tasks/t1')

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    const titleInput = screen.getByPlaceholderText(/task title/i)
    fireEvent.change(titleInput, { target: { value: 'Task A renamed by member' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(editTaskMock).toHaveBeenCalledWith('t1', { title: 'Task A renamed by member' })
    })
  })
})
