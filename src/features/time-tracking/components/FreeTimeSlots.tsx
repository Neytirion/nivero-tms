import { Clock3 } from 'lucide-react'
import type { TimeEntryPreview } from '../../../lib/pm'
import { formatDurationFromMinutes } from '../utils/time-tracking.utils'
import { getFreeTimeSlots } from '../utils/free-time.utils'

interface FreeTimeSlotsProps {
  entries: TimeEntryPreview[]
  date: string
  compact?: boolean
}

export function FreeTimeSlots({ entries, date, compact = false }: FreeTimeSlotsProps) {
  const slots = getFreeTimeSlots(entries, date)

  return (
    <div className={compact ? 'mt-2' : 'rounded-lg border border-emerald-200 bg-emerald-50/70 p-3'}>
      <div className="flex items-center gap-2">
        <Clock3 size={14} className="text-emerald-700" />
        <p className="text-xs font-semibold text-emerald-900">Free time · 08:00–18:00</p>
      </div>
      {slots.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {slots.map((slot) => (
            <span key={`${slot.start}-${slot.end}`} className="rounded-md bg-white px-2 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
              {slot.start}–{slot.end} <span className="font-normal text-emerald-600">({formatDurationFromMinutes(slot.minutes)})</span>
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-xs text-emerald-700">No free time in the working window.</p>
      )}
    </div>
  )
}
