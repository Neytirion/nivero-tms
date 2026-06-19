import { supabase } from '../../supabase'
import type { EstimatePreview, WorkPackage, WorkPackagePreview } from '../types'

export async function insertEstimateVersion(projectId: string, versionNumber: number, createdBy: string) {
  const { data, error } = await supabase
    .from('estimates')
    .insert({
      project_id: projectId,
      version_number: versionNumber,
      status: 'draft',
      created_by: createdBy,
    })
    .select('id,project_id,version_number,status,created_by,approved_at,created_at,updated_at')
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies EstimatePreview
}

export async function cloneEstimateWorkPackages(estimateId: string, previousPackages: WorkPackagePreview[]) {
  if (previousPackages.length === 0) {
    return
  }

  const clonedPackages = previousPackages.map((item, index) => ({
    estimate_id: estimateId,
    name: item.name,
    estimated_hours: item.estimated_hours,
    is_active: item.is_active,
    sort_order: index,
  }))

  const { error } = await supabase.from('work_packages').insert(clonedPackages)

  if (error) {
    throw new Error(error.message)
  }
}

export async function getExistingDraftPackages(estimateId: string) {
  const { data, error } = await supabase
    .from('work_packages')
    .select('id,name,is_active')
    .eq('estimate_id', estimateId)

  if (error) {
    throw new Error(error.message)
  }

  return data satisfies Array<Pick<WorkPackage, 'id' | 'name' | 'is_active'>>
}

export async function updateExistingPackage(packageId: string, name: string, estimatedHours: number, sortOrder: number) {
  const { error } = await supabase
    .from('work_packages')
    .update({
      name,
      estimated_hours: estimatedHours,
      sort_order: sortOrder,
      is_active: true,
    })
    .eq('id', packageId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function insertDraftPackage(estimateId: string, name: string, estimatedHours: number, sortOrder: number) {
  const { error } = await supabase.from('work_packages').insert({
    estimate_id: estimateId,
    name,
    estimated_hours: estimatedHours,
    sort_order: sortOrder,
    is_active: true,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function archivePackages(packageIds: string[]) {
  if (packageIds.length === 0) {
    return
  }

  const { error } = await supabase
    .from('work_packages')
    .update({ is_active: false })
    .in('id', packageIds)

  if (error) {
    throw new Error(error.message)
  }
}

export async function markEstimateAsDraft(estimateId: string) {
  const { error } = await supabase
    .from('estimates')
    .update({ status: 'draft', updated_at: new Date().toISOString() })
    .eq('id', estimateId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function markEstimateAsApproved(estimateId: string) {
  const { error } = await supabase
    .from('estimates')
    .update({ status: 'approved', approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', estimateId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function getEstimateTotalHours(estimateId: string) {
  const { data, error } = await supabase
    .from('work_packages')
    .select('estimated_hours')
    .eq('estimate_id', estimateId)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).reduce((sum, item) => sum + (item.estimated_hours ?? 0), 0)
}

export async function updateProjectEstimatedHours(projectId: string, estimatedHours: number) {
  const { error } = await supabase
    .from('projects')
    .update({ estimated_hours: estimatedHours })
    .eq('id', projectId)

  if (error) {
    throw new Error(error.message)
  }
}
