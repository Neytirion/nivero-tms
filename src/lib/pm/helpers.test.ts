import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('../supabase', () => ({
  supabase: {
    from: mocks.from,
  },
}))

import {
  assertProjectEditable,
  assertTaskDependencyValid,
  assertTaskDueDateWithinProjectRange,
  assertTaskWorkPackageValid,
  assertUserCanModifyTask,
  canUserAssignTasksInProject,
} from './helpers'

describe('pm.helpers', () => {
  beforeEach(() => {
    mocks.from.mockReset()
  })

  it('rejects due date outside project range', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { start_date: '2026-06-01', end_date: '2026-06-30' },
      error: null,
    })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    mocks.from.mockReturnValue({ select })

    await expect(assertTaskDueDateWithinProjectRange('p1', '2026-07-01')).rejects.toThrow(
      'Due date must be within project dates',
    )
  })

  it('blocks editing completed projects', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { status: 'completed' }, error: null })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    mocks.from.mockReturnValue({ select })

    await expect(assertProjectEditable('p1', 'edit project')).rejects.toThrow(
      'Cannot edit project: project is completed and read-only',
    )
  })

  it('validates task work package belongs to project and is active', async () => {
    mocks.from.mockImplementation((table: string) => {
      if (table === 'work_packages') {
        const maybeSingle = vi.fn().mockResolvedValue({
          data: { id: 'wp1', estimate_id: 'e1', is_active: false },
          error: null,
        })
        const eq = vi.fn().mockReturnValue({ maybeSingle })
        const select = vi.fn().mockReturnValue({ eq })
        return { select }
      }

      const maybeSingle = vi.fn().mockResolvedValue({
        data: { project_id: 'p1' },
        error: null,
      })
      const eq = vi.fn().mockReturnValue({ maybeSingle })
      const select = vi.fn().mockReturnValue({ eq })
      return { select }
    })

    await expect(assertTaskWorkPackageValid('p1', 'wp1')).rejects.toThrow(
      'Selected work package is archived and cannot be used for new tasks',
    )
  })

  it('returns false for task assignment when user is not privileged', async () => {
    mocks.from.mockImplementation((table: string) => {
      if (table === 'projects') {
        const maybeSingle = vi.fn().mockResolvedValue({
          data: { owner_id: 'owner-1' },
          error: null,
        })
        const eq = vi.fn().mockReturnValue({ maybeSingle })
        const select = vi.fn().mockReturnValue({ eq })
        return { select }
      }

      const maybeSingle = vi.fn().mockResolvedValue({
        data: { role: 'member' },
        error: null,
      })
      const eq = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) })
      const select = vi.fn().mockReturnValue({ eq })
      return { select }
    })

    await expect(canUserAssignTasksInProject('p1', 'u2')).resolves.toBe(false)
  })

  it('prevents deleting task without ownership or elevated role', async () => {
    mocks.from.mockImplementation((table: string) => {
      if (table === 'tasks') {
        const maybeSingle = vi.fn().mockResolvedValue({
          data: { project_id: 'p1', assigned_to: 'u1', created_by: 'u1' },
          error: null,
        })
        const eq = vi.fn().mockReturnValue({ maybeSingle })
        const select = vi.fn().mockReturnValue({ eq })
        return { select }
      }

      if (table === 'projects') {
        const maybeSingle = vi.fn().mockResolvedValue({
          data: { owner_id: 'owner-1' },
          error: null,
        })
        const eq = vi.fn().mockReturnValue({ maybeSingle })
        const select = vi.fn().mockReturnValue({ eq })
        return { select }
      }

      const maybeSingle = vi.fn().mockResolvedValue({
        data: { role: 'member' },
        error: null,
      })
      const eq = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) })
      const select = vi.fn().mockReturnValue({ eq })
      return { select }
    })

    await expect(assertUserCanModifyTask('t1', 'u2', 'delete')).rejects.toThrow(
      'Permission denied: you cannot delete this task',
    )
  })

  it('rejects dependency from another project', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 't-blocker', project_id: 'other-project', status: 'todo' },
      error: null,
    })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    mocks.from.mockReturnValue({ select })

    await expect(assertTaskDependencyValid('p1', 't1', 't-blocker')).rejects.toThrow(
      'Blocked-by task must belong to the same project',
    )
  })
})
