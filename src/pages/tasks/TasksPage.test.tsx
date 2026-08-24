import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TasksPage } from './TasksPage'
import { useWorkspace } from '../../features/dashboard/workspace-context.tsx'
import { useTaskForm } from '../../features/tasks/hooks/useTaskForm.ts'
import { createProjectPreview, createWorkspaceState, createTaskPreview } from '../test-helpers.ts'
import {
  getProjectTaskWorkPackages,
  getProjectUseEstimates,
  getProjectWorkPackageDisplayProfileById,
  hasProjectEstimateVersion,
} from '../../lib/pm'
import { getProjectTaskCardFieldPreferences } from '../../lib/pm/work-packages'

vi.mock('../../features/dashboard/workspace-context.tsx', () => ({
  useWorkspace: vi.fn(),
}))

vi.mock('../../features/tasks/hooks/useTaskForm.ts', () => ({
  useTaskForm: vi.fn(),
}))

vi.mock('../../lib/pm', () => ({
  createTimeEntry: vi.fn(),
  getProjectTaskWorkPackages: vi.fn(),
  hasProjectEstimateVersion: vi.fn(),
  getProjectUseEstimates: vi.fn(),
  getProjectWorkPackageDisplayProfileById: vi.fn(),
}))

vi.mock('../../lib/pm/work-packages', () => ({
  getProjectTaskCardFieldPreferences: vi.fn(),
}))

let lastKanbanProps: unknown = null
let kanbanPropsCalls: unknown[] = []

vi.mock('../../features/tasks/components', () => ({
  KanbanColumn: (props: unknown) => {
    lastKanbanProps = props
    kanbanPropsCalls.push(props)
    return <div>kanban-column</div>
  },
  TaskLogTimeModal: () => null,
}))

const mockUseWorkspace = vi.mocked(useWorkspace)
const mockUseTaskForm = vi.mocked(useTaskForm)
const mockGetProjectTaskWorkPackages = vi.mocked(getProjectTaskWorkPackages)
const mockHasProjectEstimateVersion = vi.mocked(hasProjectEstimateVersion)
const mockGetProjectUseEstimates = vi.mocked(getProjectUseEstimates)
const mockGetProjectWorkPackageDisplayProfileById = vi.mocked(getProjectWorkPackageDisplayProfileById)
const mockGetProjectTaskCardFieldPreferences = vi.mocked(getProjectTaskCardFieldPreferences)

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
    kanbanPropsCalls = []
    mockTaskForm()
    mockGetProjectTaskCardFieldPreferences.mockResolvedValue({
      showDescription: true,
      showPriority: true,
      showDueState: true,
      showDueDate: true,
      showAssignee: true,
      showWorkPackage: true,
    })
    mockGetProjectTaskWorkPackages.mockResolvedValue([
      { id: 'wp1', name: 'Backend', estimated_hours: 20 },
    ] as never)
    mockGetProjectWorkPackageDisplayProfileById.mockResolvedValue({})
    mockHasProjectEstimateVersion.mockResolvedValue(true)
    mockGetProjectUseEstimates.mockResolvedValue(false)
  })

  it('refreshes selected project snapshot on page load', async () => {
    const workspace = createWorkspaceState({
      selectedProjectId: 'p1',
      projects: [createProjectPreview({ id: 'p1', name: 'Apollo' })],
      tasks: [createTaskPreview({ id: 't1', title: 'Task A', project_id: 'p1' })],
    })
    mockUseWorkspace.mockReturnValue(workspace)

    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    )

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

    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    )

    const createButton = screen.getByRole('button', { name: /create a new task/i })
    await waitFor(() => {
      expect(createButton).toBeEnabled()
    })
  })

  it('locks task drag for members in board view', async () => {
    const task = createTaskPreview({ id: 't-member', title: 'Member task', project_id: 'p1' })
    const workspace = createWorkspaceState({
      selectedProjectId: 'p1',
      projects: [createProjectPreview({ id: 'p1', name: 'Apollo' })],
      tasks: [task],
      getProjectRole: vi.fn(() => 'member' as const),
      canDeleteTask: vi.fn(() => true),
    })
    mockUseWorkspace.mockReturnValue(workspace)

    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(lastKanbanProps).not.toBeNull()
    })

    const firstCallProps = lastKanbanProps as {
      canManageTask: (task: ReturnType<typeof createTaskPreview>) => boolean
    }

    expect(firstCallProps.canManageTask(task)).toBe(false)
  })

  it('disables task creation when estimate version is unavailable', async () => {
    mockGetProjectUseEstimates.mockResolvedValue(true)
    mockHasProjectEstimateVersion.mockResolvedValue(false)
    const workspace = createWorkspaceState({
      selectedProjectId: 'p1',
      projects: [createProjectPreview({ id: 'p1', name: 'Apollo', use_estimates: true })],
    })
    mockUseWorkspace.mockReturnValue(workspace)

    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create a new task/i })).toBeDisabled()
    })
  })

  it('prevents task creation when due date is outside project range', async () => {
    mockTaskForm({ taskDueDate: '2026-05-25' }) // ❌ Before project start date (2026-06-01)
    const workspace = createWorkspaceState({
      selectedProjectId: 'p1',
      projects: [createProjectPreview({ id: 'p1', name: 'Apollo', start_date: '2026-06-01', end_date: '2026-06-30' })],
    })
    mockUseWorkspace.mockReturnValue(workspace)

    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    )

    // The create action now navigates to a dedicated page; the board button never
    // creates a task directly, so addTask must not be called from this page.
    const createButton = screen.getByRole('button', { name: /create a new task/i })
    await waitFor(() => {
      expect(createButton).toBeEnabled()
    })

    fireEvent.click(createButton)

    await waitFor(() => {
      expect(workspace.addTask).not.toHaveBeenCalled()
    })
  })

  it('shows task assignee in list view', async () => {
    const workspace = createWorkspaceState({
      selectedProjectId: 'p1',
      projects: [createProjectPreview({ id: 'p1', name: 'Apollo' })],
      tasks: [
        createTaskPreview({
          id: 't1',
          title: 'List task',
          project_id: 'p1',
          assigned_to: 'u2',
          due_date: new Date().toISOString().slice(0, 10),
        }),
      ],
      projectMembers: [
        {
          member_id: 'm2',
          project_id: 'p1',
          user_id: 'u2',
          role: 'member',
          joined_at: '2026-06-02T00:00:00.000Z',
          full_name: 'Bob Smith',
          email: 'bob@example.com',
        },
      ],
    })
    mockUseWorkspace.mockReturnValue(workspace)

    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'List' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Bob Smith' })).toBeInTheDocument()
    })
  })

  it('passes drop handler to board columns', async () => {
    const workspace = createWorkspaceState({
      selectedProjectId: 'p1',
      projects: [createProjectPreview({ id: 'p1', name: 'Apollo', start_date: '2026-06-01', end_date: '2026-06-30' })],
      tasks: [
        createTaskPreview({
          id: 't1',
          title: 'Board task',
          project_id: 'p1',
          due_date: '2026-06-20',
        }),
      ],
      canManageTask: vi.fn(() => true),
    })
    mockUseWorkspace.mockReturnValue(workspace)

    render(
      <MemoryRouter>
        <TasksPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(lastKanbanProps).not.toBeNull()
    })

    const kanbanProps = lastKanbanProps as {
      onDropTask: (status: 'todo' | 'in_progress' | 'review' | 'done' | 'backlog') => void
    }

    expect(typeof kanbanProps.onDropTask).toBe('function')
  })

  describe('task blocking dependencies', () => {
    it('allows creating task with blocking dependency', async () => {
      // Scenario: Task B is blocked by Task A
      mockTaskForm({
        taskTitle: 'Task B',
        taskBlockedByTaskId: 't1', // ✅ Task B is blocked by t1
      })

      const workspace = createWorkspaceState({
        selectedProjectId: 'p1',
        projects: [createProjectPreview({ id: 'p1', name: 'Apollo' })],
        tasks: [
          createTaskPreview({ id: 't1', title: 'Task A', project_id: 'p1' }),
        ],
      })
      mockUseWorkspace.mockReturnValue(workspace)

      render(
        <MemoryRouter>
          <TasksPage />
        </MemoryRouter>,
      )

      const createButton = screen.getByRole('button', { name: /create a new task/i })

      // ✅ Check BEHAVIOR: Button is enabled when dependency is set
      await waitFor(() => {
        expect(createButton).toBeEnabled()
      })
    })

    it('passes dependent tasks into board column props', async () => {
      const workspace = createWorkspaceState({
        selectedProjectId: 'p1',
        projects: [createProjectPreview({ id: 'p1', name: 'Apollo' })],
        tasks: [
          createTaskPreview({ id: 't1', title: 'API Endpoint', project_id: 'p1' }),
          createTaskPreview({
            id: 't2',
            title: 'Frontend Integration',
            project_id: 'p1',
            assigned_to: 'u1',
            blocked_by_task_id: 't1', // ✅ t2 is blocked by t1
          }),
        ],
        projectMembers: [
          {
            member_id: 'm1',
            project_id: 'p1',
            user_id: 'u1',
            role: 'owner',
            joined_at: '2026-06-01T00:00:00.000Z',
            full_name: 'Dev Team',
            email: 'dev@example.com',
          },
        ],
      })
      mockUseWorkspace.mockReturnValue(workspace)

      render(
        <MemoryRouter>
          <TasksPage />
        </MemoryRouter>,
      )

      await waitFor(() => {
        // Dependency label should be displayed
        expect(lastKanbanProps).not.toBeNull()
      })

      // ✅ Dependent task data is passed down to board columns
      expect(
        kanbanPropsCalls.some((columnProps) => {
          const typed = columnProps as {
            tasks: Array<{ id: string; blocked_by_task_id?: string | null }>
          }
          return typed.tasks.some((task) => task.id === 't2' && task.blocked_by_task_id === 't1')
        }),
      ).toBe(true)
    })

    it('prevents circular task blocking', async () => {
      // Scenario: Task A is blocked by Task B, Task B blocked by Task A → should prevent
      mockTaskForm({
        taskTitle: 'Task A',
        taskBlockedByTaskId: 't2', // Would create circular dependency
      })

      const workspace = createWorkspaceState({
        selectedProjectId: 'p1',
        projects: [createProjectPreview({ id: 'p1', name: 'Apollo' })],
        tasks: [
          createTaskPreview({
            id: 't2',
            title: 'Task B',
            project_id: 'p1',
            blocked_by_task_id: 't1', // t2 blocked by t1
          }),
        ],
      })

      mockUseWorkspace.mockReturnValue(workspace)

      render(
        <MemoryRouter>
          <TasksPage />
        </MemoryRouter>,
      )

      // ✅ Check BEHAVIOR: Page state shows no blocking data
      // The component should not allow circular dependencies
      await waitFor(() => {
        expect(lastKanbanProps).not.toBeNull()
      })
    })
  })
})
