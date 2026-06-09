import { supabase } from './supabase'
import type {
  EstimateWithPackages,
  ProjectTaskWorkPackagePreview,
  SaveEstimateDraftInput,
  WorkPackagePreview,
} from './pm.types'
import { assertProjectEditable } from './pm.helpers'
import {
  getEstimateWithProjectById,
  getLatestEstimateVersion,
  getProjectEstimatePreviews,
  getProjectMembershipRole,
  getProjectOwner,
  getWorkPackagesByEstimateIds,
} from './pm.estimates.queries'
import {
  archivePackages,
  cloneEstimateWorkPackages,
  getEstimateTotalHours,
  getExistingDraftPackages,
  insertDraftPackage,
  insertEstimateVersion,
  markEstimateAsApproved,
  markEstimateAsDraft,
  updateExistingPackage,
  updateProjectEstimatedHours,
} from './pm.estimates.mutations'

async function assertEstimateIsLatestDraft(estimateId: string, action: string) {
  const estimate = await getEstimateWithProjectById(estimateId)

  if (!estimate) {
    throw new Error('Estimate version not found')
  }

  await assertProjectEditable(estimate.project_id, action)

  const latestEstimate = await getLatestEstimateVersion(estimate.project_id)

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

  const [projectData, membershipData] = await Promise.all([
    getProjectOwner(projectId),
    getProjectMembershipRole(projectId, actorId),
  ])

  const isOwner = projectData?.owner_id === actorId
  const isAdmin = (membershipData?.role ?? '').toLowerCase() === 'admin'
  const isManager = (membershipData?.role ?? '').toLowerCase() === 'manager'
  const canViewDrafts = isOwner || isAdmin || isManager

  const estimates = await getProjectEstimatePreviews(projectId, canViewDrafts)

  if (estimates.length === 0) {
    return [] as EstimateWithPackages[]
  }

  const estimateIds = estimates.map((estimate) => estimate.id)
  const packages = await getWorkPackagesByEstimateIds(estimateIds)

  const packagesByEstimateId = packages.reduce<
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

  const createdEstimate = await insertEstimateVersion(projectId, nextVersion, userData.user.id)

  await cloneEstimateWorkPackages(createdEstimate.id, latest?.work_packages ?? [])

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

  const existingPackages = await getExistingDraftPackages(input.estimateId)
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

      await updateExistingPackage(existingPackage.id, item.name, item.estimatedHours, index)

      continue
    }

    await insertDraftPackage(input.estimateId, item.name, item.estimatedHours, index)
  }

  const packagesToArchive = existingPackages.filter((item) => !usedPackageIds.has(item.id))

  await archivePackages(packagesToArchive.map((item) => item.id))

  await markEstimateAsDraft(input.estimateId)
}

export async function approveEstimate(estimateId: string) {
  const targetEstimate = await assertEstimateIsLatestDraft(estimateId, 'approve estimate')

  await markEstimateAsApproved(estimateId)
  const nextEstimatedHours = await getEstimateTotalHours(estimateId)
  await updateProjectEstimatedHours(targetEstimate.project_id, nextEstimatedHours)
}