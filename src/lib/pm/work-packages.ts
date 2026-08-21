import { supabase } from '../supabase'
import { normalizeWorkPackageColor } from './work-package-colors'

interface EstimateRef {
  id: string
  version_number: number
}

interface WorkPackageRecord {
  id: string
  estimate_id: string
  name: string
  color: string | null
  sort_order: number | null
  created_at: string | null
}

export interface ProjectTaskCardColorSetting {
  settingKey: string
  displayName: string
  color: string
  linkedPackageCount: number
}

function normalizeWorkPackageName(value: string) {
  return value.trim().toLowerCase()
}

function fallbackColor() {
  return '#94a3b8'
}

async function getProjectEstimateRefs(projectId: string) {
  const { data, error } = await supabase
    .from('estimates')
    .select('id,version_number')
    .eq('project_id', projectId)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as EstimateRef[]
}

async function getWorkPackagesByEstimateIds(estimateIds: string[]) {
  if (estimateIds.length === 0) {
    return [] as WorkPackageRecord[]
  }

  const { data, error } = await supabase
    .from('work_packages')
    .select('id,estimate_id,name,color,sort_order,created_at')
    .in('estimate_id', estimateIds)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as WorkPackageRecord[]
}

export async function getProjectTaskCardColorSettings(projectId: string) {
  const estimates = await getProjectEstimateRefs(projectId)
  if (estimates.length === 0) {
    return [] as ProjectTaskCardColorSetting[]
  }

  const estimateIds = estimates.map((estimate) => estimate.id)
  const versionByEstimateId = estimates.reduce<Record<string, number>>((acc, estimate) => {
    acc[estimate.id] = estimate.version_number
    return acc
  }, {})

  const workPackages = await getWorkPackagesByEstimateIds(estimateIds)
  const sortedPackages = [...workPackages].sort((a, b) => {
    const versionDelta = (versionByEstimateId[b.estimate_id] ?? 0) - (versionByEstimateId[a.estimate_id] ?? 0)
    if (versionDelta !== 0) {
      return versionDelta
    }

    const sortOrderDelta = (a.sort_order ?? 0) - (b.sort_order ?? 0)
    if (sortOrderDelta !== 0) {
      return sortOrderDelta
    }

    return (b.created_at ?? '').localeCompare(a.created_at ?? '')
  })

  const settingsByKey = new Map<string, ProjectTaskCardColorSetting>()

  for (const workPackage of sortedPackages) {
    const settingKey = normalizeWorkPackageName(workPackage.name)
    if (!settingKey) {
      continue
    }

    const existing = settingsByKey.get(settingKey)
    if (!existing) {
      settingsByKey.set(settingKey, {
        settingKey,
        displayName: workPackage.name.trim(),
        color: normalizeWorkPackageColor(workPackage.color) ?? fallbackColor(),
        linkedPackageCount: 1,
      })
      continue
    }

    settingsByKey.set(settingKey, {
      ...existing,
      linkedPackageCount: existing.linkedPackageCount + 1,
    })
  }

  return Array.from(settingsByKey.values()).sort((a, b) => a.displayName.localeCompare(b.displayName))
}

export async function updateProjectTaskCardColor(
  projectId: string,
  settingKey: string,
  nextColor: string,
) {
  const normalizedSettingKey = normalizeWorkPackageName(settingKey)
  if (!normalizedSettingKey) {
    throw new Error('Work package key is required')
  }

  const normalizedColor = normalizeWorkPackageColor(nextColor)
  if (!normalizedColor) {
    throw new Error('Color must be a valid hex value like #3b82f6')
  }

  const estimates = await getProjectEstimateRefs(projectId)
  const estimateIds = estimates.map((estimate) => estimate.id)
  const workPackages = await getWorkPackagesByEstimateIds(estimateIds)

  const matchingIds = workPackages
    .filter((item) => normalizeWorkPackageName(item.name) === normalizedSettingKey)
    .map((item) => item.id)

  if (matchingIds.length === 0) {
    throw new Error('Work package group not found for this project')
  }

  const { error } = await supabase
    .from('work_packages')
    .update({ color: normalizedColor })
    .in('id', matchingIds)

  if (error) {
    throw new Error(error.message)
  }
}
