import { supabase } from '../../supabase'
import type { CommentMentionPreview, CommentPreview, UserMentionPreview } from '../types'
import { assertProjectEditable } from '../helpers'
import { getProjectMembers } from '../members'
import { recordProjectActivityEvent } from '../collaboration'

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

function dedupeMentionRows(
  rows: Array<{
    project_id: string
    comment_id: string
    task_id: string | null
    mentioned_user_id: string
    mentioned_by_user_id: string
  }>,
) {
  const seen = new Set<string>()
  const deduped: typeof rows = []

  for (const row of rows) {
    const key = `${row.comment_id}:${row.mentioned_user_id}`
    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    deduped.push(row)
  }

  return deduped
}

async function buildUserMentionRows(userId: string, limit: number) {
  type MentionRow = CommentMentionPreview & {
    comments: Pick<CommentPreview, 'id' | 'project_id' | 'task_id' | 'user_id' | 'message' | 'created_at'> | null
    projects: { id: string; name: string } | null
  }

  const { data, error } = await supabase
    .from('comment_mentions')
    .select(`
      id,
      project_id,
      comment_id,
      task_id,
      mentioned_user_id,
      mentioned_by_user_id,
      created_at,
      read_at,
      comments!inner(id,project_id,task_id,user_id,message,created_at),
      projects(id,name)
    `)
    .eq('mentioned_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as MentionRow[]
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
      .filter((member) => member.user_id !== actorId)
      .map((member) => ({
        project_id: input.projectId,
        comment_id: createdComment.id,
        task_id: input.taskId,
        mentioned_user_id: member.user_id as string,
        mentioned_by_user_id: actorId,
      }))
    const dedupedMentionRows = dedupeMentionRows(mentionRows)

    if (dedupedMentionRows.length > 0) {
      const { error: mentionError } = await supabase
        .from('comment_mentions')
        .insert(dedupedMentionRows)

      if (mentionError) {
        throw new Error(mentionError.message)
      }

      await Promise.all(
        dedupedMentionRows.map((mention) =>
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

export async function deleteComment(commentId: string) {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function getProjectComments(projectId: string) {
  const { data, error } = await supabase
    .from('comments')
    .select('id,project_id,task_id,user_id,message,created_at')
    .eq('project_id', projectId)
    .is('task_id', null)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies CommentPreview[]
}

export async function createProjectComment(input: { projectId: string; message: string }) {
  await assertProjectEditable(input.projectId, 'create project comment')

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw new Error(userError.message)
  if (!userData.user) throw new Error('User is not authenticated')

  const actorId = userData.user.id
  const message = input.message.trim()

  const { data, error } = await supabase
    .from('comments')
    .insert({ project_id: input.projectId, task_id: null, user_id: actorId, message })
    .select('id,project_id,task_id,user_id,message,created_at')
    .single()

  if (error) throw new Error(error.message)

  const createdComment = data satisfies CommentPreview

  await recordProjectActivityEvent({
    projectId: input.projectId,
    actorUserId: actorId,
    eventType: 'comment.created',
    entityType: 'comment',
    entityId: createdComment.id,
    payload: { messagePreview: message.slice(0, 120) },
  })

  const mentionHandles = getMentionHandlesFromMessage(message)
  if (mentionHandles.length > 0) {
    const projectMembers = await getProjectMembers(input.projectId)
    const mentionRows = mentionHandles.flatMap((handle) => {
      const matched = projectMembers.filter((m) =>
        buildMemberMentionCandidates(m).includes(handle),
      )
      return matched
        .filter((m) => m.user_id && m.user_id !== actorId)
        .map((m) => ({
          project_id: input.projectId,
          comment_id: createdComment.id,
          task_id: null as string | null,
          mentioned_user_id: m.user_id as string,
          mentioned_by_user_id: actorId,
        }))
    })
    const dedupedMentionRows = dedupeMentionRows(mentionRows)

    if (dedupedMentionRows.length > 0) {
      const { error: mentionError } = await supabase.from('comment_mentions').insert(dedupedMentionRows)
      if (mentionError) {
        throw new Error(mentionError.message)
      }

      await Promise.all(
        dedupedMentionRows.map((mention) =>
          recordProjectActivityEvent({
            projectId: input.projectId,
            actorUserId: actorId,
            eventType: 'comment.mentioned',
            entityType: 'comment_mention',
            entityId: createdComment.id,
            payload: { commentId: createdComment.id, mentionedUserId: mention.mentioned_user_id },
          }),
        ),
      )
    }
  }

  return createdComment
}

export async function getUserMentions(userId: string, limit = 50): Promise<UserMentionPreview[]> {
  const mentionRows = await buildUserMentionRows(userId, limit)

  return mentionRows
    .filter((mention) => Boolean(mention.comments))
    .map((mention) => ({
      mention: {
        id: mention.id,
        project_id: mention.project_id,
        comment_id: mention.comment_id,
        task_id: mention.task_id,
        mentioned_user_id: mention.mentioned_user_id,
        mentioned_by_user_id: mention.mentioned_by_user_id,
        created_at: mention.created_at,
        read_at: mention.read_at,
      },
      comment: mention.comments as Pick<CommentPreview, 'id' | 'project_id' | 'task_id' | 'user_id' | 'message' | 'created_at'>,
      project: mention.projects,
    }))
}

export async function getUnreadUserMentionsCount(userId: string) {
  const { count, error } = await supabase
    .from('comment_mentions')
    .select('id', { count: 'exact', head: true })
    .eq('mentioned_user_id', userId)
    .is('read_at', null)

  if (error) {
    throw new Error(error.message)
  }

  return count ?? 0
}

export async function getMentionStatesForUserInComments(input: {
  projectId: string
  userId: string
  commentIds: string[]
}) {
  if (input.commentIds.length === 0) {
    return [] as CommentMentionPreview[]
  }

  const { data, error } = await supabase
    .from('comment_mentions')
    .select('id,project_id,comment_id,task_id,mentioned_user_id,mentioned_by_user_id,created_at,read_at')
    .eq('project_id', input.projectId)
    .eq('mentioned_user_id', input.userId)
    .in('comment_id', input.commentIds)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as CommentMentionPreview[]
}

export async function markMentionAsRead(input: { mentionId: string; userId: string }) {
  const { data, error } = await supabase
    .from('comment_mentions')
    .update({ read_at: new Date().toISOString() })
    .eq('id', input.mentionId)
    .eq('mentioned_user_id', input.userId)
    .is('read_at', null)
    .select('id')
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return Boolean(data)
}

export async function markMentionsAsReadInProject(input: { projectId: string; userId: string }) {
  const { error } = await supabase
    .from('comment_mentions')
    .update({ read_at: new Date().toISOString() })
    .eq('project_id', input.projectId)
    .eq('mentioned_user_id', input.userId)
    .is('read_at', null)

  if (error) {
    throw new Error(error.message)
  }
}

export async function markMentionsAsReadInComments(input: {
  projectId: string
  userId: string
  commentIds: string[]
}) {
  if (input.commentIds.length === 0) {
    return
  }

  const { error } = await supabase
    .from('comment_mentions')
    .update({ read_at: new Date().toISOString() })
    .eq('project_id', input.projectId)
    .eq('mentioned_user_id', input.userId)
    .in('comment_id', input.commentIds)
    .is('read_at', null)

  if (error) {
    throw new Error(error.message)
  }
}