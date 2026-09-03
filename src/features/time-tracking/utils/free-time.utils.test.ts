import { describe, expect, it } from 'vitest'
import type { TimeEntryPreview } from '../../../lib/pm'
import { getFreeTimeSlots } from './free-time.utils'

function createEntry(startedAt: string, endedAt: string): TimeEntryPreview {
  return {
    id: `${startedAt}-${endedAt}`,
    user_id: 'user-1',
    project_id: 'project-1',
    task_id: null,
    entry_date: '2026-09-03',
    minutes_spent: 60,
    is_billable: true,
    started_at: startedAt,
    ended_at: endedAt,
    created_at: '2026-09-03T08:00:00.000Z',
  }
}

describe('getFreeTimeSlots', () => {
  it('merges overlapping entries before calculating free time', () => {
    const entries = [
      createEntry('2026-09-03T11:25:00', '2026-09-03T12:25:00'),
      createEntry('2026-09-03T12:00:00', '2026-09-03T13:00:00'),
    ]

    expect(getFreeTimeSlots(entries, '2026-09-03')).toEqual([
      { start: '09:00', end: '11:25', minutes: 145 },
      { start: '13:00', end: '18:00', minutes: 300 },
    ])
  })

  it('allows adjacent entries without creating a gap', () => {
    const entries = [
      createEntry('2026-09-03T11:00:00', '2026-09-03T12:00:00'),
      createEntry('2026-09-03T12:00:00', '2026-09-03T13:00:00'),
    ]

    expect(getFreeTimeSlots(entries, '2026-09-03')).toEqual([
      { start: '09:00', end: '11:00', minutes: 120 },
      { start: '13:00', end: '18:00', minutes: 300 },
    ])
  })

  it('ignores entries without a complete time range', () => {
    const entry = createEntry('2026-09-03T11:00:00', '2026-09-03T12:00:00')
    const untimedEntry = { ...entry, id: 'untimed', started_at: null, ended_at: null }

    expect(getFreeTimeSlots([untimedEntry], '2026-09-03')).toEqual([
      { start: '09:00', end: '18:00', minutes: 540 },
    ])
  })
})
