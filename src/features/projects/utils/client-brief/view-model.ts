import { getProjectTaskWorkPackages } from '../../../../lib/pm'
import { deriveProgress, deriveRisk } from '../project-metrics'
import type { BuildClientBriefInput, BriefViewModel, ClientBriefTheme } from './types'

export const DEFAULT_THEME: ClientBriefTheme = {
  brandName: 'Nivero',
  primaryColor: '#e0f2da',
  accentColor: '#7db991',
  surfaceColor: '#f5f8f2',
  textColor: '#1f2937',
  mutedTextColor: '#55606f',
}

function getEstimateModules(input: BuildClientBriefInput) {
  return (input.estimateModules ?? [])
    .filter((item) => item.name.trim().length > 0)
    .slice(0, 12)
}

function hasProjectExecutionSignals(input: BuildClientBriefInput) {
  const progress = deriveProgress(input.project)
  const actualHours = input.project.actual_hours ?? 0
  const projectStatus = (input.project.status ?? '').toLowerCase()
  const activeTaskStatuses = new Set(['in_progress', 'review', 'done', 'completed'])

  if (projectStatus === 'in_progress' || projectStatus === 'review' || projectStatus === 'completed') {
    return true
  }

  if (actualHours > 0 || progress > 0) {
    return true
  }

  return input.tasks.some((task) => {
    const status = (task.status ?? '').toLowerCase()
    const taskActualHours = task.actual_hours ?? 0
    return activeTaskStatuses.has(status) || taskActualHours > 0
  })
}

export function buildBriefViewModel(input: BuildClientBriefInput): BriefViewModel {
  return {
    theme: input.theme ?? DEFAULT_THEME,
    generatedAt: input.generatedAt ?? new Date(),
    projectName: input.project.name || 'Project',
    customer: input.project.customer_name ?? 'Confidential',
    managerName: input.projectManagerName ?? 'Not assigned',
    progress: deriveProgress(input.project),
    risk: deriveRisk(input.project),
    includeExecutionHealth: hasProjectExecutionSignals(input),
    estimateModules: getEstimateModules(input),
    description: input.project.description ?? 'This proposal outlines the project scope, delivery milestones, and execution approach.',
  }
}

export async function loadEstimateModules(projectId: string) {
  try {
    const modules = await getProjectTaskWorkPackages(projectId)
    return modules.map((item) => ({
      name: item.name,
      estimated_hours: item.estimated_hours,
    }))
  } catch {
    return []
  }
}
