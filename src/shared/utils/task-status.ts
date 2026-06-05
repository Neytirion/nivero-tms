import type { TaskStatus } from '../../features/tasks/constants'

function normalizeStatusValue(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
}

export function toCanonicalTaskStatus(value: string | null | undefined): TaskStatus {
  const normalized = normalizeStatusValue(value)

  if (normalized === 'backlog') {
    return 'backlog'
  }

  if (normalized === 'todo' || normalized === 'to_do' || normalized === 'open' || normalized === 'new') {
    return 'todo'
  }

  if (normalized === 'in_progress' || normalized === 'doing' || normalized === 'started') {
    return 'in_progress'
  }

  if (normalized === 'review' || normalized === 'in_review' || normalized === 'qa' || normalized === 'testing') {
    return 'review'
  }

  if (normalized === 'done' || normalized === 'completed' || normalized === 'complete' || normalized === 'closed') {
    return 'done'
  }

  return 'todo'
}

export function isTaskClosedStatus(value: string | null | undefined) {
  const normalized = normalizeStatusValue(value)
  return normalized === 'done' || normalized === 'completed' || normalized === 'complete' || normalized === 'closed'
}

export function isExecutionTaskStatus(value: string | null | undefined) {
  const canonical = toCanonicalTaskStatus(value)
  return canonical === 'in_progress' || canonical === 'review' || canonical === 'done'
}