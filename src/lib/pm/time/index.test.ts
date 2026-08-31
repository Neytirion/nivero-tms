import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock('../../supabase', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
    from: mocks.from,
  },
}))

import { createTimeEntry, deleteTimeEntry, getTimeEntries, updateTimeEntry } from './index'

const mockSupabase = {
  from: mocks.from,
  auth: {
    getUser: mocks.getUser,
  },
}

describe('pm.time', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('filters time entries by task id when provided', async () => {
    const lte = vi.fn().mockResolvedValue({ data: [{ id: 'te-2' }], error: null })
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte,
    }

    mockSupabase.from.mockReturnValue(query as never)

    await expect(
      getTimeEntries({ projectId: 'p1', taskId: 't1', fromDate: '2026-06-01', toDate: '2026-06-07' }),
    ).resolves.toEqual([{ id: 'te-2' }])

    expect(query.eq).toHaveBeenCalledWith('task_id', 't1')
  })

  it('throws when time entries query fails', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ data: null, error: { message: 'db failed' } }),
    }

    mockSupabase.from.mockReturnValue(query as never)

    await expect(getTimeEntries({ fromDate: '2026-06-01', toDate: '2026-06-07' })).rejects.toThrow('db failed')
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
      }),
    ).resolves.toMatchObject({ id: 'te-1', user_id: 'u1' })
  })

  it('creates short timer entries with seconds and zero rounded minutes', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { id: 'te-short', user_id: 'u1', project_id: 'p1', minutes_spent: 0 },
      error: null,
    })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    mockSupabase.from.mockReturnValue({ insert } as never)

    await expect(
      createTimeEntry({
        projectId: 'p1',
        taskId: 't1',
        entryDate: '2026-06-05',
        hoursSpent: 0.0008,
        durationSeconds: 3,
        startedAt: '2026-06-05T10:00:00.000Z',
        endedAt: '2026-06-05T10:00:03.000Z',
        isBillable: true,
      }),
    ).resolves.toMatchObject({ id: 'te-short', minutes_spent: 0 })

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        minutes_spent: 0,
        started_at: '2026-06-05T10:00:00.000Z',
        ended_at: '2026-06-05T10:00:03.000Z',
      }),
    )
  })

  it('rejects creation for unauthenticated user', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null } as never)

    await expect(
      createTimeEntry({
        projectId: 'p1',
        entryDate: '2026-06-05',
        hoursSpent: 2,
        isBillable: true,
      }),
    ).rejects.toThrow('User is not authenticated')
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
      }),
    ).resolves.toMatchObject({ id: 'te-1', minutes_spent: 180 })
  })

  it('rejects update when entry is not owned by user', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
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
      }),
    ).rejects.toThrow('Permission denied: you cannot update this time entry')
  })

  it('deletes an owned time entry', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'te-1' }, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const deleteEq = vi.fn().mockReturnValue({ select })
    const deleteFn = vi.fn().mockReturnValue({ eq: deleteEq })
    mockSupabase.from.mockReturnValue({ delete: deleteFn } as never)

    await expect(deleteTimeEntry('te-1')).resolves.toBeUndefined()
  })

  it('rejects delete when entry is not owned by user', async () => {
    const single = vi.fn().mockRejectedValue(new Error('No rows were returned'))
    const select = vi.fn().mockReturnValue({ single })
    const deleteEq = vi.fn().mockReturnValue({ select })
    const deleteFn = vi.fn().mockReturnValue({ eq: deleteEq })
    mockSupabase.from.mockReturnValue({ delete: deleteFn } as never)

    await expect(deleteTimeEntry('te-1')).rejects.toThrow('Permission denied: you cannot delete this time entry')
  })
})