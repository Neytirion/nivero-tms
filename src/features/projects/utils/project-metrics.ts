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

export function deriveRisk(project: Pick<ProjectPreview, 'risk_status' | 'estimated_hours' | 'actual_hours'>) {
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

  if (!project.estimated_hours || !project.actual_hours) {
    return 'Green'
  }

  const ratio = project.actual_hours / project.estimated_hours
  if (ratio > 1) {
    return 'Red'
  }
  if (ratio >= 0.85) {
    return 'Amber'
  }
  return 'Green'
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Not set'
  }

  return new Date(value).toLocaleDateString()
}
