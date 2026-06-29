import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  hasProjectEstimateVersion: vi.fn(),
  getProjectUseEstimates: vi.fn(),
  assertProjectEditable: vi.fn(),
  assertTaskDependencyValid: vi.fn(),
  assertTaskDueDateWithinProjectRange: vi.fn(),
  assertTaskWorkPackageValid: vi.fn(),
  assertUserCanModifyTask: vi.fn(),
  canUserAssignTasksInProject: vi.fn(),
  getTaskProjectId: vi.fn(),
}))

vi.mock('../../supabase', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
    from: mocks.from,
  },
}))

vi.mock('../estimates', () => ({
  hasProjectEstimateVersion: mocks.hasProjectEstimateVersion,
}))

vi.mock('../projects', () => ({
  getProjectUseEstimates: mocks.getProjectUseEstimates,
}))

vi.mock('../helpers', () => ({
  assertProjectEditable: mocks.assertProjectEditable,
  assertTaskDependencyValid: mocks.assertTaskDependencyValid,
  assertTaskDueDateWithinProjectRange: mocks.assertTaskDueDateWithinProjectRange,
  assertTaskWorkPackageValid: mocks.assertTaskWorkPackageValid,
  assertUserCanModifyTask: mocks.assertUserCanModifyTask,
  canUserAssignTasksInProject: mocks.canUserAssignTasksInProject,
  getTaskProjectId: mocks.getTaskProjectId,
}))

import { createTask, updateTask } from './index'

describe('pm.tasks', () => {
  beforeEach(() => {
    mocks.from.mockReset()
    mocks.getUser.mockReset()
    mocks.hasProjectEstimateVersion.mockReset()
    mocks.getProjectUseEstimates.mockReset()
    mocks.assertProjectEditable.mockReset()
    mocks.assertTaskDependencyValid.mockReset()
    mocks.assertTaskDueDateWithinProjectRange.mockReset()
    mocks.assertTaskWorkPackageValid.mockReset()
    mocks.assertUserCanModifyTask.mockReset()
    mocks.canUserAssignTasksInProject.mockReset()
    mocks.getTaskProjectId.mockReset()

    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mocks.hasProjectEstimateVersion.mockResolvedValue(true)
    mocks.getProjectUseEstimates.mockResolvedValue(false)
    mocks.assertProjectEditable.mockResolvedValue(undefined)
    mocks.assertTaskDependencyValid.mockResolvedValue(null)
    mocks.assertTaskDueDateWithinProjectRange.mockResolvedValue(undefined)
    mocks.assertTaskWorkPackageValid.mockResolvedValue(undefined)
    mocks.assertUserCanModifyTask.mockResolvedValue(undefined)
    mocks.canUserAssignTasksInProject.mockResolvedValue(true)
    mocks.getTaskProjectId.mockResolvedValue('p1')
  })

  it('blocks task creation when estimate version is missing', async () => {
    mocks.getProjectUseEstimates.mockResolvedValue(true)
    mocks.hasProjectEstimateVersion.mockResolvedValue(false)

    await expect(
      createTask({
        projectId: 'p1',
        title: 'Implement API',
        estimateHours: 4,
      }),
    ).rejects.toThrow('Cannot create task: create estimate version v1 first')
  })

  it('blocks assigning task to another user without permission', async () => {
    mocks.canUserAssignTasksInProject.mockResolvedValue(false)

    await expect(
      createTask({
        projectId: 'p1',
        title: 'Implement API',
        estimateHours: 4,
        assignedTo: 'u2',
      }),
    ).rejects.toThrow('Permission denied: only owner, admin, or manager can assign tasks')
  })

  it('creates task with normalized insert payload', async () => {
    const insertedTask = {
      id: 't1',
      title: 'Implement API',
      status: 'todo',
      priority: 'medium',
      assigned_to: null,
      created_by: 'u1',
      estimate_hours: 4,
      actual_hours: 0,
      work_package_id: null,
      blocked_by_task_id: null,
      due_date: null,
      project_id: 'p1',
      created_at: '2026-06-01T00:00:00.000Z',
      description: null,
    }

    const single = vi.fn().mockResolvedValue({ data: insertedTask, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    mocks.from.mockReturnValue({ insert })

    const result = await createTask({
      projectId: 'p1',
      title: 'Implement API',
      estimateHours: 4,
    })

    // ✅ Проверяем РЕЗУЛЬТАТ функции, а не вызовы моков
    expect(result).toEqual(insertedTask)
    expect(result.id).toBe('t1')
    expect(result.title).toBe('Implement API')
    expect(result.estimate_hours).toBe(4)
    expect(result.created_by).toBe('u1')
    expect(result.status).toBe('todo')
    expect(result.project_id).toBe('p1')
  })

  it('prevents changing dependency after task creation', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { status: 'todo', blocked_by_task_id: 'dep-1' },
      error: null,
    })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    mocks.from.mockReturnValue({ select })

    await expect(
      updateTask('t1', {
        blocked_by_task_id: 'dep-2',
      }),
    ).rejects.toThrow('Permission denied: dependency cannot be changed after task creation')
  })

  it('blocks reassignment on update when actor cannot assign', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { status: 'todo', blocked_by_task_id: null },
      error: null,
    })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    mocks.from.mockReturnValue({ select })
    mocks.canUserAssignTasksInProject.mockResolvedValue(false)

    await expect(
      updateTask('t1', {
        assigned_to: 'u2',
      }),
    ).rejects.toThrow('Permission denied: only owner, admin, or manager can assign tasks')
  })

  describe('estimate hours validation', () => {
    beforeEach(() => {
      // Setup mocks for each validation test
      const single = vi.fn().mockResolvedValue({
        data: { id: 't-test', estimate_hours: 0 },
        error: null,
      })
      const select = vi.fn().mockReturnValue({ single })
      const insert = vi.fn().mockReturnValue({ select })
      mocks.from.mockReturnValue({ insert })
    })

    it('rejects negative estimate hours', async () => {
      mocks.getProjectUseEstimates.mockResolvedValue(true)
      mocks.hasProjectEstimateVersion.mockResolvedValue(true)

      await expect(
        createTask({
          projectId: 'p1',
          title: 'Task',
          estimateHours: -5, // ❌ Invalid
        }),
      ).rejects.toThrow('Estimated hours must be a number greater than or equal to 0')
    })

    it('rejects non-finite estimate hours', async () => {
      mocks.getProjectUseEstimates.mockResolvedValue(true)
      mocks.hasProjectEstimateVersion.mockResolvedValue(true)

      await expect(
        createTask({
          projectId: 'p1',
          title: 'Task',
          estimateHours: Infinity,
        }),
      ).rejects.toThrow('Estimated hours must be a number greater than or equal to 0')
    })

    it('accepts zero estimate hours', async () => {
      mocks.getProjectUseEstimates.mockResolvedValue(true)
      mocks.hasProjectEstimateVersion.mockResolvedValue(true)

      const insertedTask = {
        id: 't2',
        title: 'Task',
        estimate_hours: 0,
        project_id: 'p1',
        created_by: 'u1',
        status: 'todo',
        priority: 'medium',
        assigned_to: null,
        actual_hours: 0,
        work_package_id: null,
        blocked_by_task_id: null,
        due_date: null,
        created_at: '2026-06-01T00:00:00.000Z',
        description: null,
      }

      const single = vi.fn().mockResolvedValue({ data: insertedTask, error: null })
      const select = vi.fn().mockReturnValue({ single })
      const insert = vi.fn().mockReturnValue({ select })
      mocks.from.mockReturnValue({ insert })

      const result = await createTask({
        projectId: 'p1',
        title: 'Task',
        estimateHours: 0, // ✅ Valid
      })

      expect(result.estimate_hours).toBe(0)
    })
  })

  describe('estimate version requirement', () => {
    it('allows task creation when project does not use estimates', async () => {
      mocks.getProjectUseEstimates.mockResolvedValue(false)

      const insertedTask = {
        id: 't3',
        title: 'Task',
        estimate_hours: undefined,
        project_id: 'p1',
        created_by: 'u1',
        status: 'todo',
        priority: 'medium',
        assigned_to: null,
        actual_hours: 0,
        work_package_id: null,
        blocked_by_task_id: null,
        due_date: null,
        created_at: '2026-06-01T00:00:00.000Z',
        description: null,
      }

      const single = vi.fn().mockResolvedValue({ data: insertedTask, error: null })
      const select = vi.fn().mockReturnValue({ single })
      const insert = vi.fn().mockReturnValue({ select })
      mocks.from.mockReturnValue({ insert })

      // ✅ Should NOT require estimateHours when project doesn't use estimates
      const result = await createTask({
        projectId: 'p1',
        title: 'Task',
      })

      expect(result).toBeDefined()
      expect(result.id).toBe('t3')
    })

    it('requires estimate hours when project uses estimates', async () => {
      mocks.getProjectUseEstimates.mockResolvedValue(true)
      mocks.hasProjectEstimateVersion.mockResolvedValue(true)

      await expect(
        createTask({
          projectId: 'p1',
          title: 'Task',
          // ❌ Missing estimateHours when project requires estimates
        }),
      ).rejects.toThrow('Estimated hours is required')
    })
  })
})
