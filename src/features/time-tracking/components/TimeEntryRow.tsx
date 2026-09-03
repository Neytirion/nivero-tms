import { Check, Clock3, Edit2, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { ProjectPreview, TimeEntryPreview } from '../../../lib/pm'
import { formatDurationFromSeconds, getEntryDurationSeconds } from '../utils/time-tracking.utils'
import { TwentyFourHourInput } from './TwentyFourHourInput'

interface TimeEntryRowProps {
  entry: TimeEntryPreview
  project: ProjectPreview | undefined
  taskLabel: string
  isEditing: boolean
  isSaving: boolean
  onEdit: (entry: TimeEntryPreview) => void
  onSave: (updatedEntry: Partial<TimeEntryPreview>) => Promise<void>
  onDelete: (entry: TimeEntryPreview) => void
}

function getTimePart(value: string | null) {
  return value?.split('T')[1]?.slice(0, 5) ?? ''
}

export function TimeEntryRow({
  entry,
  project,
  taskLabel,
  isEditing,
  isSaving,
  onEdit,
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
      started_at: `${entryDate}T${startedAt}:00`,
      ended_at: `${entryDate}T${endedAt}:00`,
    })
  }

  const handleFieldBlur = () => {
    void handleSave()
  }

  const focusNextField = (current: 'date' | 'start' | 'end', event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (current === 'start') endInputRef.current?.focus()
    if (current === 'end') void handleSave()
  }

  if (isEditing) {
    return (
      <div className="rounded-lg border border-cyan-300 bg-cyan-50/60 p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_150px_130px_130px_auto] lg:items-end">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Clock3 size={16} className="shrink-0 text-cyan-700" />
              <p className="truncate text-sm font-semibold text-slate-900">{project?.name ?? 'Project unavailable'}</p>
            </div>
            <p className="mt-1 truncate text-xs text-slate-600">{taskLabel}</p>
          </div>
          <label className="text-xs font-semibold text-slate-600">
            Date
            <input
              type="date"
              value={entryDate}
              ref={dateInputRef}
              onChange={(event) => setEntryDate(event.target.value)}
              onBlur={handleFieldBlur}
              onKeyDown={(event) => focusNextField('date', event)}
              disabled={isSaving}
              className="mt-1 block w-full rounded-md border px-2.5 py-2 text-sm text-slate-900 focus:outline-none"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Start
            <TwentyFourHourInput
              value={startedAt}
              onChange={setStartedAt}
              ref={startInputRef}
              onBlur={handleFieldBlur}
              onKeyDown={(event) => focusNextField('start', event)}
              disabled={isSaving}
              className="mt-1 block w-full rounded-md border px-2.5 py-2 text-sm text-slate-900 focus:outline-none"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            End
            <TwentyFourHourInput
              value={endedAt}
              onChange={setEndedAt}
              ref={endInputRef}
              onBlur={handleFieldBlur}
              onKeyDown={(event) => focusNextField('end', event)}
              disabled={isSaving}
              className="mt-1 block w-full rounded-md border px-2.5 py-2 text-sm text-slate-900 focus:outline-none"
            />
          </label>
          <div className="flex items-center lg:justify-end">
            {isSaving ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-800" aria-live="polite">
                <Check size={14} />
                Saving...
              </span>
            ) : null}
          </div>
        </div>
        <div className="mt-3">
          <p className={`text-xs ${error ? 'text-rose-700' : 'text-slate-500'}`} role={error ? 'alert' : undefined}>
            {error ?? (calculatedMinutes ? `Duration: ${formatDurationFromSeconds(calculatedMinutes * 60)}` : 'Set a valid time range.')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
        isEditing
          ? 'border-cyan-300 bg-cyan-50'
          : 'border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-900">{project?.name ?? 'Project unavailable'}</span>
          {entry.is_billable ? (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
              Billable
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Non-billable
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-600">{taskLabel}</p>
      </div>

      <div className="ml-4 flex items-center gap-4">
        <p className="min-w-[70px] text-right text-sm font-semibold text-slate-900">{durationFormatted}</p>

        <div className="flex gap-2">
          <button
            onClick={() => onEdit(entry)}
            disabled={isEditing}
            className="rounded-md border border-cyan-200 bg-cyan-50 p-1.5 text-cyan-700 hover:bg-cyan-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Edit entry"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onDelete(entry)}
            disabled={isEditing}
            className="rounded-md border border-rose-200 bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Delete entry"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
