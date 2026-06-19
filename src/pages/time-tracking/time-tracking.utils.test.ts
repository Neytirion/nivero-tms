import { describe, expect, it } from 'vitest'
import type { TimeEntryPreview } from '../../lib/pm'
import {
  buildWeeklySummary,
  endOfWeek,
  formatHours,
  startOfWeek,
  toDateInputValue,
  toHours,
} from './time-tracking.utils'

function createTimeEntry(overrides: Partial<TimeEntryPreview> = {}): TimeEntryPreview {
  return {
    id: 'entry-1',
    user_id: 'user-1',
    project_id: 'project-1',
    task_id: null,
    entry_date: '2026-06-17',
    minutes_spent: 60,
    is_billable: true,
    notes: null,
    started_at: null,
    ended_at: null,
    created_at: '2026-06-17T10:00:00.000Z',
    ...overrides,
  }
}

describe('time-tracking.utils', () => {
  it('formats date for input controls', () => {
    const date = new Date('2026-06-17T12:34:56.000Z')
    expect(toDateInputValue(date)).toBe('2026-06-17')
  })

  it('calculates week boundaries with Monday start', () => {
    const sunday = new Date('2026-06-21T10:00:00')
    const start = startOfWeek(sunday)
    const end = endOfWeek(start)

    expect(start.getDay()).toBe(1)
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(end.getDay()).toBe(0)
    expect(end.getHours()).toBe(23)
    expect(end.getMinutes()).toBe(59)
  })

  it('converts and formats hours from minutes', () => {
    expect(toHours(90)).toBe(1.5)
    expect(formatHours(90)).toBe('1.50h')
  })

  it('builds weekly summary totals and daily buckets', () => {
    const entries = [
      createTimeEntry({ entry_date: '2026-06-16', minutes_spent: 120, is_billable: true }),
      createTimeEntry({ entry_date: '2026-06-16', minutes_spent: 30, is_billable: false }),
      createTimeEntry({ entry_date: '2026-06-17', minutes_spent: 90, is_billable: true }),
    ]

    const summary = buildWeeklySummary(entries)

    expect(summary.byDay['2026-06-16']).toBe(150)
    expect(summary.byDay['2026-06-17']).toBe(90)
    expect(summary.totalMinutes).toBe(240)
    expect(summary.billableMinutes).toBe(210)
    expect(summary.nonBillableMinutes).toBe(30)
  })
})
