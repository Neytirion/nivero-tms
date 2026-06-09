import { act, renderHook } from '@testing-library/react'
import type { FormEvent } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
      signInWithOAuth: mocks.signInWithOAuth,
    },
  },
}))

import { useAuthForm } from './useAuthForm'

function createSubmitEvent() {
  return {
    preventDefault: vi.fn(),
  } as unknown as FormEvent<HTMLFormElement>
}

describe('useAuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.signUp.mockResolvedValue({
      data: { user: { email: 'new@nivero.dev' }, session: null },
      error: null,
    })
    mocks.signInWithPassword.mockResolvedValue({ error: null })
    mocks.signInWithOAuth.mockResolvedValue({ data: { url: 'https://accounts.google.com' }, error: null })
  })

  it('shows confirmation message when sign-up succeeds without session', async () => {
    const { result } = renderHook(() => useAuthForm())

    act(() => {
      result.current.setMode('sign-up')
      result.current.setEmail('new@nivero.dev')
      result.current.setPassword('password123')
    })

    await act(async () => {
      await result.current.submit(createSubmitEvent())
    })

    expect(result.current.mode).toBe('sign-in')
    expect(result.current.status).toContain('Confirm your email before signing in.')
  })

  it('shows redirect message when sign-up returns active session', async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: { email: 'new@nivero.dev' }, session: { access_token: 'token' } },
      error: null,
    })

    const { result } = renderHook(() => useAuthForm())

    act(() => {
      result.current.setMode('sign-up')
      result.current.setEmail('new@nivero.dev')
      result.current.setPassword('password123')
    })

    await act(async () => {
      await result.current.submit(createSubmitEvent())
    })

    expect(result.current.status).toContain('Redirecting...')
  })

  it('prevents duplicate sign-in requests while a submit is in-flight', async () => {
    let resolveSignIn: ((value: { error: null }) => void) | undefined
    mocks.signInWithPassword.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve as (value: { error: null }) => void
      }),
    )

    const { result } = renderHook(() => useAuthForm())

    act(() => {
      result.current.setMode('sign-in')
      result.current.setEmail('user@nivero.dev')
      result.current.setPassword('password123')
    })

    const event = createSubmitEvent()

    await act(async () => {
      const firstSubmit = result.current.submit(event)
      const secondSubmit = result.current.submit(event)
      await Promise.resolve()
      resolveSignIn?.({ error: null })
      await Promise.all([firstSubmit, secondSubmit])
    })

    expect(mocks.signInWithPassword).toHaveBeenCalledTimes(1)
  })

  it('starts google oauth flow and sets redirect status', async () => {
    const { result } = renderHook(() => useAuthForm())

    await act(async () => {
      await result.current.signInWithGoogle()
    })

    expect(mocks.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'google',
      }),
    )
    expect(result.current.status).toContain('Redirecting to Google...')
  })

  it('prevents duplicate google oauth requests while the first call is in-flight', async () => {
    let resolveOauth: ((value: { data: { url: string }; error: null }) => void) | undefined
    mocks.signInWithOAuth.mockReturnValue(
      new Promise((resolve) => {
        resolveOauth = resolve as (value: { data: { url: string }; error: null }) => void
      }),
    )

    const { result } = renderHook(() => useAuthForm())

    await act(async () => {
      const firstCall = result.current.signInWithGoogle()
      const secondCall = result.current.signInWithGoogle()
      await Promise.resolve()
      resolveOauth?.({ data: { url: 'https://accounts.google.com' }, error: null })
      await Promise.all([firstCall, secondCall])
    })

    expect(mocks.signInWithOAuth).toHaveBeenCalledTimes(1)
  })
})