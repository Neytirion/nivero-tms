import { supabase } from './supabase'
import { assertProjectEditable, getUserProjectRole } from './pm.helpers'
import type { Json } from './database.types'
import type {
  ActivityEventPreview,
  ProjectWikiPagePreview,
  SaveProjectWikiInput,
} from './pm.types'
import { hasProjectPermission } from '../shared/utils/permissions'

export async function recordProjectActivityEvent(input: {
  projectId: string
  actorUserId: string | null
  eventType: string
  entityType: string
  entityId?: string | null
  payload?: Json
}) {
  const { error } = await supabase.from('activity_events').insert({
    project_id: input.projectId,
    actor_user_id: input.actorUserId,
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    payload: input.payload ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function getProjectActivityEvents(projectId: string, limit = 40) {
  const { data, error } = await supabase
    .from('activity_events')
    .select('id,project_id,actor_user_id,event_type,entity_type,entity_id,payload,created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies ActivityEventPreview[]
}

export async function getProjectWikiPage(projectId: string) {
  const { data, error } = await supabase
    .from('project_wiki_pages')
    .select('id,project_id,title,content,updated_by,created_at,updated_at')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? null) as ProjectWikiPagePreview | null
}

export async function saveProjectWikiPage(input: SaveProjectWikiInput) {
  await assertProjectEditable(input.projectId, 'save project wiki')

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  const actorId = userData.user?.id

  if (!actorId) {
    throw new Error('User is not authenticated')
  }

  const role = await getUserProjectRole(input.projectId, actorId)

  if (!hasProjectPermission(role, 'project.manage')) {
    throw new Error('Permission denied: only owner, admin, or manager can edit wiki')
  }

  const { data, error } = await supabase
    .from('project_wiki_pages')
    .upsert(
      {
        project_id: input.projectId,
        title: input.title.trim() || 'Project Wiki',
        content: input.content,
        updated_by: actorId,
      },
      {
        onConflict: 'project_id',
      },
    )
    .select('id,project_id,title,content,updated_by,created_at,updated_at')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await recordProjectActivityEvent({
    projectId: input.projectId,
    actorUserId: actorId,
    eventType: 'wiki.updated',
    entityType: 'project_wiki_page',
    entityId: data.id,
    payload: {
      title: data.title,
      contentLength: data.content.length,
    },
  })

  return data satisfies ProjectWikiPagePreview
}
