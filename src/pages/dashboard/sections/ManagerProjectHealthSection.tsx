import type { DashboardHealthItem } from '../useDashboardPageController'
import { formatCurrency, formatDueDate } from '../dashboard-page.utils'

interface ManagerProjectHealthSectionProps {
  healthItems: DashboardHealthItem[]
}

export function ManagerProjectHealthSection({ healthItems }: ManagerProjectHealthSectionProps) {
  return (
    <section className="page-section">
      <h3 className="section-title">Project Health</h3>
      <div className="mt-4 space-y-3">
        {healthItems.length === 0 ? (
          <p className="text-sm text-slate-500">No projects yet. Create your first project in the Projects module.</p>
        ) : (
          healthItems.slice(0, 6).map((project) => (
            <article key={project.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      project.risk === 'Red'
                        ? 'bg-rose-100 text-rose-700'
                        : project.risk === 'Amber'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    Risk: {project.risk}
                  </span>
                  <p className="text-sm font-semibold text-slate-900">{project.name}</p>
                </div>
              </div>

              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-cyan-600 transition-all"
                  style={{ width: `${project.progress}%` }}
                />
              </div>

              <p className="mt-2 text-xs text-slate-600">
                {project.progress}% · Hours: {project.actualHours} / {project.estimatedHours}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Start: {project.startDate ? formatDueDate(project.startDate) : 'Not set'}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Planned End: {project.plannedEndDate ? formatDueDate(project.plannedEndDate) : 'Not set'}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Forecast:{' '}
                {project.isNotStarted
                  ? 'Not started'
                  : project.forecastDate
                    ? formatDueDate(project.forecastDate)
                    : 'Not enough data'}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Budget:{' '}
                {project.budgetConsumption
                  ? `${formatCurrency(project.budgetConsumption.spentAmount)} / ${formatCurrency(project.budgetConsumption.budgetAmount)} (${project.budgetConsumption.burnPercent}%)`
                  : 'Not set'}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  )
}
