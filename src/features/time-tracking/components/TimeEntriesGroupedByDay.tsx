import type { ProjectPreview, TimeEntryPreview } from '../../../lib/pm'
import { formatDurationFromSeconds, getEntryDurationSeconds } from '../utils/time-tracking.utils'
import { TimeEntryRow } from './TimeEntryRow'
import { FreeTimeSlots } from './FreeTimeSlots'

interface DayGrouping {
  date: string
  entries: TimeEntryPreview[]
}

interface TimeEntriesGroupedByDayProps {
  entriesByDate: DayGrouping[]
  allEntries: TimeEntryPreview[]
  isLoading: boolean
  projects: ProjectPreview[]
  taskLabelById: Record<string, string>
  savingEntryId: string | null
  onSave: (updatedEntry: Partial<TimeEntryPreview>) => Promise<void>
  onDelete: (entry: TimeEntryPreview) => void
}

export function TimeEntriesGroupedByDay({
  entriesByDate,
  allEntries,
  isLoading,
  projects,
  taskLabelById,
  savingEntryId,
  onDelete,
  onSave,
}: TimeEntriesGroupedByDayProps) {
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
    <div className="overflow-x-auto rounded-lg border border-slate-200">
        <div className="hidden min-w-[760px] grid-cols-[minmax(220px,2fr)_minmax(120px,1fr)_minmax(90px,0.8fr)_minmax(90px,0.8fr)_minmax(90px,0.8fr)_56px] border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:grid">
          <span className="border-r border-slate-200 pr-3">Task / Project</span>
          <span className="border-r border-slate-200 pr-2">Date</span>
          <span className="border-r border-slate-200 pr-2">Start</span>
          <span className="border-r border-slate-200 pr-2">End</span>
          <span className="border-r border-slate-200 pr-2">Duration</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="min-w-[760px] divide-y divide-slate-100">
          {entriesByDate.map((dayGroup) => {
          const dayTotal = dayGroup.entries.reduce((sum, entry) => sum + getEntryDurationSeconds(entry), 0)

          const date = new Date(`${dayGroup.date}T00:00:00`)
          const dayName = `${date.getFullYear()}, ${new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date)} ${date.getDate()}, ${new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date)}.`
          const isToday = dayGroup.date === new Date().toISOString().split('T')[0]

          return (
            <div key={dayGroup.date}>
              <div className="flex items-center justify-between gap-3 border-y-2 border-slate-300 bg-slate-100 px-3 py-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-800">{dayName}</p>
                  {isToday && <span className="text-[10px] font-semibold text-cyan-700">Today</span>}
                  <span className="text-[10px] text-slate-400">{dayGroup.date}</span>
                </div>
                <span className="text-xs font-semibold text-slate-600">{formatDurationFromSeconds(dayTotal)} · {dayGroup.entries.length} entries</span>
              </div>
              <div className="border-b border-slate-200 bg-emerald-50/30 px-3 py-1">
                <FreeTimeSlots entries={allEntries} date={dayGroup.date} compact />
              </div>
              <div className="divide-y divide-slate-100">
                {dayGroup.entries.map((entry) => {
                  const project = projects.find((p) => p.id === entry.project_id)
                  const taskLabel = entry.task_id ? taskLabelById[entry.task_id] ?? 'Task unavailable' : 'Unlinked'

                  return (
                    <TimeEntryRow
                      key={entry.id}
                      entry={entry}
                      project={project}
                      taskLabel={taskLabel}
                      isSaving={savingEntryId === entry.id}
                      onSave={onSave}
                      onDelete={onDelete}
                    />
                  )
                })}
              </div>
            </div>
          )
          })}
        </div>
    </div>
  )
}
