import { Edit2, Trash2 } from 'lucide-react'
import type { ProjectPreview, TimeEntryPreview } from '../../../lib/pm'
import { formatDurationFromSeconds, getEntryDurationSeconds } from '../utils/time-tracking.utils'

interface TimeEntryRowProps {
  entry: TimeEntryPreview
  project: ProjectPreview | undefined
  taskLabel: string
  isEditing: boolean
  onEdit: (entry: TimeEntryPreview) => void
  onDelete: (entry: TimeEntryPreview) => void
}

export function TimeEntryRow({
  entry,
  project,
  taskLabel,
  isEditing,
  onEdit,
  onDelete,
}: TimeEntryRowProps) {
  const durationSeconds = getEntryDurationSeconds(entry)
  const durationFormatted = formatDurationFromSeconds(durationSeconds)

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

      <div className="flex items-center gap-4 ml-4">
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900">{durationFormatted}</p>
        </div>

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
