import { supabase } from './supabase'

export type UserNotificationPreferences = {
  slackEnabled: boolean
  emailEnabled: boolean
  mentionAlerts: boolean
  taskAssignments: boolean
  taskUpdates: boolean
  projectInvites: boolean
}

export const DEFAULT_USER_NOTIFICATION_PREFERENCES: UserNotificationPreferences = {
  slackEnabled: true,
  emailEnabled: true,
  mentionAlerts: true,
  taskAssignments: true,
  taskUpdates: true,
  projectInvites: true,
}

function normalizeUserNotificationPreferences(
  input: Partial<UserNotificationPreferences> | null | undefined,
): UserNotificationPreferences {
  return {
    slackEnabled: input?.slackEnabled ?? DEFAULT_USER_NOTIFICATION_PREFERENCES.slackEnabled,
    emailEnabled: input?.emailEnabled ?? DEFAULT_USER_NOTIFICATION_PREFERENCES.emailEnabled,
    mentionAlerts: input?.mentionAlerts ?? DEFAULT_USER_NOTIFICATION_PREFERENCES.mentionAlerts,
    taskAssignments: input?.taskAssignments ?? DEFAULT_USER_NOTIFICATION_PREFERENCES.taskAssignments,
    taskUpdates: input?.taskUpdates ?? DEFAULT_USER_NOTIFICATION_PREFERENCES.taskUpdates,
    projectInvites: input?.projectInvites ?? DEFAULT_USER_NOTIFICATION_PREFERENCES.projectInvites,
  }
}

export async function getUserNotificationPreferences(): Promise<UserNotificationPreferences> {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  const userId = userData.user?.id
  if (!userId) {
    return DEFAULT_USER_NOTIFICATION_PREFERENCES
  }

  const { data, error } = await supabase
    .from('user_notification_preferences')
    .select('slack_enabled,email_enabled,mention_alerts,task_assignments,task_updates,project_invites')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return DEFAULT_USER_NOTIFICATION_PREFERENCES
  }

  return normalizeUserNotificationPreferences({
    slackEnabled: data.slack_enabled,
    emailEnabled: data.email_enabled,
    mentionAlerts: data.mention_alerts,
    taskAssignments: data.task_assignments,
    taskUpdates: data.task_updates,
    projectInvites: data.project_invites,
  })
}

export async function saveUserNotificationPreferences(nextPreferences: UserNotificationPreferences) {
  const normalized = normalizeUserNotificationPreferences(nextPreferences)

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  const userId = userData.user?.id
  if (!userId) {
    throw new Error('User is not authenticated')
  }

  const { data, error } = await supabase
    .from('user_notification_preferences')
    .upsert({
      user_id: userId,
      slack_enabled: normalized.slackEnabled,
      email_enabled: normalized.emailEnabled,
      mention_alerts: normalized.mentionAlerts,
      task_assignments: normalized.taskAssignments,
      task_updates: normalized.taskUpdates,
      project_invites: normalized.projectInvites,
    })
    .select('slack_enabled,email_enabled,mention_alerts,task_assignments,task_updates,project_invites')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeUserNotificationPreferences({
    slackEnabled: data.slack_enabled,
    emailEnabled: data.email_enabled,
    mentionAlerts: data.mention_alerts,
    taskAssignments: data.task_assignments,
    taskUpdates: data.task_updates,
    projectInvites: data.project_invites,
  })
}
