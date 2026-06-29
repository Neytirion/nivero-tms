import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  assertProjectEditable: vi.fn(),
}))

vi.mock('../../supabase', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
    from: mocks.from,
  },
}))

vi.mock('../helpers', () => ({
  assertProjectEditable: mocks.assertProjectEditable,
}))

import {
  completeProject,
  createProject,
  deleteProject,
  getMyProjects,
  updateProject,
} from '../projects'

describe('pm.projects', () => {
  beforeEach(() => {
    mocks.from.mockReset()
    mocks.getUser.mockReset()
    mocks.assertProjectEditable.mockReset()

    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mocks.assertProjectEditable.mockResolvedValue(undefined)
  })

  it('loads projects list', async () => {
    const order = vi.fn().mockResolvedValue({ data: [{ id: 'p1', name: 'Apollo' }], error: null })
    const select = vi.fn().mockReturnValue({ order })
    mocks.from.mockReturnValue({ select })

    await expect(getMyProjects()).resolves.toEqual([{ id: 'p1', name: 'Apollo' }])
  })

  it('rejects project creation when dates are invalid', async () => {
    await expect(
      createProject({
        name: 'Apollo',
        startDate: '2026-06-10',
        endDate: '2026-06-01',
      }),
    ).rejects.toThrow('End date cannot be earlier than start date')
  })

  it('creates project for authenticated user', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'p1', name: 'Apollo', owner_id: 'u1', use_estimates: false },
      error: null,
    })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    mocks.from.mockReturnValue({ insert })

    const result = await createProject({
      name: 'Apollo',
      customerName: 'ACME',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
    })

    // ✅ Check BEHAVIOR: project was created with correct properties
    expect(result.id).toBe('p1')
    expect(result.name).toBe('Apollo')
    expect(result.owner_id).toBe('u1')
    expect(result.use_estimates).toBe(false)
  })

  it('returns permission error when deleting inaccessible project', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const select = vi.fn().mockReturnValue({ maybeSingle })
    const eq = vi.fn().mockReturnValue({ select })
    const del = vi.fn().mockReturnValue({ eq })
    mocks.from.mockReturnValue({ delete: del })

    await expect(deleteProject('p1')).rejects.toThrow(
      'Permission denied: only owner or admin can delete this project',
    )
  })

  it('updates project and checks editable guard', async () => {
    mocks.assertProjectEditable.mockResolvedValue(undefined)

    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'p1', name: 'Apollo Updated', owner_id: 'u1' },
      error: null,
    })
    const select = vi.fn().mockReturnValue({ maybeSingle })
    const eq = vi.fn().mockReturnValue({ select })
    const update = vi.fn().mockReturnValue({ eq })
    mocks.from.mockReturnValue({ update })

    const result = await updateProject('p1', {
      name: 'Apollo Updated',
    })

    // ✅ Check BEHAVIOR: project was updated and returned with new data
    expect(result.id).toBe('p1')
    expect(result.name).toBe('Apollo Updated')

    // ✅ Check that permission guard was called (security check)
    expect(mocks.assertProjectEditable).toHaveBeenCalledWith('p1', 'edit project')
  })

  it('blocks completion when unfinished tasks remain', async () => {
    // ✅ Check BEHAVIOR: throws error when unfinished tasks exist
    mocks.from.mockImplementation((table: string) => {
      if (table === 'tasks') {
        // Simulate query that finds unfinished task
        const eq = vi.fn().mockResolvedValue({
          data: [{ status: 'in_progress' }], // ❌ Unfinished task
          error: null,
        })
        const select = vi.fn().mockReturnValue({ eq })
        return { select }
      }
      // Fallback for projects table
      const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'p1' }, error: null })
      const select = vi.fn().mockReturnValue({ maybeSingle })
      const eq = vi.fn().mockReturnValue({ select })
      const update = vi.fn().mockReturnValue({ eq })
      return { update }
    })

    await expect(completeProject('p1')).rejects.toThrow(
      'Cannot complete project: 1 unfinished task(s) remain',
    )

    // ✅ Verify permission guard was checked
    expect(mocks.assertProjectEditable).toHaveBeenCalledWith('p1', 'complete project')
  })

  describe('project dates validation', () => {
    it('rejects when start date is after end date', async () => {
      await expect(
        createProject({
          name: 'Invalid Project',
          startDate: '2026-06-30',
          endDate: '2026-06-01', // ❌ Earlier than start
        }),
      ).rejects.toThrow('End date cannot be earlier than start date')
    })

    it('allows same start and end date', async () => {
      const single = vi.fn().mockResolvedValue({
        data: {
          id: 'p2',
          name: 'Same Date Project',
          start_date: '2026-06-01',
          end_date: '2026-06-01',
          use_estimates: false,
        },
        error: null,
      })
      const select = vi.fn().mockReturnValue({ single })
      const insert = vi.fn().mockReturnValue({ select })
      mocks.from.mockReturnValue({ insert })

      const result = await createProject({
        name: 'Same Date Project',
        startDate: '2026-06-01',
        endDate: '2026-06-01', // ✅ Valid
      })

      expect(result.id).toBe('p2')
    })
  })
})
