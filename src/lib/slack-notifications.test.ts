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

import {
  formatProjectMentionNotification,
  formatTaskAssignmentNotification,
  formatTaskMentionNotification,
  notifySlackPilot,
} from './slack-notifications'

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

  it('formats assignments and mentions with compact Slack links', () => {
    expect(formatTaskAssignmentNotification({
      taskTitle: 'Prepare estimate',
      projectName: 'Website redesign',
      taskId: 'task-1',
    })).toContain('Project: Website redesign')

    expect(formatTaskMentionNotification({
      actorName: 'Alex Smith',
      taskTitle: 'Prepare estimate',
      message: 'Please review this.',
      taskId: 'task-1',
    })).toContain('Alex Smith mentioned you on *Prepare estimate*')

    expect(formatProjectMentionNotification({
      actorName: 'Alex Smith',
      projectName: 'Website redesign',
      message: 'Please review this.',
      projectId: 'project-1',
    })).toContain('<http://localhost:3000/app/projects/project-1?tab=collaboration|Open discussion>')
  })
})