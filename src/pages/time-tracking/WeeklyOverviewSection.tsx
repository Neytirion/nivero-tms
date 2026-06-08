import type { ProjectPreview, TaskPreview, TimeEntryPreview } from '../../lib/pm'
import { formatHours, toHours } from '../time-tracking.utils'

type WeeklySummary = {
  byDay: Record<string, number>
  totalMinutes: number
  billableMinutes: number
  nonBillableMinutes: number
}

type WeeklyOverviewSectionProps = {
  isEntriesLoading: boolean
  entries: TimeEntryPreview[]
  projects: ProjectPreview[]
  projectTasks: TaskPreview[]
  weeklySummary: WeeklySummary
}

export function WeeklyOverviewSection({
  isEntriesLoading,
  entries,
  projects,
  projectTasks,
  weeklySummary,
}: WeeklyOverviewSectionProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">Weekly Timesheet Overview</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="rounded-full bg-slate-100 px-2 py-1">Total: {formatHours(weeklySummary.totalMinutes)}</span>
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">
            Billable: {formatHours(weeklySummary.billableMinutes)}
          </span>
          <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">
            Non-billable: {formatHours(weeklySummary.nonBillableMinutes)}
          </span>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full bg-white text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Project</th>
              <th className="px-3 py-2 text-left">Task</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Hours</th>
              <th className="px-3 py-2 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {isEntriesLoading ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                  Loading entries...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                  No entries for selected week.
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const projectName = projects.find((project) => project.id === entry.project_id)?.name ?? entry.project_id
                const taskName = entry.task_id
                  ? projectTasks.find((task) => task.id === entry.task_id)?.title ?? entry.task_id
                  : 'Unlinked'

                return (
                  <tr key={entry.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-700">{entry.entry_date}</td>
                    <td className="px-3 py-2 text-slate-700">{projectName}</td>
                    <td className="px-3 py-2 text-slate-600">{taskName}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          entry.is_billable ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {entry.is_billable ? 'Billable' : 'Non-billable'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{entry.category}</td>
                    <td className="px-3 py-2 text-slate-700">{toHours(entry.minutes_spent).toFixed(2)}</td>
                    <td className="px-3 py-2 text-slate-500">{entry.notes || '—'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Daily Breakdown</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {Object.keys(weeklySummary.byDay).length === 0 ? (
            <p className="text-xs text-slate-500">No logged days yet.</p>
          ) : (
            Object.entries(weeklySummary.byDay)
              .sort(([left], [right]) => left.localeCompare(right))
              .map(([date, minutes]) => (
                <div key={date} className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
                  <p className="text-[11px] text-slate-500">{date}</p>
                  <p className="text-sm font-semibold text-slate-800">{formatHours(minutes)}</p>
                </div>
              ))
          )}
        </div>
      </div>
    </section>
  )
}
