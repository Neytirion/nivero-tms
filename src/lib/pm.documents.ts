import { supabase } from './supabase'
import type { ProjectDocumentPreview, UploadProjectDocumentInput } from './pm.types'
import { assertProjectEditable } from './pm.helpers'
import { recordProjectActivityEvent } from './pm.collaboration'

const DOCUMENT_SIGNED_URL_TTL_SECONDS = 60 * 60

async function toDocumentPreviewWithAccessUrl(document: ProjectDocumentPreview) {
  // Legacy rows may still contain a full public URL from earlier policy versions.
  if (document.file_url.startsWith('http://') || document.file_url.startsWith('https://')) {
    return document
  }

  const { data, error } = await supabase.storage
    .from('project-documents')
    .createSignedUrl(document.file_url, DOCUMENT_SIGNED_URL_TTL_SECONDS)

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'Unable to create document access URL')
  }

  return {
    ...document,
    file_url: data.signedUrl,
  } satisfies ProjectDocumentPreview
}

export async function getProjectDocuments(projectId: string) {
  const { data, error } = await supabase
    .from('project_documents')
    .select('id,project_id,user_id,file_url,name,mime_type,size_bytes,created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const documents = data satisfies ProjectDocumentPreview[]

  return Promise.all(documents.map((item) => toDocumentPreviewWithAccessUrl(item)))
}

export async function uploadProjectDocument(input: UploadProjectDocumentInput) {
  await assertProjectEditable(input.projectId, 'upload document')

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!userData.user) {
    throw new Error('User is not authenticated')
  }

  const extension = input.file.name.split('.').pop()?.toLowerCase() || 'bin'
  const filePath = `${input.projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('project-documents')
    .upload(filePath, input.file, { upsert: false, cacheControl: '3600' })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const { data, error } = await supabase
    .from('project_documents')
    .insert({
      project_id: input.projectId,
      user_id: userData.user.id,
      file_url: filePath,
      name: input.file.name,
      mime_type: input.file.type || null,
      size_bytes: input.file.size,
    })
    .select('id,project_id,user_id,file_url,name,mime_type,size_bytes,created_at')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  await recordProjectActivityEvent({
    projectId: input.projectId,
    actorUserId: userData.user.id,
    eventType: 'document.uploaded',
    entityType: 'project_document',
    entityId: data.id,
    payload: {
      name: data.name,
      sizeBytes: data.size_bytes,
    },
  })

  return toDocumentPreviewWithAccessUrl(data satisfies ProjectDocumentPreview)
}