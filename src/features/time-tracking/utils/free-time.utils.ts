import type { TimeEntryPreview } from '../../../lib/pm'

export interface FreeTimeSlot {
  start: string
  end: string
  minutes: number
}

const WORKDAY_START_MINUTES = 8 * 60
const WORKDAY_END_MINUTES = 18 * 60

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function getEntryMinutes(entry: TimeEntryPreview, date: string) {
  if (!entry.started_at || !entry.ended_at) return null

  const started = new Date(entry.started_at)
  const ended = new Date(entry.ended_at)
  if (Number.isNaN(started.getTime()) || Number.isNaN(ended.getTime())) return null
  if (started.toISOString().slice(0, 10) !== date && entry.entry_date !== date) return null

  return {
    start: Math.max(WORKDAY_START_MINUTES, started.getHours() * 60 + started.getMinutes()),
    end: Math.min(WORKDAY_END_MINUTES, ended.getHours() * 60 + ended.getMinutes()),
  }
}

export function getFreeTimeSlots(entries: TimeEntryPreview[], date: string): FreeTimeSlot[] {
  const occupied = entries
    .map((entry) => getEntryMinutes(entry, date))
    .filter((interval): interval is { start: number; end: number } => interval !== null && interval.end > interval.start)
    .sort((a, b) => a.start - b.start)

  const merged = occupied.reduce<Array<{ start: number; end: number }>>((result, interval) => {
    const previous = result[result.length - 1]
    if (previous && interval.start <= previous.end) {
      previous.end = Math.max(previous.end, interval.end)
    } else {
      result.push({ ...interval })
    }
    return result
  }, [])

  const slots: FreeTimeSlot[] = []
  let cursor = WORKDAY_START_MINUTES
  for (const interval of merged) {
    if (interval.start > cursor) {
      slots.push({ start: formatMinutes(cursor), end: formatMinutes(interval.start), minutes: interval.start - cursor })
    }
    cursor = Math.max(cursor, interval.end)
  }
  if (cursor < WORKDAY_END_MINUTES) {
    slots.push({ start: formatMinutes(cursor), end: formatMinutes(WORKDAY_END_MINUTES), minutes: WORKDAY_END_MINUTES - cursor })
  }

  return slots
}
