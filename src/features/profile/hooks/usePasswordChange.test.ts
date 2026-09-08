import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      updateUser: mocks.updateUser,
    },
  },
}))

import { usePasswordChange } from './usePasswordChange'

describe('usePasswordChange', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.signInWithPassword.mockResolvedValue({ error: null })
    mocks.updateUser.mockResolvedValue({ error: null })
  })

  const renderPasswordChange = (setStatus = vi.fn()) => ({
    setStatus,
    ...renderHook(() => usePasswordChange({ email: 'user@nivero.dev', setStatus })),
  })

  it('requires the current password', async () => {
    const { result, setStatus } = renderPasswordChange()

    await act(async () => {
      await result.current.changePassword()
    })

    expect(setStatus).toHaveBeenCalledWith('Enter your current password')
    expect(mocks.signInWithPassword).not.toHaveBeenCalled()
  })

  it('validates minimum password length', async () => {
    const setStatus = vi.fn()
    const { result } = renderPasswordChange(setStatus)

    act(() => {
      result.current.setCurrentPassword('current-password')
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
    const { result } = renderPasswordChange(setStatus)

    act(() => {
      result.current.setCurrentPassword('current-password')
      result.current.setNewPassword('password123')
      result.current.setConfirmNewPassword('password321')
    })

    await act(async () => {
      await result.current.changePassword()
    })

    expect(setStatus).toHaveBeenCalledWith('New password and confirmation do not match')
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it('rejects an incorrect current password', async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    const { result, setStatus } = renderPasswordChange()

    act(() => {
      result.current.setCurrentPassword('wrong-password')
      result.current.setNewPassword('password123')
      result.current.setConfirmNewPassword('password123')
    })

    await act(async () => {
      await result.current.changePassword()
    })

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@nivero.dev',
      password: 'wrong-password',
    })
    expect(mocks.updateUser).not.toHaveBeenCalled()
    expect(setStatus).toHaveBeenCalledWith('Current password is incorrect')
  })

  it('handles update errors from Supabase', async () => {
    mocks.updateUser.mockResolvedValue({ error: { message: 'weak password' } })

    const setStatus = vi.fn()
    const { result } = renderPasswordChange(setStatus)

    act(() => {
      result.current.setCurrentPassword('current-password')
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
    const { result } = renderPasswordChange(setStatus)

    act(() => {
      result.current.setCurrentPassword('current-password')
      result.current.setNewPassword('password123')
      result.current.setConfirmNewPassword('password123')
    })

    await act(async () => {
      await result.current.changePassword()
    })

    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'password123' })
    expect(result.current.currentPassword).toBe('')
    expect(result.current.newPassword).toBe('')
    expect(result.current.confirmNewPassword).toBe('')
    expect(result.current.isChangingPassword).toBe(false)
    expect(setStatus).toHaveBeenCalledWith('Password updated successfully')
  })
})
