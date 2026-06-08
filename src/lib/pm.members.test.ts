import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getProjectMemberUnfinishedTasksCount, getProjectMembers, inviteProjectMemberByEmail } from './pm.members'
import { supabase } from './supabase'
import { assertProjectEditable } from './pm.helpers'

vi.mock('./supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}))

vi.mock('./pm.helpers', () => ({
  assertProjectEditable: vi.fn(),
}))

const mockSupabase = vi.mocked(supabase)
const mockAssertProjectEditable = vi.mocked(assertProjectEditable)

describe('pm.members', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAssertProjectEditable.mockResolvedValue(undefined)
  })

  it('loads project members via rpc', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [{ member_id: 'm1', user_id: 'u1', role: 'member' }],
      error: null,
    } as never)

    const result = await getProjectMembers('p1')

    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_project_members_with_profile', {
      p_project_id: 'p1',
    })
    expect(result).toEqual([{ member_id: 'm1', user_id: 'u1', role: 'member' }])
  })

  it('falls back to old invite rpc signature when role arg is unavailable', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'Could not find the function public.invite_project_member_by_email' },
      } as never)
      .mockResolvedValueOnce({ data: { invited: true }, error: null } as never)

    const result = await inviteProjectMemberByEmail({
      email: 'member@nivero.dev',
      projectId: 'p1',
      role: 'manager',
    })

    expect(mockAssertProjectEditable).toHaveBeenCalledWith('p1', 'invite members')
    expect(mockSupabase.rpc).toHaveBeenNthCalledWith(1, 'invite_project_member_by_email', {
      p_email: 'member@nivero.dev',
      p_project_id: 'p1',
      p_role: 'manager',
    })
    expect(mockSupabase.rpc).toHaveBeenNthCalledWith(2, 'invite_project_member_by_email', {
      p_email: 'member@nivero.dev',
      p_project_id: 'p1',
    })
    expect(result).toEqual({ invited: true })
  })

  it('counts only unfinished member tasks', async () => {
    const query: {
      select: ReturnType<typeof vi.fn>
      eq: ReturnType<typeof vi.fn>
    } = {
      select: vi.fn(),
      eq: vi.fn(),
    }

    query.select.mockReturnValue(query)
    query.eq
      .mockImplementationOnce(() => query)
      .mockImplementationOnce(async () => ({
        data: [
          { status: 'todo' },
          { status: 'in_progress' },
          { status: 'done' },
          { status: 'completed' },
        ],
        error: null,
      }))

    mockSupabase.from.mockReturnValue(query as never)

    const count = await getProjectMemberUnfinishedTasksCount('p1', 'u1')

    expect(count).toBe(2)
  })
})
