import { supabase } from './supabase'
import type { CommentPreview } from './pm.types'
import { assertProjectEditable } from './pm.helpers'
import { getProjectMembers } from './pm.members'
import { recordProjectActivityEvent } from './pm.collaboration'

const MENTION_TOKEN_RE = /(^|\s)@([a-zA-Z0-9._-]{2,64})/g

function normalizeMentionValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
}

function getMentionHandlesFromMessage(message: string) {
  const handles = new Set<string>()

  for (const match of message.matchAll(MENTION_TOKEN_RE)) {
    const candidate = normalizeMentionValue(match[2] ?? '')
    if (candidate) {
      handles.add(candidate)
    }
  }

  return Array.from(handles)
}

function buildMemberMentionCandidates(member: { user_id: string | null; full_name: string | null; email: string | null }) {
  const candidates = new Set<string>()

  if (member.email) {
    const localPart = member.email.split('@')[0]
    const normalizedLocalPart = normalizeMentionValue(localPart)
    if (normalizedLocalPart) {
      candidates.add(normalizedLocalPart)
    }
  }

  if (member.full_name) {
    const normalizedName = normalizeMentionValue(member.full_name)
    if (normalizedName) {
      candidates.add(normalizedName)
      candidates.add(normalizedName.replace(/\./g, ''))
    }
  }

  if (member.user_id) {
    candidates.add(normalizeMentionValue(member.user_id))
  }

  return Array.from(candidates).filter(Boolean)
}

export async function getTaskComments(taskId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('id,project_id,task_id,user_id,message,created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies CommentPreview[]
}

export async function getTaskCommentsCount(taskId: string) {
  const { count, error } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('task_id', taskId)

  if (error) {
    throw new Error(error.message)
  }

  return count ?? 0
}

export async function createTaskComment(input: { projectId: string; taskId: string; message: string }) {
  await assertProjectEditable(input.projectId, 'create task comment')

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!userData.user) {
    throw new Error('User is not authenticated')
  }

  const actorId = userData.user.id
  const message = input.message.trim()

  const { data, error } = await supabase
    .from('comments')
    .insert({
      project_id: input.projectId,
      task_id: input.taskId,
      user_id: actorId,
      message,
    })
    .select('id,project_id,task_id,user_id,message,created_at')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  const createdComment = data satisfies CommentPreview

  await recordProjectActivityEvent({
    projectId: input.projectId,
    actorUserId: actorId,
    eventType: 'comment.created',
    entityType: 'comment',
    entityId: createdComment.id,
    payload: {
      taskId: input.taskId,
      messagePreview: message.slice(0, 120),
    },
  })

  const mentionHandles = getMentionHandlesFromMessage(message)

  if (mentionHandles.length > 0) {
    const members = await getProjectMembers(input.projectId)

    const matchedMembers = members.filter((member) => {
      const candidates = buildMemberMentionCandidates(member)
      return candidates.some((candidate) => mentionHandles.includes(candidate))
    })

    const mentionRows = matchedMembers
      .filter((member) => member.user_id)
      .map((member) => ({
        project_id: input.projectId,
        comment_id: createdComment.id,
        task_id: input.taskId,
        mentioned_user_id: member.user_id as string,
        mentioned_by_user_id: actorId,
      }))

    if (mentionRows.length > 0) {
      const { error: mentionError } = await supabase
        .from('comment_mentions')
        .insert(mentionRows)

      if (mentionError) {
        throw new Error(mentionError.message)
      }

      await Promise.all(
        mentionRows.map((mention) =>
          recordProjectActivityEvent({
            projectId: input.projectId,
            actorUserId: actorId,
            eventType: 'comment.mentioned',
            entityType: 'comment_mention',
            entityId: createdComment.id,
            payload: {
              taskId: input.taskId,
              commentId: createdComment.id,
              mentionedUserId: mention.mentioned_user_id,
            },
          }),
        ),
      )
    }
  }

  return createdComment
}