import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  assertProjectEditable: vi.fn(),
}))

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
    from: mocks.from,
  },
}))

vi.mock('./pm.helpers', () => ({
  assertProjectEditable: mocks.assertProjectEditable,
}))

import { createTimeEntry, deleteTimeEntry, getTimeEntries, updateTimeEntry } from './pm.time'

const mockSupabase = {
  from: mocks.from,
  auth: {
    getUser: mocks.getUser,
  },
}

const mockAssertProjectEditable = mocks.assertProjectEditable

describe('pm.time', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAssertProjectEditable.mockResolvedValue(undefined)
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never)
  })

  it('loads time entries within the selected date range', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ data: [{ id: 'te-1' }], error: null }),
    }

    mockSupabase.from.mockReturnValue(query as never)

    await expect(getTimeEntries({ projectId: 'p1', fromDate: '2026-06-01', toDate: '2026-06-07' })).resolves.toEqual([
      { id: 'te-1' },
    ])
  })

  it('creates time entries for the authenticated user', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'te-1', user_id: 'u1', project_id: 'p1', minutes_spent: 120 },
      error: null,
    })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    mockSupabase.from.mockReturnValue({ insert } as never)

    await expect(
      createTimeEntry({
        projectId: 'p1',
        entryDate: '2026-06-05',
        hoursSpent: 2,
        isBillable: true,
        category: 'delivery',
      }),
    ).resolves.toMatchObject({ id: 'te-1', user_id: 'u1' })

    expect(mockAssertProjectEditable).toHaveBeenCalledWith('p1', 'log time')
  })

  it('updates an owned time entry', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'te-1', user_id: 'u1', project_id: 'p1', minutes_spent: 180 },
      error: null,
    })
    const select = vi.fn().mockReturnValue({ maybeSingle })
    const update = vi.fn().mockReturnValue({ select, eq: vi.fn().mockReturnValue({ select, maybeSingle }) })

    mockSupabase.from.mockReturnValue({ update, select } as never)

    await expect(
      updateTimeEntry('te-1', {
        projectId: 'p1',
        entryDate: '2026-06-06',
        hoursSpent: 3,
        isBillable: false,
        category: 'admin',
        notes: 'fixed',
      }),
    ).resolves.toMatchObject({ id: 'te-1', minutes_spent: 180 })

    expect(mockAssertProjectEditable).toHaveBeenCalledWith('p1', 'edit time entry')
  })

  it('deletes an owned time entry', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'te-1' }, error: null })
    const select = vi.fn().mockReturnValue({ maybeSingle })
    const deleteFn = vi.fn().mockReturnValue({ select, eq: vi.fn().mockReturnValue({ select, maybeSingle }) })
    mockSupabase.from.mockReturnValue({ delete: deleteFn } as never)

    await expect(deleteTimeEntry('te-1')).resolves.toBeUndefined()
  })
})