import type { ProjectPreview } from '../../../lib/pm'

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round(value)))
}

export function deriveProgress(project: Pick<ProjectPreview, 'progress_percent' | 'estimated_hours' | 'actual_hours' | 'status'>) {
  if ((project.status ?? '').toLowerCase() === 'completed') {
    return 100
  }

  if (project.progress_percent != null) {
    return clampPercent(project.progress_percent)
  }

  if (!project.estimated_hours || project.estimated_hours <= 0 || !project.actual_hours) {
    return 0
  }

  return clampPercent((project.actual_hours / project.estimated_hours) * 100)
}

export function deriveRiskFromProgressAndHours(input: {
  progressPercent: number | null | undefined
  estimatedHours: number | null | undefined
  actualHours: number | null | undefined
}) {
  const estimatedHours = input.estimatedHours ?? 0
  const actualHours = input.actualHours ?? 0

  if (estimatedHours <= 0 || actualHours <= 0) {
    return 'Green'
  }

  const burnRatio = actualHours / estimatedHours
  if (burnRatio > 1) {
    return 'Red'
  }

  if (input.progressPercent == null) {
    if (burnRatio >= 0.85) {
      return 'Amber'
    }

    return 'Green'
  }

  const progressRatio = clampPercent(input.progressPercent) / 100
  const burnVariance = burnRatio - progressRatio

  if (burnVariance > 0.2) {
    return 'Red'
  }

  if (burnVariance > 0.1) {
    return 'Amber'
  }

  return 'Green'
}

export function deriveRisk(project: Pick<ProjectPreview, 'risk_status' | 'progress_percent' | 'estimated_hours' | 'actual_hours'>) {
  if (project.risk_status) {
    const normalized = project.risk_status.toLowerCase()
    if (normalized.includes('red')) {
      return 'Red'
    }
    if (normalized.includes('amber') || normalized.includes('yellow')) {
      return 'Amber'
    }
    return 'Green'
  }

  return deriveRiskFromProgressAndHours({
    progressPercent: project.progress_percent,
    estimatedHours: project.estimated_hours,
    actualHours: project.actual_hours,
  })
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Not set'
  }

  return new Date(value).toLocaleDateString()
}
