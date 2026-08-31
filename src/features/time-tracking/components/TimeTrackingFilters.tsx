import { Calendar, Briefcase } from 'lucide-react'
import type { ProjectPreview } from '../../../lib/pm'

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
    <section className="rounded-xl border border-slate-200 bg-[linear-gradient(135deg,rgba(6,182,212,0.04),rgba(16,185,129,0.04))] p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#06b6d4,#10b981)] shadow-md">
          <Calendar size={18} className="text-white" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Time Tracking</h3>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="group block">
          <div className="mb-2 flex items-center gap-2">
            <Briefcase size={16} className="text-violet-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Project</span>
          </div>
          <select
            value={activeProjectId}
            onChange={(event) => onProjectChange(event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition-all hover:border-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50"
          >
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <label className="group block">
          <div className="mb-2 flex items-center gap-2">
            <Calendar size={16} className="text-amber-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Week Starting</span>
          </div>
          <input
            type="date"
            value={weekAnchorDate}
            onChange={(event) => onWeekAnchorDateChange(event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 outline-none transition-all hover:border-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 disabled:opacity-50"
          />
        </label>

        <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-emerald-50 to-cyan-50 px-4 py-3 transition-all hover:border-slate-300 hover:shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Week Range</p>
          <p className="mt-2 text-base font-bold text-emerald-700">{weekRangeTitle}</p>
        </div>
      </div>
    </section>
  )
}
