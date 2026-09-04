import { CalendarDays, Check, Clock3, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { ProjectPreview, TimeEntryPreview } from '../../../lib/pm'
import { formatDurationFromSeconds, getEntryDurationSeconds, localDateTimeToISOString } from '../utils/time-tracking.utils'
import { TwentyFourHourInput } from './TwentyFourHourInput'

interface TimeEntryRowProps {
  entry: TimeEntryPreview
  project: ProjectPreview | undefined
  taskLabel: string
  isSaving: boolean
  onSave: (updatedEntry: Partial<TimeEntryPreview>) => Promise<void>
  onDelete: (entry: TimeEntryPreview) => void
}

function getTimePart(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isFinite(date.getTime())) {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return value.split('T')[1]?.slice(0, 5) ?? ''
}

export function TimeEntryRow({
  entry,
  project,
  taskLabel,
  isSaving,
  onSave,
  onDelete,
}: TimeEntryRowProps) {
  const [entryDate, setEntryDate] = useState(entry.entry_date)
  const [startedAt, setStartedAt] = useState(getTimePart(entry.started_at))
  const [endedAt, setEndedAt] = useState(getTimePart(entry.ended_at))
  const [error, setError] = useState<string | null>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const startInputRef = useRef<HTMLInputElement>(null)
  const endInputRef = useRef<HTMLInputElement>(null)
  const durationSeconds = getEntryDurationSeconds(entry)
  const durationFormatted = formatDurationFromSeconds(durationSeconds)
  const calculatedMinutes = useMemo(() => {
    if (!startedAt || !endedAt) return null
    const [startHours, startMinutes] = startedAt.split(':').map(Number)
    const [endHours, endMinutes] = endedAt.split(':').map(Number)
    const minutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes)
    return minutes > 0 ? minutes : null
  }, [startedAt, endedAt])

  const handleSave = async () => {
    setError(null)
    if (!entryDate) {
      setError('Choose a date.')
      return
    }
    if (!startedAt || !endedAt) {
      setError('Add both start and end times.')
      return
    }
    if (!calculatedMinutes) {
      setError('End time must be after start time.')
      return
    }

    await onSave({
      id: entry.id,
      entry_date: entryDate,
      minutes_spent: calculatedMinutes,
      started_at: localDateTimeToISOString(entryDate, startedAt),
      ended_at: localDateTimeToISOString(entryDate, endedAt),
    })
  }

  const handleFieldBlur = () => {
    void handleSave()
  }

  const openDatePicker = () => {
    const input = dateInputRef.current
    if (!input) return
    if (typeof input.showPicker === 'function') {
      input.showPicker()
    } else {
      input.click()
    }
  }

  const focusNextField = (current: 'start' | 'end', event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (current === 'start') endInputRef.current?.focus()
    if (current === 'end') void handleSave()
  }

  return (
    <div className="relative grid gap-0 border-b border-slate-100 bg-white px-3 py-2 sm:grid-cols-[minmax(220px,2fr)_minmax(90px,0.8fr)_minmax(90px,0.8fr)_minmax(90px,0.8fr)_56px] sm:items-center">
      <div className="min-w-0 border-r border-slate-200 pr-3">
        <div className="flex items-center gap-2">
          <Clock3 size={14} className="shrink-0 text-cyan-700" />
            <p className="truncate text-sm font-semibold text-slate-900">{taskLabel}</p>
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">{project?.name ?? 'Project unavailable'}</p>
      </div>
      <label className="text-xs font-semibold text-slate-600 sm:border-r sm:border-slate-200 sm:pr-2">
        <span className="sr-only">Start</span>
        <TwentyFourHourInput
          value={startedAt}
          onChange={setStartedAt}
          ref={startInputRef}
          onBlur={handleFieldBlur}
          onKeyDown={(event) => focusNextField('start', event)}
          disabled={isSaving}
          className="block h-8 w-full rounded-md border px-2 py-1 text-xs text-slate-900 focus:outline-none"
        />
      </label>
      <label className="text-xs font-semibold text-slate-600 sm:border-r sm:border-slate-200 sm:pr-2">
        <span className="sr-only">End</span>
        <TwentyFourHourInput
          value={endedAt}
          onChange={setEndedAt}
          ref={endInputRef}
          onBlur={handleFieldBlur}
          onKeyDown={(event) => focusNextField('end', event)}
          disabled={isSaving}
          className="block h-8 w-full rounded-md border px-2 py-1 text-xs text-slate-900 focus:outline-none"
        />
      </label>
      <p className="text-xs font-semibold text-slate-700 sm:border-r sm:border-slate-200 sm:pr-2">
        {calculatedMinutes ? formatDurationFromSeconds(calculatedMinutes * 60) : durationFormatted}
      </p>
      <div className="flex min-h-8 items-center gap-2 sm:justify-end">
        <button
          type="button"
          onClick={openDatePicker}
          disabled={isSaving}
          aria-label="Change date"
          title="Change date"
          className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CalendarDays size={16} />
        </button>
        <input
          ref={dateInputRef}
          type="date"
          value={entryDate}
          onChange={(event) => setEntryDate(event.target.value)}
          onBlur={handleFieldBlur}
          disabled={isSaving}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />
        {isSaving ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-800" aria-live="polite">
            <Check size={14} />
            Saving...
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => onDelete(entry)}
          disabled={isSaving}
          aria-label="Delete time entry"
          title="Delete entry"
          className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 size={16} />
        </button>
      </div>
      {error ? (
        <p className="text-xs text-rose-700 lg:col-span-full lg:col-start-1" role="alert">{error}</p>
      ) : null}
    </div>
  )
}
