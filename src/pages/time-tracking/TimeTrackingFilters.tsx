import type { ProjectPreview } from '../../lib/pm'

type TimeTrackingFiltersProps = {
  projects: ProjectPreview[]
  activeProjectId: string
  weekAnchorDate: string
  weekRangeTitle: string
  onProjectChange: (projectId: string) => void
  onWeekAnchorDateChange: (date: string) => void
}

export function TimeTrackingFilters({
  projects,
  activeProjectId,
  weekAnchorDate,
  weekRangeTitle,
  onProjectChange,
  onWeekAnchorDateChange,
}: TimeTrackingFiltersProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Project</span>
          <select
            value={activeProjectId}
            onChange={(event) => onProjectChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
          >
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Week</span>
          <input
            type="date"
            value={weekAnchorDate}
            onChange={(event) => onWeekAnchorDateChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
          />
        </label>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Week Range</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{weekRangeTitle}</p>
        </div>
      </div>
    </section>
  )
}
