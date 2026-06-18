import { ManagerProjectHealthSection } from './dashboard/sections/ManagerProjectHealthSection'
import { MyTasksSection } from './dashboard/sections/MyTasksSection'
import { useDashboardPageController } from './dashboard/useDashboardPageController'

export function DashboardPage() {
  const {
    dashboardMode,
    hasManagerAccess,
    setDashboardModeOverride,
    cards,
    projects,
    healthItems,
    activeProjects,
    completedProjects,
    riskProjects,
    openTasksForDashboard,
    dueThisWeekCount,
    myTrackedTaskHours,
    isMemberInSelectedProject,
    selectedProjectName,
    openTasksByProject,
  } = useDashboardPageController()

  return (
    <div className="space-y-5">
      <section className="page-section bg-slate-50">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Dashboard</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Portfolio Overview</h2>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mode</p>
          <button
            type="button"
            onClick={() => setDashboardModeOverride('consultant')}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
              dashboardMode === 'consultant'
                ? 'border-cyan-300 bg-cyan-100 text-cyan-900'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            Consultant
          </button>
          {hasManagerAccess ? (
            <button
              type="button"
              onClick={() => setDashboardModeOverride('manager')}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                dashboardMode === 'manager'
                  ? 'border-cyan-300 bg-cyan-100 text-cyan-900'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Project Manager
            </button>
          ) : null}
        </div>

        <p className="mt-2 text-xs text-slate-600">
          {dashboardMode === 'manager'
            ? 'Manager dashboard: project status, risk, capacity signals, and forecast.'
            : 'Consultant dashboard: assigned tasks, due dates, and your tracked task hours.'}
        </p>

        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {dashboardMode === 'manager'
              ? cards.map((card) => (
                  <article key={card.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{card.label}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{card.value}</p>
                  </article>
                ))
              : [
                  { label: 'My Open Tasks', value: String(openTasksForDashboard.length) },
                  { label: 'Due This Week', value: String(dueThisWeekCount) },
                  { label: 'My Tracked Task Hours', value: `${myTrackedTaskHours.toFixed(1)}h` },
                ].map((card) => (
                  <article key={card.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{card.label}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{card.value}</p>
                  </article>
                ))}
          </div>

          {dashboardMode === 'manager' ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                Total Projects: <span className="font-semibold text-slate-900">{projects.length}</span>
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                Active: <span className="font-semibold text-slate-900">{activeProjects}</span>
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                Completed: <span className="font-semibold text-slate-900">{completedProjects}</span>
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">
                Risks: <span className="font-semibold text-slate-900">{riskProjects}</span>
              </span>
            </div>
          ) : null}
        </div>
      </section>

      {dashboardMode === 'manager' ? <ManagerProjectHealthSection healthItems={healthItems} /> : null}

      <MyTasksSection
        openTasksByProject={openTasksByProject}
        isMemberInSelectedProject={isMemberInSelectedProject}
        selectedProjectName={selectedProjectName}
      />
    </div>
  )
}
