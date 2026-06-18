import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  storageFrom: vi.fn(),
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: mocks.storageFrom,
    },
    auth: {
      updateUser: mocks.updateUser,
    },
  },
}))

import { useAvatarUpload } from './useAvatarUpload'

describe('useAvatarUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Date, 'now').mockReturnValue(123456789)

    mocks.storageFrom.mockReturnValue({
      upload: mocks.upload,
      getPublicUrl: mocks.getPublicUrl,
    })

    mocks.upload.mockResolvedValue({ error: null })
    mocks.getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.example/avatar.png' } })
    mocks.updateUser.mockResolvedValue({ error: null })
  })

  it('requires a selected file', async () => {
    const setStatus = vi.fn()
    const setAvatarUrl = vi.fn()

    const { result } = renderHook(() =>
      useAvatarUpload({
        userId: 'u1',
        fullName: 'John',
        displayName: 'johnny',
        bio: 'bio',
        setAvatarUrl,
        setStatus,
      }),
    )

    await act(async () => {
      await result.current.uploadAvatar()
    })

    expect(setStatus).toHaveBeenCalledWith('Select an image file first')
    expect(mocks.storageFrom).not.toHaveBeenCalled()
  })

  it('rejects non-image files', async () => {
    const setStatus = vi.fn()
    const setAvatarUrl = vi.fn()

    const { result } = renderHook(() =>
      useAvatarUpload({
        userId: 'u1',
        fullName: 'John',
        displayName: 'johnny',
        bio: 'bio',
        setAvatarUrl,
        setStatus,
      }),
    )

    act(() => {
      result.current.setAvatarFile(new File(['x'], 'notes.txt', { type: 'text/plain' }))
    })

    await act(async () => {
      await result.current.uploadAvatar()
    })

    expect(setStatus).toHaveBeenCalledWith('Only image files are allowed')
    expect(mocks.storageFrom).not.toHaveBeenCalled()
  })

  it('reports storage upload errors', async () => {
    mocks.upload.mockResolvedValue({ error: { message: 'bucket denied' } })

    const setStatus = vi.fn()
    const setAvatarUrl = vi.fn()

    const { result } = renderHook(() =>
      useAvatarUpload({
        userId: 'u1',
        fullName: 'John',
        displayName: 'johnny',
        bio: 'bio',
        setAvatarUrl,
        setStatus,
      }),
    )

    act(() => {
      result.current.setAvatarFile(new File(['img'], 'avatar.png', { type: 'image/png' }))
    })

    await act(async () => {
      await result.current.uploadAvatar()
    })

    expect(mocks.storageFrom).toHaveBeenCalledWith('avatars')
    expect(mocks.updateUser).not.toHaveBeenCalled()
    expect(setStatus).toHaveBeenCalledWith(
      'Avatar upload error: bucket denied. Ensure Storage bucket "avatars" exists and allows upload for authenticated users.',
    )
    expect(result.current.isUploadingAvatar).toBe(false)
  })

  it('reports profile metadata update errors after successful upload', async () => {
    mocks.updateUser.mockResolvedValue({ error: { message: 'metadata denied' } })

    const setStatus = vi.fn()
    const setAvatarUrl = vi.fn()

    const { result } = renderHook(() =>
      useAvatarUpload({
        userId: 'u1',
        fullName: ' John ',
        displayName: ' Johnny ',
        bio: ' Bio ',
        setAvatarUrl,
        setStatus,
      }),
    )

    act(() => {
      result.current.setAvatarFile(new File(['img'], 'avatar.jpeg', { type: 'image/jpeg' }))
    })

    await act(async () => {
      await result.current.uploadAvatar()
    })

    expect(mocks.updateUser).toHaveBeenCalledWith({
      data: {
        avatar_url: 'https://cdn.example/avatar.png',
        full_name: 'John',
        display_name: 'Johnny',
        bio: 'Bio',
      },
    })
    expect(setAvatarUrl).not.toHaveBeenCalled()
    expect(setStatus).toHaveBeenCalledWith('Avatar metadata update error: metadata denied')
  })

  it('updates avatar url and clears selected file on success', async () => {
    const setStatus = vi.fn()
    const setAvatarUrl = vi.fn()

    const { result } = renderHook(() =>
      useAvatarUpload({
        userId: 'u1',
        fullName: 'John',
        displayName: 'johnny',
        bio: 'bio',
        setAvatarUrl,
        setStatus,
      }),
    )

    act(() => {
      result.current.setAvatarFile(new File(['img'], 'avatar.png', { type: 'image/png' }))
    })

    await act(async () => {
      await result.current.uploadAvatar()
    })

    expect(mocks.upload).toHaveBeenCalledWith(
      'u1/avatar-123456789.png',
      expect.any(File),
      { upsert: true, cacheControl: '3600' },
    )
    expect(setAvatarUrl).toHaveBeenCalledWith('https://cdn.example/avatar.png')
    expect(setStatus).toHaveBeenCalledWith('Avatar uploaded')

    await act(async () => {
      await result.current.uploadAvatar()
    })

    expect(setStatus).toHaveBeenCalledWith('Select an image file first')
  })
})
