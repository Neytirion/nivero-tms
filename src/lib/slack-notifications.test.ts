import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}))

vi.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: mocks.invoke,
    },
  },
}))

import { notifySlackPilot } from './slack-notifications'

describe('notifySlackPilot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends notifications only to the pilot recipient', async () => {
    mocks.invoke.mockResolvedValue({ error: null })

    notifySlackPilot({
      recipientEmail: 'DANYLO@NIVERO.NO',
      actorEmail: 'manager@nivero.no',
      text: 'You were assigned a task',
    })

    await vi.waitFor(() => {
      expect(mocks.invoke).toHaveBeenCalledWith('slack-notify', {
        body: { email: 'danylo@nivero.no', text: 'You were assigned a task' },
      })
    })
  })

  it('does not send to other recipients or the actor', () => {
    notifySlackPilot({
      recipientEmail: 'other@nivero.no',
      actorEmail: 'manager@nivero.no',
      text: 'Not sent',
    })
    notifySlackPilot({
      recipientEmail: 'danylo@nivero.no',
      actorEmail: 'danylo@nivero.no',
      text: 'Not sent',
    })

    expect(mocks.invoke).not.toHaveBeenCalled()
  })
})