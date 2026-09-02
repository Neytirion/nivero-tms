import { supabase } from './supabase'

const PILOT_RECIPIENT_EMAIL = 'danylo@nivero.no'

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? ''
}

export function notifySlackPilot(input: { recipientEmail: string | null | undefined; actorEmail?: string | null; text: string }) {
  const recipientEmail = normalizeEmail(input.recipientEmail)

  if (recipientEmail !== PILOT_RECIPIENT_EMAIL || recipientEmail === normalizeEmail(input.actorEmail)) {
    return
  }

  void supabase.functions
    .invoke('slack-notify', { body: { email: recipientEmail, text: input.text } })
    .then(({ error }) => {
      if (error) {
        console.warn('Slack notification failed', error)
      }
    })
    .catch((error: unknown) => {
      console.warn('Slack notification failed', error)
    })
}

export async function getProjectMemberEmail(projectId: string, userId: string) {
  try {
    const { data, error } = await supabase.rpc('get_project_members_with_profile', {
      p_project_id: projectId,
    })

    if (error) {
      throw error
    }

    return data.find((member) => member.user_id === userId)?.email ?? null
  } catch (error) {
    console.warn('Unable to resolve Slack notification recipient', error)
    return null
  }
}

export function taskUrl(taskId: string) {
  return `${window.location.origin}/app/tasks/${taskId}`
}