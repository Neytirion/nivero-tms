import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}))

vi.mock('../supabase', () => ({
  supabase: {
    functions: {
      invoke: mocks.invoke,
    },
  },
}))

import { submitClientIntake } from './client-intake'

describe('pm.client-intake', () => {
  beforeEach(() => {
    mocks.invoke.mockReset()
  })

  it('submits client intake request successfully', async () => {
    mocks.invoke.mockResolvedValue({
      data: { success: true, taskId: 'task-123' },
      error: null,
    })

    await expect(
      submitClientIntake({
        token: '11111111-1111-4111-8111-111111111111',
        title: 'Checkout issue',
        message: 'Checkout button overlaps footer on mobile.',
      }),
    ).resolves.toEqual({ success: true, taskId: 'task-123' })

    expect(mocks.invoke).toHaveBeenCalledWith('submit-client-intake', {
      body: {
        token: '11111111-1111-4111-8111-111111111111',
        title: 'Checkout issue',
        message: 'Checkout button overlaps footer on mobile.',
      },
    })
  })

  it('throws helper-level error when response has no task id', async () => {
    mocks.invoke.mockResolvedValue({
      data: { success: true, taskId: '' },
      error: null,
    })

    await expect(
      submitClientIntake({
        token: '11111111-1111-4111-8111-111111111111',
        title: 'Missing ID',
        message: 'Server returned malformed payload for created task.',
      }),
    ).rejects.toThrow('Failed to submit client request')
  })

  it('surfaces edge function JSON error message when available', async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: new Response(JSON.stringify({ error: 'Project link is invalid or expired' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }),
      },
    })

    await expect(
      submitClientIntake({
        token: '11111111-1111-4111-8111-111111111111',
        title: 'Bad token',
        message: 'Should return detailed server message to user.',
      }),
    ).rejects.toThrow('Project link is invalid or expired')
  })

  it('falls back to plain-text response body when JSON parsing fails', async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: new Response('Not authenticated', {
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        }),
      },
    })

    await expect(
      submitClientIntake({
        token: '11111111-1111-4111-8111-111111111111',
        title: 'Auth issue',
        message: 'Should surface text body from edge function.',
      }),
    ).rejects.toThrow('Not authenticated')
  })
})
