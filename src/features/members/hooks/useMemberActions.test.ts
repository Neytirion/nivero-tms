import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMemberActions } from './useMemberActions'

const mocks = vi.hoisted(() => ({
  inviteProjectMemberByEmail: vi.fn(),
  getProjectMembers: vi.fn(),
  updateProjectMemberRole: vi.fn(),
  getProjectMemberUnfinishedTasksCount: vi.fn(),
  removeProjectMember: vi.fn(),
  getUser: vi.fn(),
  notifySlackPilot: vi.fn(),
  formatProjectInviteNotification: vi.fn(() => 'invite text'),
}))

vi.mock('../../../lib/pm', () => ({
  inviteProjectMemberByEmail: mocks.inviteProjectMemberByEmail,
  getProjectMembers: mocks.getProjectMembers,
  updateProjectMemberRole: mocks.updateProjectMemberRole,
  getProjectMemberUnfinishedTasksCount: mocks.getProjectMemberUnfinishedTasksCount,
  removeProjectMember: mocks.removeProjectMember,
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getUser: mocks.getUser } },
}))

vi.mock('../../../lib/slack-notifications', () => ({
  notifySlackPilot: mocks.notifySlackPilot,
  formatProjectInviteNotification: mocks.formatProjectInviteNotification,
}))

function createDeps(overrides: Record<string, unknown> = {}) {
  return {
    selectedProjectId: 'p1',
    currentUserId: 'u1',
    projectMembers: [{ member_id: 'm1', user_id: 'u1', role: 'admin' }],
    setStatus: vi.fn(),
    setIsLoading: vi.fn(),
    setProjectMembers: vi.fn(),
    ensureProjectEditable: vi.fn(() => true),
    canInviteToProject: vi.fn(() => true),
    canUpdateProjectMemberRoles: vi.fn(() => true),
    canRemoveProjectMembers: vi.fn(() => true),
    reloadTasksAndMembers: vi.fn(async () => undefined),
    ...overrides,
  }
}

describe('useMemberActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.inviteProjectMemberByEmail.mockResolvedValue(undefined)
    mocks.getProjectMembers.mockResolvedValue([{ member_id: 'm2', user_id: 'u2', role: 'member' }])
    mocks.updateProjectMemberRole.mockResolvedValue(undefined)
    mocks.getProjectMemberUnfinishedTasksCount.mockResolvedValue(2)
    mocks.removeProjectMember.mockResolvedValue(undefined)
    mocks.getUser.mockResolvedValue({ data: { user: { email: 'owner@nivero.dev' } } })
  })

  it('rejects actions when no project is selected', async () => {
    const deps = createDeps({ selectedProjectId: null })
    const { result } = renderHook(() => useMemberActions(deps as never))

    await act(() => result.current.inviteMemberToSelectedProjectByEmail('member@nivero.dev'))
    await act(() => result.current.changeSelectedProjectMemberRole('u2', 'manager'))
    await act(() => result.current.removeSelectedProjectMember('u2', false))

    expect(mocks.inviteProjectMemberByEmail).not.toHaveBeenCalled()
    expect(mocks.updateProjectMemberRole).not.toHaveBeenCalled()
    expect(mocks.removeProjectMember).not.toHaveBeenCalled()
    expect(deps.setStatus).toHaveBeenCalledTimes(3)
  })

  it('prevents the last admin from demoting themselves', async () => {
    const deps = createDeps()
    const { result } = renderHook(() => useMemberActions(deps as never))

    await act(() => result.current.changeSelectedProjectMemberRole('u1', 'member'))

    expect(mocks.updateProjectMemberRole).not.toHaveBeenCalled()
    expect(deps.ensureProjectEditable).not.toHaveBeenCalled()
    expect(deps.setStatus).toHaveBeenCalledWith('You cannot change your role: add another admin first')
  })

  it('allows self-demotion when another admin exists and refreshes members', async () => {
    const deps = createDeps({
      projectMembers: [
        { member_id: 'm1', user_id: 'u1', role: 'admin' },
        { member_id: 'm2', user_id: 'u2', role: 'admin' },
      ],
    })
    const { result } = renderHook(() => useMemberActions(deps as never))

    await act(() => result.current.changeSelectedProjectMemberRole('u1', 'member'))

    expect(mocks.updateProjectMemberRole).toHaveBeenCalledWith({ projectId: 'p1', userId: 'u1', role: 'member' })
    expect(deps.setProjectMembers).toHaveBeenCalledWith(await mocks.getProjectMembers.mock.results[0].value)
    expect(deps.setIsLoading).toHaveBeenNthCalledWith(1, true)
    expect(deps.setIsLoading).toHaveBeenLastCalledWith(false)
  })

  it('invites a member, refreshes the list, and sends a notification', async () => {
    const deps = createDeps()
    const { result } = renderHook(() => useMemberActions(deps as never))

    await act(() => result.current.inviteMemberToSelectedProjectByEmail('new@nivero.dev', 'manager'))

    expect(mocks.inviteProjectMemberByEmail).toHaveBeenCalledWith({
      projectId: 'p1', email: 'new@nivero.dev', role: 'manager',
    })
    expect(mocks.notifySlackPilot).toHaveBeenCalledWith({
      recipientEmail: 'new@nivero.dev',
      actorEmail: 'owner@nivero.dev',
      text: 'invite text',
    })
    expect(deps.setStatus).toHaveBeenCalledWith('Member invited to project by email')
  })

  it('removes a member with the chosen task policy and reloads dependent state', async () => {
    const deps = createDeps()
    const { result } = renderHook(() => useMemberActions(deps as never))

    await act(() => result.current.removeSelectedProjectMember('u2', true))

    expect(mocks.removeProjectMember).toHaveBeenCalledWith({
      projectId: 'p1', userId: 'u2', unassignUnfinishedTasks: true,
    })
    expect(deps.reloadTasksAndMembers).toHaveBeenCalledWith('p1')
    expect(deps.setStatus).toHaveBeenCalledWith('Member removed from project')
  })
})