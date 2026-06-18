import { act, renderHook } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  updateUser: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: mocks.updateUser,
    },
  },
}))

import { useProfileDetails } from './useProfileDetails'

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'user@example.com',
    user_metadata: {
      full_name: 'John Doe',
      display_name: 'johnny',
      bio: 'Initial bio',
      avatar_url: 'https://cdn.example/avatar.jpg',
    },
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as User
}

describe('useProfileDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.updateUser.mockResolvedValue({ error: null })
  })

  it('initializes state from user metadata', () => {
    const setStatus = vi.fn()
    const { result } = renderHook(() => useProfileDetails({ user: createUser(), setStatus }))

    expect(result.current.fullName).toBe('John Doe')
    expect(result.current.displayName).toBe('johnny')
    expect(result.current.bio).toBe('Initial bio')
    expect(result.current.avatarUrl).toBe('https://cdn.example/avatar.jpg')
    expect(result.current.isEditingProfile).toBe(false)
  })

  it('starts and cancels profile editing with snapshot restore', () => {
    const setStatus = vi.fn()
    const { result } = renderHook(() => useProfileDetails({ user: createUser(), setStatus }))

    act(() => {
      result.current.startEditingProfile()
    })

    expect(result.current.isEditingProfile).toBe(true)

    act(() => {
      result.current.setFullName('Changed Name')
      result.current.setDisplayName('changed')
      result.current.setBio('Changed bio')
      result.current.cancelEditingProfile()
    })

    expect(result.current.fullName).toBe('John Doe')
    expect(result.current.displayName).toBe('johnny')
    expect(result.current.bio).toBe('Initial bio')
    expect(result.current.isEditingProfile).toBe(false)
    expect(setStatus).toHaveBeenCalledWith('Profile editing canceled')
  })

  it('does not save when editing mode is disabled', async () => {
    const setStatus = vi.fn()
    const { result } = renderHook(() => useProfileDetails({ user: createUser(), setStatus }))

    await act(async () => {
      await result.current.saveProfile()
    })

    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it('saves normalized profile values and exits edit mode', async () => {
    const setStatus = vi.fn()
    const { result } = renderHook(() => useProfileDetails({ user: createUser(), setStatus }))

    act(() => {
      result.current.startEditingProfile()
      result.current.setFullName('  Jane Doe  ')
      result.current.setDisplayName('  janed  ')
      result.current.setBio('  New bio  ')
      result.current.setAvatarUrl('https://cdn.example/new-avatar.png')
    })

    await act(async () => {
      await result.current.saveProfile()
    })

    expect(mocks.updateUser).toHaveBeenCalledWith({
      data: {
        full_name: 'Jane Doe',
        display_name: 'janed',
        bio: 'New bio',
        avatar_url: 'https://cdn.example/new-avatar.png',
      },
    })
    expect(result.current.fullName).toBe('Jane Doe')
    expect(result.current.displayName).toBe('janed')
    expect(result.current.bio).toBe('New bio')
    expect(result.current.isEditingProfile).toBe(false)
    expect(result.current.isSavingProfile).toBe(false)
    expect(setStatus).toHaveBeenCalledWith('Profile updated')
  })

  it('reports save errors and keeps editing mode active', async () => {
    mocks.updateUser.mockResolvedValue({ error: { message: 'forbidden' } })

    const setStatus = vi.fn()
    const { result } = renderHook(() => useProfileDetails({ user: createUser(), setStatus }))

    act(() => {
      result.current.startEditingProfile()
      result.current.setFullName('Jane Doe')
    })

    await act(async () => {
      await result.current.saveProfile()
    })

    expect(setStatus).toHaveBeenCalledWith('Profile update error: forbidden')
    expect(result.current.isEditingProfile).toBe(true)
    expect(result.current.isSavingProfile).toBe(false)
  })
})
