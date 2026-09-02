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

export async function getProjectName(projectId: string) {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data?.name ?? 'Untitled project'
  } catch (error) {
    console.warn('Unable to resolve Slack notification project', error)
    return 'Untitled project'
  }
}

function taskUrl(taskId: string) {
  return `${window.location.origin}/app/tasks/${taskId}`
}

function projectDiscussionUrl(projectId: string) {
  return `${window.location.origin}/app/projects/${projectId}?tab=collaboration`
}

function projectUrl(projectId: string) {
  return `${window.location.origin}/app/projects/${projectId}`
}

function slackLink(url: string, label: string) {
  return `<${url}|${label}>`
}

export function getActorName(user: { email?: string | null; user_metadata?: Record<string, unknown> }) {
  const displayName = user.user_metadata?.display_name
  const fullName = user.user_metadata?.full_name

  return typeof displayName === 'string' && displayName.trim()
    ? displayName.trim()
    : typeof fullName === 'string' && fullName.trim()
      ? fullName.trim()
      : user.email ?? 'A teammate'
}

export function formatTaskAssignmentNotification(input: { taskTitle: string; projectName: string; taskId: string }) {
  return `*Task assigned to you*\n*${input.taskTitle}*\nProject: ${input.projectName}\n${slackLink(taskUrl(input.taskId), 'Open task')}`
}

export function formatTaskMentionNotification(input: { actorName: string; taskTitle: string; message: string; taskId: string }) {
  return `*You were mentioned in a task comment*\n${input.actorName} mentioned you on *${input.taskTitle}*\n>${input.message.slice(0, 300)}\n${slackLink(taskUrl(input.taskId), 'Open task')}`
}

export function formatProjectMentionNotification(input: { actorName: string; projectName: string; message: string; projectId: string }) {
  return `*You were mentioned in a project comment*\n${input.actorName} mentioned you in *${input.projectName}*\n>${input.message.slice(0, 300)}\n${slackLink(projectDiscussionUrl(input.projectId), 'Open discussion')}`
}

export function formatTaskUpdateNotification(input: { taskTitle: string; lines: string[]; taskId: string }) {
  return `*Task update*\n*${input.taskTitle}*\n${input.lines.join('\n')}\n${slackLink(taskUrl(input.taskId), 'Open task')}`
}

export function formatProjectInviteNotification(projectId: string) {
  return `*You were added to a project in Nivero*\n${slackLink(projectUrl(projectId), 'Open project')}`
}

export async function getTaskTitle(taskId: string) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('title')
      .eq('id', taskId)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data?.title ?? 'A task'
  } catch (error) {
    console.warn('Unable to resolve Slack notification task', error)
    return 'A task'
  }
}