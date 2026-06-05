import { describe, expect, it } from 'vitest'
import { hasProjectPermission, normalizeProjectRole, resolveProjectRole } from './permissions'

describe('permissions', () => {
  it('normalizes unknown roles to member', () => {
    expect(normalizeProjectRole('something-else')).toBe('member')
  })

  it('resolves owner role when current user owns project', () => {
    expect(
      resolveProjectRole({
        currentUserId: 'user-1',
        ownerId: 'user-1',
        membershipRole: 'member',
      }),
    ).toBe('owner')
  })

  it('returns null when there is no membership and not owner', () => {
    expect(
      resolveProjectRole({
        currentUserId: 'user-1',
        ownerId: 'user-2',
        membershipRole: null,
      }),
    ).toBeNull()
  })

  it('grants manager task assignment permission', () => {
    expect(hasProjectPermission('manager', 'task.assign')).toBe(true)
  })

  it('does not grant member delete any task permission', () => {
    expect(hasProjectPermission('member', 'task.delete.any')).toBe(false)
  })
})