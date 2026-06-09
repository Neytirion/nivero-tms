import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import { useWorkspace } from '../features/dashboard/workspace-context.tsx'
import type { WorkspaceState } from '../features/dashboard/workspace-context.tsx'
import { getProjectTasks, type ProjectPreview, type TaskPreview } from '../lib/pm'

function createProjectPreview(overrides: Partial<ProjectPreview> = {}): ProjectPreview {
  return {
    id: 'project-1',
    name: 'Project',
    description: null,
    owner_id: 'owner-1',
    customer_name: null,
    project_manager_id: null,
    start_date: null,
    end_date: null,
    estimated_hours: 0,
    actual_hours: 0,
    progress_percent: 0,
    risk_status: 'green',
    status: 'active',
    completed_at: null,
    deadline_at: null,
    created_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

function createTaskPreview(overrides: Partial<TaskPreview> = {}): TaskPreview {
  return {
    id: 'task-1',
    work_package_id: null,
    title: 'Task',
    description: null,
    status: 'todo',
    priority: 'medium',
    assigned_to: null,
    created_by: 'user-1',
    estimate_hours: 0,
    actual_hours: 0,
    blocked_by_task_id: null,
    due_date: null,
    project_id: 'project-1',
    created_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

function createWorkspaceState(overrides: Partial<WorkspaceState> = {}): WorkspaceState {
  const base: WorkspaceState = {
    status: 'Ready',
    setStatus: vi.fn(),
    isLoading: false,
    projects: [],
    tasks: [],
    projectMembers: [],
    selectedProjectId: null,
    currentUserId: null,
    getProjectRole: vi.fn(() => null),
    canManageProject: vi.fn(() => false),
    canDeleteProject: vi.fn(() => false),
    canAssignTasksInProject: vi.fn(() => false),
    canInviteToProject: vi.fn(() => false),
    canUpdateProjectMemberRoles: vi.fn(() => false),
    canRemoveProjectMembers: vi.fn(() => false),
    loadDashboardPreview: vi.fn(async () => undefined),
    selectProject: vi.fn(async () => undefined),
    addProject: vi.fn(async () => undefined),
    editProject: vi.fn(async () => undefined),
    removeProject: vi.fn(async () => undefined),
    addTask: vi.fn(async () => undefined),
    editTask: vi.fn(async () => undefined),
    removeTask: vi.fn(async () => undefined),
    inviteMemberToSelectedProjectByEmail: vi.fn(async () => undefined),
    changeSelectedProjectMemberRole: vi.fn(async () => undefined),
    getSelectedProjectMemberUnfinishedTasksCount: vi.fn(async () => 0),
    removeSelectedProjectMember: vi.fn(async () => undefined),
    completeSelectedProject: vi.fn(async () => undefined),
    canManageTask: vi.fn(() => false),
    canDeleteTask: vi.fn(() => false),
    resetDashboardPreview: vi.fn(),
  }

  return {
    ...base,
    ...overrides,
  }
}

vi.mock('../features/dashboard/workspace-context.tsx', () => ({
  useWorkspace: vi.fn(),
}))

vi.mock('../lib/pm', () => ({
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
  })

  it('shows only open tasks assigned to current user in My Tasks', () => {
    render(<DashboardPage />)

    expect(screen.getByText('My Tasks')).toBeTruthy()
    expect(screen.getByText(/Implement API/)).toBeTruthy()
    expect(screen.queryByText(/Write docs/)).toBeNull()
    expect(screen.getByText('Current project: Apollo')).toBeTruthy()
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
