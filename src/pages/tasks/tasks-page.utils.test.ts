import { describe, expect, it } from 'vitest'
import {
  buildCalendarMeta,
  getTaskPriorityBadgeClass,
  normalizeTaskStatus,
  sortTasksForBoardColumn,
  shiftMonthValue,
} from './tasks-page.utils'
import { createTaskPreview } from '../../test/workspace-factory'

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

  it('sorts board column tasks by accessibility, priority, and due date', () => {
    const tasks = [
      createTaskPreview({ id: 't1', priority: 'medium', due_date: '2026-08-20', created_at: '2026-08-01T10:00:00.000Z' }),
      createTaskPreview({ id: 't2', priority: 'high', due_date: '2026-08-18', created_at: '2026-08-01T09:00:00.000Z' }),
      createTaskPreview({ id: 't3', priority: 'high', due_date: '2026-08-25', created_at: '2026-08-01T11:00:00.000Z' }),
      createTaskPreview({ id: 't4', priority: 'low', due_date: null, created_at: '2026-08-02T11:00:00.000Z' }),
    ]

    const sorted = sortTasksForBoardColumn(
      tasks,
      (task) => task.id !== 't3',
    )

    expect(sorted.map((task) => task.id)).toEqual(['t2', 't1', 't4', 't3'])
  })
})
