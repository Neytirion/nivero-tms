import { act, renderHook } from '@testing-library/react'
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

import { usePasswordChange } from './usePasswordChange'

describe('usePasswordChange', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.updateUser.mockResolvedValue({ error: null })
  })

  it('validates minimum password length', async () => {
    const setStatus = vi.fn()
    const { result } = renderHook(() => usePasswordChange({ setStatus }))

    act(() => {
      result.current.setNewPassword('12345')
      result.current.setConfirmNewPassword('12345')
    })

    await act(async () => {
      await result.current.changePassword()
    })

    expect(setStatus).toHaveBeenCalledWith('Password must be at least 6 characters long')
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it('validates password confirmation match', async () => {
    const setStatus = vi.fn()
    const { result } = renderHook(() => usePasswordChange({ setStatus }))

    act(() => {
      result.current.setNewPassword('password123')
      result.current.setConfirmNewPassword('password321')
    })

    await act(async () => {
      await result.current.changePassword()
    })

    expect(setStatus).toHaveBeenCalledWith('New password and confirmation do not match')
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it('handles update errors from Supabase', async () => {
    mocks.updateUser.mockResolvedValue({ error: { message: 'weak password' } })

    const setStatus = vi.fn()
    const { result } = renderHook(() => usePasswordChange({ setStatus }))

    act(() => {
      result.current.setNewPassword('password123')
      result.current.setConfirmNewPassword('password123')
    })

    await act(async () => {
      await result.current.changePassword()
    })

    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'password123' })
    expect(setStatus).toHaveBeenCalledWith('Password change error: weak password')
    expect(result.current.isChangingPassword).toBe(false)
  })

  it('resets fields and reports success on password update', async () => {
    const setStatus = vi.fn()
    const { result } = renderHook(() => usePasswordChange({ setStatus }))

    act(() => {
      result.current.setNewPassword('password123')
      result.current.setConfirmNewPassword('password123')
    })

    await act(async () => {
      await result.current.changePassword()
    })

    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'password123' })
    expect(result.current.newPassword).toBe('')
    expect(result.current.confirmNewPassword).toBe('')
    expect(result.current.isChangingPassword).toBe(false)
    expect(setStatus).toHaveBeenCalledWith('Password updated successfully')
  })
})
