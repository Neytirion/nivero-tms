import type { TimeEntryPreview } from '../lib/pm'

export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function startOfWeek(date: Date) {
  const value = new Date(date)
  const day = value.getDay()
  const diff = day === 0 ? -6 : 1 - day
  value.setDate(value.getDate() + diff)
  value.setHours(0, 0, 0, 0)
  return value
}

export function endOfWeek(date: Date) {
  const value = new Date(date)
  value.setDate(value.getDate() + 6)
  value.setHours(23, 59, 59, 999)
  return value
}

export function toHours(minutes: number) {
  return minutes / 60
}

export function formatHours(minutes: number) {
  return `${toHours(minutes).toFixed(2)}h`
}

export function buildWeeklySummary(entries: TimeEntryPreview[]) {
  const byDay = entries.reduce<Record<string, number>>((acc, entry) => {
    const key = entry.entry_date
    acc[key] = (acc[key] ?? 0) + entry.minutes_spent
    return acc
  }, {})

  const totalMinutes = entries.reduce((sum, entry) => sum + entry.minutes_spent, 0)
  const billableMinutes = entries
    .filter((entry) => entry.is_billable)
    .reduce((sum, entry) => sum + entry.minutes_spent, 0)

  const nonBillableMinutes = totalMinutes - billableMinutes

  return {
    byDay,
    totalMinutes,
    billableMinutes,
    nonBillableMinutes,
  }
}
