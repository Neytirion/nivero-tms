import { Calendar, Clock, Briefcase } from 'lucide-react'
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
      {/* Header with icon and title */}
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#06b6d4,#10b981)] shadow-md">
          <Clock size={20} className="text-white" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Time Period</h3>
      </div>

      {/* Main filters in 3 columns */}
      <div className="grid gap-4 grid-cols-3">
        {/* Project Filter Card - with icon and label on colored background */}
        <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-3 transition-all hover:border-slate-300 hover:shadow-sm">
          <div className="mb-2.5 flex items-center gap-2">
            <Briefcase size={16} className="text-violet-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Project</span>
          </div>
          <select
            value={activeProjectId}
            onChange={(event) => onProjectChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none transition-all hover:border-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
          >
            <option value="">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Week Date Filter Card */}
        <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-3 transition-all hover:border-slate-300 hover:shadow-sm">
          <div className="mb-2.5 flex items-center gap-2">
            <Calendar size={16} className="text-amber-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Week Starting</span>
          </div>
          <input
            type="date"
            value={weekAnchorDate}
            onChange={(event) => onWeekAnchorDateChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none transition-all hover:border-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>

        {/* Week Range Display Card - different gradient background */}
        <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-emerald-50 to-cyan-50 p-3 transition-all hover:border-slate-300 hover:shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Week Range</p>
          <p className="mt-1.5 text-sm font-bold text-emerald-700">{weekRangeTitle}</p>
        </div>
      </div>
    </section>
  )
}
