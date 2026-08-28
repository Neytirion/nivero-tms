import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateProjectMetrics } from './project-metrics'
import { createProjectPreview, createTaskPreview } from '../../../test/workspace-factory'

const mocks = vi.hoisted(() => ({
  deriveRiskFromProgressAndHours: vi.fn(),
}))

vi.mock('../../projects/utils/project-metrics.ts', () => ({
  deriveRiskFromProgressAndHours: mocks.deriveRiskFromProgressAndHours,
}))


describe('dashboard/project-metrics', () => {
  beforeEach(() => {
    mocks.deriveRiskFromProgressAndHours.mockReset()
    mocks.deriveRiskFromProgressAndHours.mockReturnValue('Green')
  })

  it('calculates progress from estimated hours when available', () => {
    const project = createProjectPreview({ estimated_hours: 100 })
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
