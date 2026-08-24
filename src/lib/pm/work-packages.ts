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
  is_active: boolean
  created_at: string | null
}

export interface ProjectTaskCardColorSetting {
  settingKey: string
  displayName: string
  color: string
  linkedPackageCount: number
}

export interface ProjectTaskCardFieldPreferences {
  showDescription: boolean
  showPriority: boolean
  showDueState: boolean
  showDueDate: boolean
  showAssignee: boolean
  showWorkPackage: boolean
}

export const DEFAULT_TASK_CARD_FIELD_PREFERENCES: ProjectTaskCardFieldPreferences = {
  showDescription: true,
  showPriority: true,
  showDueState: true,
  showDueDate: true,
  showAssignee: true,
  showWorkPackage: true,
}

export interface ProjectWorkPackageDisplayProfile {
  displayName: string
  color: string
  settingKey: string
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
    .select('id,estimate_id,name,color,sort_order,is_active,created_at')
    .in('estimate_id', estimateIds)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as WorkPackageRecord[]
}

function getLatestEstimateId(estimates: EstimateRef[]) {
  const sorted = [...estimates].sort((a, b) => b.version_number - a.version_number)
  return sorted[0]?.id ?? null
}

function getSettingKeyByPackage(item: WorkPackageRecord) {
  if (item.sort_order !== null) {
    return `slot:${item.sort_order}`
  }

  return `name:${normalizeWorkPackageName(item.name)}`
}

function buildCanonicalProfilesBySettingKey(workPackages: WorkPackageRecord[], latestEstimateId: string | null) {
  const latestEstimatePackages = workPackages.filter((item) => item.estimate_id === latestEstimateId)

  const latestBySlot = new Map<number, WorkPackageRecord>()
  for (const item of latestEstimatePackages) {
    if (item.sort_order !== null && item.is_active) {
      latestBySlot.set(item.sort_order, item)
    }
  }

  const profilesBySettingKey = new Map<string, ProjectWorkPackageDisplayProfile>()

  const sortedPackages = [...workPackages].sort((a, b) => {
    const sortOrderDelta = (a.sort_order ?? 0) - (b.sort_order ?? 0)
    if (sortOrderDelta !== 0) {
      return sortOrderDelta
    }

    return (b.created_at ?? '').localeCompare(a.created_at ?? '')
  })

  for (const item of sortedPackages) {
    const fallbackKey = getSettingKeyByPackage(item)
    const canonicalFromSlot =
      item.sort_order !== null
        ? latestBySlot.get(item.sort_order)
        : null

    const canonical = canonicalFromSlot ?? item
    const settingKey = canonical.sort_order !== null ? `slot:${canonical.sort_order}` : fallbackKey

    if (profilesBySettingKey.has(settingKey)) {
      continue
    }

    profilesBySettingKey.set(settingKey, {
      settingKey,
      displayName: canonical.name.trim(),
      color: normalizeWorkPackageColor(canonical.color) ?? fallbackColor(),
    })
  }

  return profilesBySettingKey
}

export async function getProjectWorkPackageDisplayProfileById(projectId: string) {
  const estimates = await getProjectEstimateRefs(projectId)
  if (estimates.length === 0) {
    return {} as Record<string, ProjectWorkPackageDisplayProfile>
  }

  const estimateIds = estimates.map((estimate) => estimate.id)
  const workPackages = await getWorkPackagesByEstimateIds(estimateIds)
  const latestEstimateId = getLatestEstimateId(estimates)
  const canonicalBySettingKey = buildCanonicalProfilesBySettingKey(workPackages, latestEstimateId)

  const byId: Record<string, ProjectWorkPackageDisplayProfile> = {}
  for (const item of workPackages) {
    const ownSettingKey = getSettingKeyByPackage(item)
    const slotSettingKey = item.sort_order !== null ? `slot:${item.sort_order}` : ownSettingKey
    const canonical = canonicalBySettingKey.get(slotSettingKey) ?? canonicalBySettingKey.get(ownSettingKey)

    if (canonical) {
      byId[item.id] = canonical
    }
  }

  return byId
}

export async function getProjectTaskCardColorSettings(projectId: string) {
  const estimates = await getProjectEstimateRefs(projectId)
  if (estimates.length === 0) {
    return [] as ProjectTaskCardColorSetting[]
  }

  const estimateIds = estimates.map((estimate) => estimate.id)
  const workPackages = await getWorkPackagesByEstimateIds(estimateIds)
  const latestEstimateId = getLatestEstimateId(estimates)
  const canonicalBySettingKey = buildCanonicalProfilesBySettingKey(workPackages, latestEstimateId)
  const linkedCountBySettingKey = new Map<string, number>()

  for (const item of workPackages) {
    const key = item.sort_order !== null ? `slot:${item.sort_order}` : getSettingKeyByPackage(item)
    linkedCountBySettingKey.set(key, (linkedCountBySettingKey.get(key) ?? 0) + 1)
  }

  const settings: ProjectTaskCardColorSetting[] = Array.from(canonicalBySettingKey.values()).map((item) => ({
    settingKey: item.settingKey,
    displayName: item.displayName,
    color: item.color,
    linkedPackageCount: linkedCountBySettingKey.get(item.settingKey) ?? 0,
  }))

  return settings.sort((a, b) => a.displayName.localeCompare(b.displayName))
}

export async function updateProjectTaskCardColor(
  projectId: string,
  settingKey: string,
  nextColor: string,
) {
  const normalizedSettingKey = settingKey.trim().toLowerCase()
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

  const slotMatch = normalizedSettingKey.match(/^slot:(\d+)$/)
  const matchingIds = workPackages.filter((item) => {
    if (slotMatch) {
      return item.sort_order === Number.parseInt(slotMatch[1], 10)
    }

    const nameKey = getSettingKeyByPackage(item)
    return nameKey === normalizedSettingKey
  }).map((item) => item.id)

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

function normalizeTaskCardFieldPreferences(
  input: Partial<ProjectTaskCardFieldPreferences> | null | undefined,
): ProjectTaskCardFieldPreferences {
  return {
    showDescription: input?.showDescription ?? DEFAULT_TASK_CARD_FIELD_PREFERENCES.showDescription,
    showPriority: input?.showPriority ?? DEFAULT_TASK_CARD_FIELD_PREFERENCES.showPriority,
    showDueState: input?.showDueState ?? DEFAULT_TASK_CARD_FIELD_PREFERENCES.showDueState,
    showDueDate: input?.showDueDate ?? DEFAULT_TASK_CARD_FIELD_PREFERENCES.showDueDate,
    showAssignee: input?.showAssignee ?? DEFAULT_TASK_CARD_FIELD_PREFERENCES.showAssignee,
    showWorkPackage: input?.showWorkPackage ?? DEFAULT_TASK_CARD_FIELD_PREFERENCES.showWorkPackage,
  }
}

export async function getProjectTaskCardFieldPreferences(projectId: string): Promise<ProjectTaskCardFieldPreferences> {
  const { data, error } = await supabase
    .from('project_task_card_preferences')
    .select('show_description,show_priority,show_due_state,show_due_date,show_assignee,show_work_package')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return DEFAULT_TASK_CARD_FIELD_PREFERENCES
  }

  return normalizeTaskCardFieldPreferences({
    showDescription: data.show_description,
    showPriority: data.show_priority,
    showDueState: data.show_due_state,
    showDueDate: data.show_due_date,
    showAssignee: data.show_assignee,
    showWorkPackage: data.show_work_package,
  })
}

export async function updateProjectTaskCardFieldPreferences(
  projectId: string,
  nextPreferences: ProjectTaskCardFieldPreferences,
) {
  const normalized = normalizeTaskCardFieldPreferences(nextPreferences)
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    throw new Error(userError.message)
  }

  const userId = userData.user?.id ?? null

  const { error } = await supabase
    .from('project_task_card_preferences')
    .upsert({
      project_id: projectId,
      show_description: normalized.showDescription,
      show_priority: normalized.showPriority,
      show_due_state: normalized.showDueState,
      show_due_date: normalized.showDueDate,
      show_assignee: normalized.showAssignee,
      show_work_package: normalized.showWorkPackage,
      updated_by: userId,
    })

  if (error) {
    throw new Error(error.message)
  }
}
