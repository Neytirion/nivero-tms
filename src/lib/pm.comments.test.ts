import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  assertProjectEditable: vi.fn(),
  getProjectMembers: vi.fn(),
  recordProjectActivityEvent: vi.fn(),
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
}))

vi.mock('./pm.members', () => ({
  getProjectMembers: mocks.getProjectMembers,
}))

vi.mock('./pm.collaboration', () => ({
  recordProjectActivityEvent: mocks.recordProjectActivityEvent,
}))

import { createTaskComment } from './pm.comments'

describe('pm.comments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.assertProjectEditable.mockResolvedValue(undefined)
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u-actor' } }, error: null })
    mocks.getProjectMembers.mockResolvedValue([
      {
        member_id: 'm-1',
        project_id: 'p-1',
        user_id: 'u-mention',
        role: 'member',
        joined_at: '2026-06-01T00:00:00.000Z',
        full_name: 'Jane Doe',
        email: 'jane.doe@example.com',
      },
    ])
    mocks.recordProjectActivityEvent.mockResolvedValue(undefined)
  })

  it('persists comment mentions and records mention activity', async () => {
    const insertCommentSelect = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'c-1',
          project_id: 'p-1',
          task_id: 't-1',
          user_id: 'u-actor',
          message: 'Please review @jane.doe',
          created_at: '2026-06-01T00:00:00.000Z',
        },
        error: null,
      }),
    })
    const insertComment = vi.fn().mockReturnValue({ select: insertCommentSelect })
    const insertMentions = vi.fn().mockResolvedValue({ error: null })

    mocks.from.mockImplementation((table: string) => {
      if (table === 'comments') {
        return { insert: insertComment }
      }

      if (table === 'comment_mentions') {
        return { insert: insertMentions }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const result = await createTaskComment({
      projectId: 'p-1',
      taskId: 't-1',
      message: 'Please review @jane.doe',
    })

    expect(result.id).toBe('c-1')
    expect(insertMentions).toHaveBeenCalledWith([
      {
        project_id: 'p-1',
        comment_id: 'c-1',
        task_id: 't-1',
        mentioned_user_id: 'u-mention',
        mentioned_by_user_id: 'u-actor',
      },
    ])
    expect(mocks.recordProjectActivityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'comment.mentioned',
        entityType: 'comment_mention',
        entityId: 'c-1',
        payload: expect.objectContaining({
          taskId: 't-1',
          commentId: 'c-1',
          mentionedUserId: 'u-mention',
        }),
      }),
    )
  })

  it('does not create mention rows when no project member matches the handle', async () => {
    mocks.getProjectMembers.mockResolvedValue([
      {
        member_id: 'm-2',
        project_id: 'p-1',
        user_id: 'u-other',
        role: 'member',
        joined_at: '2026-06-01T00:00:00.000Z',
        full_name: 'Other Person',
        email: 'other@example.com',
      },
    ])

    const insertCommentSelect = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'c-2',
          project_id: 'p-1',
          task_id: 't-1',
          user_id: 'u-actor',
          message: 'Hello @missing',
          created_at: '2026-06-01T00:00:00.000Z',
        },
        error: null,
      }),
    })
    const insertComment = vi.fn().mockReturnValue({ select: insertCommentSelect })

    mocks.from.mockImplementation((table: string) => {
      if (table === 'comments') {
        return { insert: insertComment }
      }

      if (table === 'comment_mentions') {
        return { insert: vi.fn() }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    await createTaskComment({
      projectId: 'p-1',
      taskId: 't-1',
      message: 'Hello @missing',
    })

    expect(mocks.from).not.toHaveBeenCalledWith('comment_mentions')
    expect(mocks.recordProjectActivityEvent).toHaveBeenCalledTimes(1)
    expect(mocks.recordProjectActivityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'comment.created' }),
    )
  })
})