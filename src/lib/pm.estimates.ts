import { supabase } from './supabase'
import type {
  EstimatePreview,
  EstimateWithPackages,
  ProjectTaskWorkPackagePreview,
  SaveEstimateDraftInput,
  WorkPackage,
  WorkPackagePreview,
} from './pm.types'
import { assertProjectEditable } from './pm.helpers'

async function assertEstimateIsLatestDraft(estimateId: string, action: string) {
  const { data: estimate, error: estimateError } = await supabase
    .from('estimates')
    .select('id,project_id,version_number,status')
    .eq('id', estimateId)
    .maybeSingle()

  if (estimateError) {
    throw new Error(estimateError.message)
  }

  if (!estimate) {
    throw new Error('Estimate version not found')
  }

  await assertProjectEditable(estimate.project_id, action)

  const { data: latestEstimate, error: latestEstimateError } = await supabase
    .from('estimates')
    .select('version_number')
    .eq('project_id', estimate.project_id)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestEstimateError) {
    throw new Error(latestEstimateError.message)
  }

  if (latestEstimate && latestEstimate.version_number !== estimate.version_number) {
    throw new Error(`Cannot ${action}: previous estimate versions are read-only`)
  }

  if ((estimate.status ?? '').toLowerCase() !== 'draft') {
    throw new Error(`Cannot ${action}: only current draft version can be changed`)
  }

  return estimate
}

export async function getProjectEstimates(projectId: string) {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!userData.user) {
    throw new Error('User is not authenticated')
  }

  const actorId = userData.user.id

  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .maybeSingle()

  if (projectError) {
    throw new Error(projectError.message)
  }

  const { data: membershipData, error: membershipError } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', actorId)
    .maybeSingle()

  if (membershipError) {
    throw new Error(membershipError.message)
  }

  const isOwner = projectData?.owner_id === actorId
  const isAdmin = (membershipData?.role ?? '').toLowerCase() === 'admin'
  const isManager = (membershipData?.role ?? '').toLowerCase() === 'manager'
  const canViewDrafts = isOwner || isAdmin || isManager

  let estimatesQuery = supabase
    .from('estimates')
    .select('id,project_id,version_number,status,created_by,approved_at,created_at,updated_at')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false })

  if (!canViewDrafts) {
    estimatesQuery = estimatesQuery.eq('status', 'approved')
  }

  const { data: estimatesData, error: estimatesError } = await estimatesQuery

  if (estimatesError) {
    throw new Error(estimatesError.message)
  }

  const estimates = estimatesData satisfies EstimatePreview[]

  if (estimates.length === 0) {
    return [] as EstimateWithPackages[]
  }

  const estimateIds = estimates.map((estimate) => estimate.id)
  const { data: packagesData, error: packagesError } = await supabase
    .from('work_packages')
    .select('id,estimate_id,name,estimated_hours,sort_order,is_active,created_at')
    .in('estimate_id', estimateIds)
    .order('sort_order', { ascending: true })

  if (packagesError) {
    throw new Error(packagesError.message)
  }

  const packagesByEstimateId = (packagesData satisfies WorkPackagePreview[]).reduce<
    Record<string, WorkPackagePreview[]>
  >((acc, item) => {
    if (!acc[item.estimate_id]) {
      acc[item.estimate_id] = []
    }

    acc[item.estimate_id].push(item)
    return acc
  }, {})

  return estimates.map((estimate) => ({
    ...estimate,
    work_packages: packagesByEstimateId[estimate.id] ?? [],
  }))
}

export async function hasProjectEstimateVersion(projectId: string) {
  const { count, error } = await supabase
    .from('estimates')
    .select('id', { head: true, count: 'exact' })
    .eq('project_id', projectId)

  if (error) {
    throw new Error(error.message)
  }

  return (count ?? 0) > 0
}

export async function getProjectTaskWorkPackages(projectId: string) {
  const estimates = await getProjectEstimates(projectId)

  const preferredEstimate = estimates.find((item) => item.status === 'approved') ?? estimates[0] ?? null

  if (!preferredEstimate) {
    return [] as ProjectTaskWorkPackagePreview[]
  }

  return preferredEstimate.work_packages
    .filter((item) => item.is_active)
    .map((item) => ({
      id: item.id,
      name: item.name,
      estimated_hours: item.estimated_hours,
    }))
}

export async function createEstimateVersion(projectId: string) {
  await assertProjectEditable(projectId, 'create estimate version')

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  if (!userData.user) {
    throw new Error('User is not authenticated')
  }

  const estimates = await getProjectEstimates(projectId)
  const latest = estimates[0] ?? null
  const nextVersion = latest ? latest.version_number + 1 : 1

  const { data: estimateData, error: estimateError } = await supabase
    .from('estimates')
    .insert({
      project_id: projectId,
      version_number: nextVersion,
      status: 'draft',
      created_by: userData.user.id,
    })
    .select('id,project_id,version_number,status,created_by,approved_at,created_at,updated_at')
    .single()

  if (estimateError) {
    throw new Error(estimateError.message)
  }

  const createdEstimate = estimateData satisfies EstimatePreview

  if (latest && latest.work_packages.length > 0) {
    const clonedPackages = latest.work_packages.map((item, index) => ({
      estimate_id: createdEstimate.id,
      name: item.name,
      estimated_hours: item.estimated_hours,
      is_active: item.is_active,
      sort_order: index,
    }))

    const { error: cloneError } = await supabase.from('work_packages').insert(clonedPackages)

    if (cloneError) {
      throw new Error(cloneError.message)
    }
  }

  return createdEstimate
}

export async function saveEstimateDraft(input: SaveEstimateDraftInput) {
  await assertEstimateIsLatestDraft(input.estimateId, 'save estimate version')

  const sanitizedPackages = input.workPackages
    .map((item) => ({
      name: item.name.trim(),
      estimatedHours: Number(item.estimatedHours) || 0,
    }))
    .filter((item) => item.name.length > 0)

  const { data: existingPackagesData, error: existingPackagesError } = await supabase
    .from('work_packages')
    .select('id,name,is_active')
    .eq('estimate_id', input.estimateId)

  if (existingPackagesError) {
    throw new Error(existingPackagesError.message)
  }

  const existingPackages = existingPackagesData satisfies Array<Pick<WorkPackage, 'id' | 'name' | 'is_active'>>
  const usedPackageIds = new Set<string>()

  const findPackageByName = (name: string) => {
    const normalized = name.trim().toLowerCase()
    return (
      existingPackages.find(
        (item) => !usedPackageIds.has(item.id) && item.name.trim().toLowerCase() === normalized,
      ) ?? null
    )
  }

  for (const [index, item] of sanitizedPackages.entries()) {
    const existingPackage = findPackageByName(item.name)

    if (existingPackage) {
      usedPackageIds.add(existingPackage.id)

      const { error: updatePackageError } = await supabase
        .from('work_packages')
        .update({
          name: item.name,
          estimated_hours: item.estimatedHours,
          sort_order: index,
          is_active: true,
        })
        .eq('id', existingPackage.id)

      if (updatePackageError) {
        throw new Error(updatePackageError.message)
      }

      continue
    }

    const { error: insertPackageError } = await supabase.from('work_packages').insert({
      estimate_id: input.estimateId,
      name: item.name,
      estimated_hours: item.estimatedHours,
      sort_order: index,
      is_active: true,
    })

    if (insertPackageError) {
      throw new Error(insertPackageError.message)
    }
  }

  const packagesToArchive = existingPackages.filter((item) => !usedPackageIds.has(item.id))

  if (packagesToArchive.length > 0) {
    const { error: archivePackagesError } = await supabase
      .from('work_packages')
      .update({ is_active: false })
      .in(
        'id',
        packagesToArchive.map((item) => item.id),
      )

    if (archivePackagesError) {
      throw new Error(archivePackagesError.message)
    }
  }

  const { error: updateEstimateError } = await supabase
    .from('estimates')
    .update({ status: 'draft', updated_at: new Date().toISOString() })
    .eq('id', input.estimateId)

  if (updateEstimateError) {
    throw new Error(updateEstimateError.message)
  }
}

export async function approveEstimate(estimateId: string) {
  const targetEstimate = await assertEstimateIsLatestDraft(estimateId, 'approve estimate')

  const { error: approveError } = await supabase
    .from('estimates')
    .update({ status: 'approved', approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', estimateId)

  if (approveError) {
    throw new Error(approveError.message)
  }

  const { data: packagesData, error: packagesError } = await supabase
    .from('work_packages')
    .select('estimated_hours')
    .eq('estimate_id', estimateId)

  if (packagesError) {
    throw new Error(packagesError.message)
  }

  const nextEstimatedHours = (packagesData ?? []).reduce((sum, item) => sum + (item.estimated_hours ?? 0), 0)

  const { error: projectUpdateError } = await supabase
    .from('projects')
    .update({ estimated_hours: nextEstimatedHours })
    .eq('id', targetEstimate.project_id)

  if (projectUpdateError) {
    throw new Error(projectUpdateError.message)
  }
}