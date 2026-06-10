import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TasksPage } from './TasksPage'
import { useWorkspace } from '../features/dashboard/workspace-context.tsx'
import { useTaskForm } from '../features/tasks/hooks/useTaskForm.ts'
import { createProjectPreview, createWorkspaceState, createTaskPreview } from './test-helpers.ts'
import { getProjectTaskWorkPackages, hasProjectEstimateVersion } from '../lib/pm'

vi.mock('../features/dashboard/workspace-context.tsx', () => ({
  useWorkspace: vi.fn(),
}))

vi.mock('../features/tasks/hooks/useTaskForm.ts', () => ({
  useTaskForm: vi.fn(),
}))

vi.mock('../lib/pm', () => ({
  createTimeEntry: vi.fn(),
  getProjectTaskWorkPackages: vi.fn(),
  hasProjectEstimateVersion: vi.fn(),
}))

let lastKanbanProps: unknown = null

vi.mock('../features/tasks/components', () => ({
  KanbanColumn: (props: unknown) => {
    lastKanbanProps = props
    return <div>kanban-column</div>
  },
  TaskLogTimeModal: () => null,
}))

const mockUseWorkspace = vi.mocked(useWorkspace)
const mockUseTaskForm = vi.mocked(useTaskForm)
const mockGetProjectTaskWorkPackages = vi.mocked(getProjectTaskWorkPackages)
const mockHasProjectEstimateVersion = vi.mocked(hasProjectEstimateVersion)

function mockTaskForm(overrides: Record<string, unknown> = {}) {
  mockUseTaskForm.mockReturnValue({
    taskTitle: 'Implement API',
    setTaskTitle: vi.fn(),
    taskDescription: 'Description',
    setTaskDescription: vi.fn(),
    taskPriority: 'high',
    setTaskPriority: vi.fn(),
    taskEstimateHours: '8',
    setTaskEstimateHours: vi.fn(),
    taskWorkPackageId: 'wp1',
    setTaskWorkPackageId: vi.fn(),
    taskAssigneeId: 'u2',
    setTaskAssigneeId: vi.fn(),
    taskBlockedByTaskId: '',
    setTaskBlockedByTaskId: vi.fn(),
    taskDueDate: '2026-06-20',
    setTaskDueDate: vi.fn(),
    canSubmit: true,
    reset: vi.fn(),
    ...overrides,
  })
}

describe('TasksPage', () => {
  beforeEach(() => {
    lastKanbanProps = null
    mockTaskForm()
    mockGetProjectTaskWorkPackages.mockResolvedValue([
      { id: 'wp1', name: 'Backend', estimated_hours: 20 },
    ] as never)
    mockHasProjectEstimateVersion.mockResolvedValue(true)
  })

  it('refreshes selected project snapshot on page load', async () => {
    const workspace = createWorkspaceState({
      selectedProjectId: 'p1',
      projects: [createProjectPreview({ id: 'p1', name: 'Apollo' })],
      tasks: [createTaskPreview({ id: 't1', title: 'Task A', project_id: 'p1' })],
    })
    mockUseWorkspace.mockReturnValue(workspace)

    render(<TasksPage />)

    await waitFor(() => {
      expect(workspace.selectProject).toHaveBeenCalledWith('p1')
    })
  })

  it('creates task with required mapped payload', async () => {
    const workspace = createWorkspaceState({
      selectedProjectId: 'p1',
      projects: [createProjectPreview({ id: 'p1', name: 'Apollo', start_date: '2026-06-01', end_date: '2026-06-30' })],
      canAssignTasksInProject: vi.fn(() => false),
    })
    mockUseWorkspace.mockReturnValue(workspace)

    render(<TasksPage />)

    const createButton = screen.getByRole('button', { name: 'Create task' })
    await waitFor(() => {
      expect(createButton).toBeEnabled()
    })

    fireEvent.click(createButton)

    await waitFor(() => {
      expect(workspace.addTask).toHaveBeenCalledWith({
        title: 'Implement API',
        description: 'Description',
        status: 'backlog',
        priority: 'high',
        estimateHours: 8,
        workPackageId: 'wp1',
        assignedTo: undefined,
        blockedByTaskId: undefined,
        dueDate: '2026-06-20',
      })
    })
  })

  it('hides delete action in board view for members', async () => {
    const task = createTaskPreview({ id: 't-member', title: 'Member task', project_id: 'p1' })
    const workspace = createWorkspaceState({
      selectedProjectId: 'p1',
      projects: [createProjectPreview({ id: 'p1', name: 'Apollo' })],
      tasks: [task],
      getProjectRole: vi.fn(() => 'member' as const),
      canDeleteTask: vi.fn(() => true),
    })
    mockUseWorkspace.mockReturnValue(workspace)

    render(<TasksPage />)

    await waitFor(() => {
      expect(lastKanbanProps).not.toBeNull()
    })

    const firstCallProps = lastKanbanProps as {
      canDeleteTask: (task: ReturnType<typeof createTaskPreview>) => boolean
    }

    expect(firstCallProps.canDeleteTask(task)).toBe(false)
  })

  it('disables task creation when estimate version is unavailable', async () => {
    mockHasProjectEstimateVersion.mockResolvedValue(false)
    const workspace = createWorkspaceState({
      selectedProjectId: 'p1',
      projects: [createProjectPreview({ id: 'p1', name: 'Apollo' })],
    })
    mockUseWorkspace.mockReturnValue(workspace)

    render(<TasksPage />)

    expect(await screen.findByText(/create estimate version v1/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create task' })).toBeDisabled()
  })

  it('blocks creating task when due date is outside project range', async () => {
    mockTaskForm({ taskDueDate: '2026-05-25' })
    const workspace = createWorkspaceState({
      selectedProjectId: 'p1',
      projects: [createProjectPreview({ id: 'p1', name: 'Apollo', start_date: '2026-06-01', end_date: '2026-06-30' })],
    })
    mockUseWorkspace.mockReturnValue(workspace)

    render(<TasksPage />)

    const createButton = screen.getByRole('button', { name: 'Create task' })
    await waitFor(() => {
      expect(createButton).toBeEnabled()
    })

    fireEvent.click(createButton)

    await waitFor(() => {
      expect(workspace.setStatus).toHaveBeenCalledWith('Due date must be within project dates')
    })
    expect(workspace.addTask).not.toHaveBeenCalled()
  })

  it('shows all members of selected project', async () => {
    const workspace = createWorkspaceState({
      selectedProjectId: 'p1',
      projects: [createProjectPreview({ id: 'p1', name: 'Apollo' })],
      projectMembers: [
        {
          member_id: 'm1',
          project_id: 'p1',
          user_id: 'u1',
          role: 'owner',
          joined_at: '2026-06-01T00:00:00.000Z',
          full_name: 'Alice Johnson',
          email: 'alice@example.com',
        },
        {
          member_id: 'm2',
          project_id: 'p1',
          user_id: 'u2',
          role: 'member',
          joined_at: '2026-06-02T00:00:00.000Z',
          full_name: null,
          email: 'bob@example.com',
        },
      ],
    })
    mockUseWorkspace.mockReturnValue(workspace)

    render(<TasksPage />)

    expect(await screen.findByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
    expect(screen.getByText('owner')).toBeInTheDocument()
    expect(screen.getByText('member')).toBeInTheDocument()
  })
})
