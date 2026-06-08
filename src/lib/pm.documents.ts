import { supabase } from './supabase'
import type { ProjectDocumentPreview, UploadProjectDocumentInput } from './pm.types'
import { assertProjectEditable } from './pm.helpers'

export async function getProjectDocuments(projectId: string) {
  const { data, error } = await supabase
    .from('project_documents')
    .select('id,project_id,user_id,file_url,name,mime_type,size_bytes,created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies ProjectDocumentPreview[]
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

  const { data: publicUrlData } = supabase.storage.from('project-documents').getPublicUrl(filePath)

  const { data, error } = await supabase
    .from('project_documents')
    .insert({
      project_id: input.projectId,
      user_id: userData.user.id,
      file_url: publicUrlData.publicUrl,
      name: input.file.name,
      mime_type: input.file.type || null,
      size_bytes: input.file.size,
    })
    .select('id,project_id,user_id,file_url,name,mime_type,size_bytes,created_at')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies ProjectDocumentPreview
}