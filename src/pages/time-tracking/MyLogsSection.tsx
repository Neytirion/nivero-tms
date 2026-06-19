import type { ProjectPreview, TimeEntryPreview } from '../../lib/pm'
import { toHours } from './time-tracking.utils'

type MyLogsSectionProps = {
  editingEntryId: string | null
  isEntriesLoading: boolean
  visibleEntries: TimeEntryPreview[]
  projects: ProjectPreview[]
  taskLabelById: Record<string, string>
  isTaskLabelsLoading: boolean
  onCancelEdit: () => void
  onBeginEdit: (entry: TimeEntryPreview) => void
  onRequestDelete: (entry: TimeEntryPreview) => void
}

export function MyLogsSection({
  editingEntryId,
  isEntriesLoading,
  visibleEntries,
  projects,
  taskLabelById,
  isTaskLabelsLoading,
  onCancelEdit,
  onBeginEdit,
  onRequestDelete,
}: MyLogsSectionProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">My Logs This Week</h3>
          <p className="mt-1 text-xs text-slate-500">Edit or delete your own time entries here, even if the task was removed.</p>
        </div>
        {editingEntryId ? (
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Cancel edit
          </button>
        ) : null}
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full bg-white text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Project</th>
              <th className="px-3 py-2 text-left">Task</th>
              <th className="px-3 py-2 text-left">Hours</th>
              <th className="px-3 py-2 text-left">Notes</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isEntriesLoading ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                  Loading entries...
                </td>
              </tr>
            ) : visibleEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                  No entries for selected week.
                </td>
              </tr>
            ) : (
              visibleEntries.map((entry) => {
                const projectName =
                  projects.find((project) => project.id === entry.project_id)?.name ??
                  (projects.length === 0 ? 'Loading project...' : 'Project unavailable')
                const taskName = entry.task_id
                  ? taskLabelById[entry.task_id] ?? (isTaskLabelsLoading ? 'Loading task...' : 'Task unavailable')
                  : 'Unlinked'

                return (
                  <tr key={entry.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-700">{entry.entry_date}</td>
                    <td className="px-3 py-2 text-slate-700">{projectName}</td>
                    <td className="px-3 py-2 text-slate-600">{taskName}</td>
                    <td className="px-3 py-2 text-slate-700">{toHours(entry.minutes_spent).toFixed(2)}</td>
                    <td className="px-3 py-2 text-slate-500">{entry.notes || '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onBeginEdit(entry)}
                          className="rounded-md border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-800 hover:bg-cyan-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestDelete(entry)}
                          className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
