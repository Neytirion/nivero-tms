import type { TimeEntryPreview } from '../../../lib/pm'

export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function localDateTimeToISOString(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number)
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString()
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
  return formatDurationFromMinutes(minutes)
}

export function formatDurationFromSeconds(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds))
  const hoursPart = Math.floor(safeSeconds / 3600)
  const minutesPart = Math.floor((safeSeconds % 3600) / 60)
  const secondsPart = safeSeconds % 60

  if (hoursPart > 0) {
    if (secondsPart > 0) {
      return `${hoursPart}h ${minutesPart}m ${secondsPart}s`
    }

    if (minutesPart > 0) {
      return `${hoursPart}h ${minutesPart}m`
    }

    return `${hoursPart}h`
  }

  if (minutesPart > 0) {
    if (secondsPart > 0) {
      return `${minutesPart}m ${secondsPart}s`
    }

    return `${minutesPart}m`
  }

  return `${secondsPart}s`
}

export function formatDurationFromMinutes(minutes: number) {
  return formatDurationFromSeconds(minutes * 60)
}

export function formatDurationFromHours(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) {
    return '0m'
  }

  return formatDurationFromMinutes(hours * 60)
}

export function parseTimeInputToHours(input: string): number | null {
  const raw = input.trim().toLowerCase()
  if (!raw) {
    return null
  }

  const normalized = raw.replace(',', '.')

  const asNumber = Number.parseFloat(normalized)
  if (/^\d+(?:\.\d+)?$/.test(normalized) && Number.isFinite(asNumber) && asNumber > 0) {
    return asNumber
  }

  const colonMatch = normalized.match(/^(\d+):(\d{1,2})$/)
  if (colonMatch) {
    const hoursPart = Number.parseInt(colonMatch[1], 10)
    const minutesPart = Number.parseInt(colonMatch[2], 10)
    if (minutesPart >= 0 && minutesPart < 60) {
      const totalMinutes = (hoursPart * 60) + minutesPart
      return totalMinutes > 0 ? totalMinutes / 60 : null
    }
    return null
  }

  const compact = normalized.replace(/\s+/g, '')
  const hourMinuteMatch = compact.match(/^(?:(\d+(?:\.\d+)?)h)?(?:(\d+)m)?$/)
  if (hourMinuteMatch) {
    const hoursPart = hourMinuteMatch[1] ? Number.parseFloat(hourMinuteMatch[1]) : 0
    const minutesPart = hourMinuteMatch[2] ? Number.parseInt(hourMinuteMatch[2], 10) : 0
    const totalHours = hoursPart + (minutesPart / 60)
    return totalHours > 0 ? totalHours : null
  }

  return null
}

export function getEntryDurationSeconds(entry: Pick<TimeEntryPreview, 'minutes_spent' | 'started_at' | 'ended_at'>) {
  if (entry.started_at && entry.ended_at) {
    const startedMs = Date.parse(entry.started_at)
    const endedMs = Date.parse(entry.ended_at)

    if (Number.isFinite(startedMs) && Number.isFinite(endedMs) && endedMs > startedMs) {
      return Math.floor((endedMs - startedMs) / 1000)
    }
  }

  return Math.max(0, Math.round(entry.minutes_spent * 60))
}

export function buildWeeklySummary(entries: TimeEntryPreview[]) {
  const byDay = entries.reduce<Record<string, number>>((acc, entry) => {
    const key = entry.entry_date
    acc[key] = (acc[key] ?? 0) + getEntryDurationSeconds(entry)
    return acc
  }, {})

  const totalSeconds = entries.reduce((sum, entry) => sum + getEntryDurationSeconds(entry), 0)
  const billableSeconds = entries
    .filter((entry) => entry.is_billable)
    .reduce((sum, entry) => sum + getEntryDurationSeconds(entry), 0)

  const nonBillableSeconds = totalSeconds - billableSeconds

  return {
    byDay,
    totalSeconds,
    billableSeconds,
    nonBillableSeconds,
  }
}
