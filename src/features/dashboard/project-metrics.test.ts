import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProjectPreview, TaskPreview } from '../../lib/pm'
import { calculateProjectMetrics } from './project-metrics'

const mocks = vi.hoisted(() => ({
  deriveRiskFromProgressAndHours: vi.fn(),
}))

vi.mock('../projects/utils/project-metrics.ts', () => ({
  deriveRiskFromProgressAndHours: mocks.deriveRiskFromProgressAndHours,
}))

function createProjectPreview(overrides: Partial<ProjectPreview> = {}): ProjectPreview {
  return {
    id: 'project-1',
    name: 'Project',
    description: null,
    owner_id: 'owner-1',
    customer_name: null,
    project_manager_id: null,
    start_date: null,
    end_date: null,
    estimated_hours: 100,
    actual_hours: 0,
    budget_amount: null,
    progress_percent: 0,
    risk_status: 'green',
    status: 'active',
    completed_at: null,
    deadline_at: null,
    created_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

function createTaskPreview(overrides: Partial<TaskPreview> = {}): TaskPreview {
  return {
    id: 'task-1',
    work_package_id: null,
    title: 'Task',
    description: null,
    status: 'todo',
    priority: 'medium',
    assigned_to: null,
    created_by: 'user-1',
    estimate_hours: 0,
    actual_hours: 0,
    blocked_by_task_id: null,
    due_date: null,
    project_id: 'project-1',
    created_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('dashboard/project-metrics', () => {
  beforeEach(() => {
    mocks.deriveRiskFromProgressAndHours.mockReset()
    mocks.deriveRiskFromProgressAndHours.mockReturnValue('Green')
  })

  it('calculates progress from estimated hours when available', () => {
    const project = createProjectPreview()
    const tasks = [
      createTaskPreview({ status: 'done', estimate_hours: 8 }),
      createTaskPreview({ status: 'todo', estimate_hours: 2 }),
    ]

    const result = calculateProjectMetrics(project, tasks)

    expect(result.progressPercent).toBe(80)
    expect(mocks.deriveRiskFromProgressAndHours).toHaveBeenCalledWith({
      progressPercent: 80,
      estimatedHours: 100,
      actualHours: 0,
    })
  })

  it('falls back to done task ratio when estimates are missing', () => {
    const project = createProjectPreview()
    const tasks = [
      createTaskPreview({ status: 'done', estimate_hours: 0 }),
      createTaskPreview({ status: 'review', estimate_hours: 0 }),
      createTaskPreview({ status: 'todo', estimate_hours: 0 }),
      createTaskPreview({ status: 'backlog', estimate_hours: 0 }),
    ]

    const result = calculateProjectMetrics(project, tasks)
    expect(result.progressPercent).toBe(25)
  })

  it('maps risk labels to risk status and rounds actual hours', () => {
    const project = createProjectPreview()
    const tasks = [createTaskPreview({ actual_hours: 1.239 })]

    mocks.deriveRiskFromProgressAndHours.mockReturnValueOnce('Amber')
    expect(calculateProjectMetrics(project, tasks).riskStatus).toBe('yellow')

    mocks.deriveRiskFromProgressAndHours.mockReturnValueOnce('Red')
    expect(calculateProjectMetrics(project, tasks).riskStatus).toBe('red')

    mocks.deriveRiskFromProgressAndHours.mockReturnValueOnce('Green')
    const result = calculateProjectMetrics(project, tasks)
    expect(result.riskStatus).toBe('green')
    expect(result.actualHours).toBe(1.24)
  })
})
