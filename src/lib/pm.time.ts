import { supabase } from './supabase'
import type { CreateTimeEntryInput, GetTimeEntriesInput, TimeEntryPreview } from './pm.types'
import { assertProjectEditable } from './pm.helpers'

export async function getTimeEntries(input: GetTimeEntriesInput = {}) {
  let query = supabase
    .from('time_entries')
    .select('id,user_id,project_id,task_id,entry_date,minutes_spent,is_billable,category,notes,started_at,ended_at,created_at')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (input.projectId) {
    query = query.eq('project_id', input.projectId)
  }

  if (input.fromDate) {
    query = query.gte('entry_date', input.fromDate)
  }

  if (input.toDate) {
    query = query.lte('entry_date', input.toDate)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies TimeEntryPreview[]
}

export async function createTimeEntry(input: CreateTimeEntryInput) {
  await assertProjectEditable(input.projectId, 'log time')

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!userData.user) {
    throw new Error('User is not authenticated')
  }

  const minutesSpent = Math.round(input.hoursSpent * 60)
  if (minutesSpent <= 0) {
    throw new Error('Hours spent must be greater than 0')
  }

  const { data, error } = await supabase
    .from('time_entries')
    .insert({
      user_id: userData.user.id,
      project_id: input.projectId,
      task_id: input.taskId ?? null,
      entry_date: input.entryDate,
      minutes_spent: minutesSpent,
      is_billable: input.isBillable,
      category: input.category,
      notes: input.notes?.trim() ? input.notes.trim() : null,
    })
    .select('id,user_id,project_id,task_id,entry_date,minutes_spent,is_billable,category,notes,started_at,ended_at,created_at')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies TimeEntryPreview
}