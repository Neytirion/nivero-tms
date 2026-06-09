import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  assertProjectEditable: vi.fn(),
  getUserProjectRole: vi.fn(),
  hasProjectPermission: vi.fn(),
}))

vi.mock('./supabase', () => ({
  supabase: {
    from: mocks.from,
    auth: {
      getUser: mocks.getUser,
    },
  },
}))

vi.mock('./pm.helpers', () => ({
  assertProjectEditable: mocks.assertProjectEditable,
  getUserProjectRole: mocks.getUserProjectRole,
}))

vi.mock('../shared/utils/permissions', () => ({
  hasProjectPermission: mocks.hasProjectPermission,
}))

import { getProjectActivityEvents, saveProjectWikiPage } from './pm.collaboration'

describe('pm.collaboration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.assertProjectEditable.mockResolvedValue(undefined)
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never)
    mocks.getUserProjectRole.mockResolvedValue('manager')
    mocks.hasProjectPermission.mockReturnValue(true)
  })

  it('rejects wiki save when user has no project manage permission', async () => {
    mocks.hasProjectPermission.mockReturnValue(false)

    await expect(
      saveProjectWikiPage({
        projectId: 'p1',
        title: 'Wiki',
        content: 'content',
      }),
    ).rejects.toThrow('Permission denied: only owner, admin, or manager can edit wiki')
  })

  it('saves wiki and records activity event', async () => {
    const upsertSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'w1',
        project_id: 'p1',
        title: 'Project Wiki',
        content: 'Knowledge base',
        updated_by: 'u1',
        created_at: '2026-06-01T00:00:00.000Z',
        updated_at: '2026-06-01T00:00:00.000Z',
      },
      error: null,
    })
    const upsertSelect = vi.fn().mockReturnValue({ single: upsertSingle })
    const upsert = vi.fn().mockReturnValue({ select: upsertSelect })

    const insertEvent = vi.fn().mockResolvedValue({ error: null })

    mocks.from.mockImplementation((table: string) => {
      if (table === 'project_wiki_pages') {
        return { upsert }
      }

      if (table === 'activity_events') {
        return { insert: insertEvent }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const saved = await saveProjectWikiPage({
      projectId: 'p1',
      title: '  Project Wiki  ',
      content: 'Knowledge base',
    })

    expect(mocks.assertProjectEditable).toHaveBeenCalledWith('p1', 'save project wiki')
    expect(insertEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 'p1',
        actor_user_id: 'u1',
        event_type: 'wiki.updated',
      }),
    )
    expect(saved.id).toBe('w1')
  })

  it('loads project activity events with descending order and limit', async () => {
    const limit = vi.fn().mockResolvedValue({ data: [{ id: 'e1' }], error: null })
    const order = vi.fn().mockReturnValue({ limit })
    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq })
    mocks.from.mockReturnValue({ select } as never)

    const result = await getProjectActivityEvents('p1', 10)

    expect(mocks.from).toHaveBeenCalledWith('activity_events')
    expect(limit).toHaveBeenCalledWith(10)
    expect(result).toEqual([{ id: 'e1' }])
  })
})
