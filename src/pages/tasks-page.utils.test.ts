import { describe, expect, it } from 'vitest'
import type { TaskPreview } from '../lib/pm'
import {
  buildCalendarMeta,
  getTaskPriorityBadgeClass,
  normalizeTaskStatus,
  shiftMonthValue,
} from './tasks-page.utils'

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
    estimate_hours: 2,
    actual_hours: 0,
    blocked_by_task_id: null,
    due_date: null,
    project_id: 'project-1',
    created_at: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('tasks-page.utils', () => {
  it('normalizes task status aliases', () => {
    expect(normalizeTaskStatus('doing')).toBe('in_progress')
    expect(normalizeTaskStatus('qa')).toBe('review')
  })

  it('returns proper badge class by priority', () => {
    expect(getTaskPriorityBadgeClass('high')).toContain('rose')
    expect(getTaskPriorityBadgeClass('low')).toContain('emerald')
    expect(getTaskPriorityBadgeClass('unexpected')).toContain('amber')
  })

  it('shifts month and supports year boundaries', () => {
    expect(shiftMonthValue('2026-01', -1)).toBe('2025-12')
    expect(shiftMonthValue('2026-12', 1)).toBe('2027-01')
    expect(shiftMonthValue('bad-value', 1)).toBe('bad-value')
  })

  it('builds calendar meta and groups due tasks for selected month only', () => {
    const juneTasks = [
      createTaskPreview({ id: 't1', due_date: '2026-06-02' }),
      createTaskPreview({ id: 't2', due_date: '2026-06-02' }),
      createTaskPreview({ id: 't3', due_date: '2026-06-20' }),
      createTaskPreview({ id: 't4', due_date: '2026-07-01' }),
      createTaskPreview({ id: 't5', due_date: null }),
    ]

    const meta = buildCalendarMeta('2026-06', juneTasks)

    expect(meta).not.toBeNull()
    expect(meta?.cells.length).toBe(35)

    const day2 = meta?.cells.find((cell) => cell?.dateKey === '2026-06-02')
    const day20 = meta?.cells.find((cell) => cell?.dateKey === '2026-06-20')

    expect(day2?.tasks).toHaveLength(2)
    expect(day20?.tasks).toHaveLength(1)
  })

  it('returns null calendar meta for invalid month', () => {
    expect(buildCalendarMeta('2026-13', [])).toBeNull()
  })
})
