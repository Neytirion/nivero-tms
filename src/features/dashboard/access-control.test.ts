import { describe, expect, it } from 'vitest'
import type { ProjectPreview, TaskPreview } from '../../lib/pm'
import { createAccessControl } from './access-control'

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
    estimated_hours: 100,
    actual_hours: 0,
    budget_amount: null,
    progress_percent: 0,
    risk_status: 'green',
    status: 'active',
    completed_at: null,
    deadline_at: null,
    use_estimates: false,
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

describe('dashboard/access-control', () => {
  it('resolves owner role from current user and owner id', () => {
    const project = createProjectPreview({ owner_id: 'user-1' })
    const access = createAccessControl({
      projects: [project],
      currentUserId: 'user-1',
      membershipRoleByProjectId: { 'project-1': 'member' },
    })

    expect(access.getProjectRole('project-1')).toBe('owner')
  })

  it('blocks management actions on completed projects', () => {
    const project = createProjectPreview({ status: 'completed' })
    const access = createAccessControl({
      projects: [project],
      currentUserId: 'manager-1',
      membershipRoleByProjectId: { 'project-1': 'manager' },
    })

    expect(access.isProjectCompleted('project-1')).toBe(true)
    expect(access.canManageProject('project-1')).toBe(false)
    expect(access.canAssignTasksInProject('project-1')).toBe(false)
    expect(access.canInviteToProject('project-1')).toBe(false)
  })

  it('allows only owner to delete completed projects', () => {
    const completedProject = createProjectPreview({ status: 'completed' })

    const ownerAccess = createAccessControl({
      projects: [completedProject],
      currentUserId: 'owner-1',
      membershipRoleByProjectId: {},
    })

    const managerAccess = createAccessControl({
      projects: [completedProject],
      currentUserId: 'manager-1',
      membershipRoleByProjectId: { 'project-1': 'manager' },
    })

    expect(ownerAccess.canDeleteProject('project-1')).toBe(true)
    expect(managerAccess.canDeleteProject('project-1')).toBe(false)
  })

  it('allows member to manage only own unassigned task', () => {
    const project = createProjectPreview({ owner_id: 'owner-1' })
    const access = createAccessControl({
      projects: [project],
      currentUserId: 'member-1',
      membershipRoleByProjectId: { 'project-1': 'member' },
    })

    const ownUnassigned = createTaskPreview({
      created_by: 'member-1',
      assigned_to: null,
      project_id: 'project-1',
    })
    const othersTask = createTaskPreview({
      created_by: 'user-2',
      assigned_to: 'user-2',
      project_id: 'project-1',
    })

    expect(access.canManageTask(ownUnassigned)).toBe(true)
    expect(access.canDeleteTask(ownUnassigned)).toBe(true)
    expect(access.canManageTask(othersTask)).toBe(false)
    expect(access.canDeleteTask(othersTask)).toBe(false)
  })
})
