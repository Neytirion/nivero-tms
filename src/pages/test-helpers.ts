import { vi } from 'vitest'
import type { WorkspaceState } from '../features/dashboard/workspace-context.tsx'
import type { ProjectPreview, TaskPreview } from '../lib/pm'

export function createProjectPreview(overrides: Partial<ProjectPreview> = {}): ProjectPreview {
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

export function createTaskPreview(overrides: Partial<TaskPreview> = {}): TaskPreview {
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

export function createWorkspaceState(overrides: Partial<WorkspaceState> = {}): WorkspaceState {
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
