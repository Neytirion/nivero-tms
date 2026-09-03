import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { ProjectPreview, TimeEntryPreview } from '../../../lib/pm'
import { formatDurationFromSeconds, getEntryDurationSeconds } from '../utils/time-tracking.utils'
import { TimeEntryRow } from './TimeEntryRow'

interface DayGrouping {
  date: string
  entries: TimeEntryPreview[]
}

interface TimeEntriesGroupedByDayProps {
  entriesByDate: DayGrouping[]
  editingEntryId: string | null
  isLoading: boolean
  projects: ProjectPreview[]
  taskLabelById: Record<string, string>
  isSaving: boolean
  onEdit: (entry: TimeEntryPreview) => void
  onCancel: () => void
  onSave: (updatedEntry: Partial<TimeEntryPreview>) => Promise<void>
  onDelete: (entry: TimeEntryPreview) => void
}

export function TimeEntriesGroupedByDay({
  entriesByDate,
  editingEntryId,
  isLoading,
  projects,
  taskLabelById,
  isSaving,
  onEdit,
  onCancel,
  onDelete,
  onSave,
}: TimeEntriesGroupedByDayProps) {
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set(entriesByDate.map((g) => g.date)))

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev)
      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-500">Loading time entries...</p>
      </div>
    )
  }

  if (entriesByDate.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-500">No time entries found for the selected filters.</p>
      </div>
    )
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">My Time Logs</h3>
          <p className="mt-1 text-xs text-slate-500">Review your entries by day and edit them directly in the list.</p>
        </div>
        <span className="hidden text-xs text-slate-500 sm:block">{entriesByDate.reduce((count, group) => count + group.entries.length, 0)} entries</span>
      </div>

      <div className="space-y-3">
        {entriesByDate.map((dayGroup) => {
          const isExpanded = expandedDates.has(dayGroup.date)
          const dayTotal = dayGroup.entries.reduce((sum, entry) => sum + getEntryDurationSeconds(entry), 0)

          const date = new Date(`${dayGroup.date}T00:00:00`)
          const dayName = `${date.getFullYear()}, ${new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date)} ${date.getDate()}, ${new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date)}.`
          const isToday = dayGroup.date === new Date().toISOString().split('T')[0]

          return (
            <div key={dayGroup.date} className="rounded-lg border border-slate-200 overflow-hidden">
              {/* Day Header */}
              <button
                onClick={() => toggleDate(dayGroup.date)}
                className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3 text-left">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {dayName}
                      {isToday && <span className="ml-2 text-xs font-medium text-cyan-600">(Today)</span>}
                    </p>
                    <p className="text-xs text-slate-500">{dayGroup.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{formatDurationFromSeconds(dayTotal)}</p>
                    <p className="text-xs text-slate-500">{dayGroup.entries.length} entries</p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={20} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={20} className="text-slate-400" />
                  )}
                </div>
              </button>

              {/* Day Entries */}
              {isExpanded && (
                <div className="space-y-2 bg-white px-3 py-3 sm:px-4">
                  {dayGroup.entries.map((entry) => {
                    const project = projects.find((p) => p.id === entry.project_id)
                    const taskLabel = entry.task_id ? taskLabelById[entry.task_id] ?? 'Task unavailable' : 'Unlinked'

                    return (
                      <TimeEntryRow
                        key={`${entry.id}-${editingEntryId === entry.id ? 'editing' : 'view'}`}
                        entry={entry}
                        project={project}
                        taskLabel={taskLabel}
                        isEditing={editingEntryId === entry.id}
                        isSaving={isSaving}
                        onEdit={onEdit}
                        onCancel={onCancel}
                        onSave={onSave}
                        onDelete={onDelete}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
