import { supabase } from './supabase'
import type { EstimatePreview, WorkPackagePreview } from './pm.types'

export async function getEstimateWithProjectById(estimateId: string) {
  const { data, error } = await supabase
    .from('estimates')
    .select('id,project_id,version_number,status')
    .eq('id', estimateId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getLatestEstimateVersion(projectId: string) {
  const { data, error } = await supabase
    .from('estimates')
    .select('version_number')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getProjectOwner(projectId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getProjectMembershipRole(projectId: string, userId: string) {
  const { data, error } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function getProjectEstimatePreviews(projectId: string, canViewDrafts: boolean) {
  let estimatesQuery = supabase
    .from('estimates')
    .select('id,project_id,version_number,status,created_by,approved_at,created_at,updated_at')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false })

  if (!canViewDrafts) {
    estimatesQuery = estimatesQuery.eq('status', 'approved')
  }

  const { data, error } = await estimatesQuery

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies EstimatePreview[]
}

export async function getWorkPackagesByEstimateIds(estimateIds: string[]) {
  const { data, error } = await supabase
    .from('work_packages')
    .select('id,estimate_id,name,estimated_hours,sort_order,is_active,created_at')
    .in('estimate_id', estimateIds)
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies WorkPackagePreview[]
}
