import { supabase } from './supabase'
import type { CommentPreview } from './pm.types'
import { assertProjectEditable } from './pm.helpers'

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

  const { data, error } = await supabase
    .from('comments')
    .insert({
      project_id: input.projectId,
      task_id: input.taskId,
      user_id: userData.user.id,
      message: input.message.trim(),
    })
    .select('id,project_id,task_id,user_id,message,created_at')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies CommentPreview
}