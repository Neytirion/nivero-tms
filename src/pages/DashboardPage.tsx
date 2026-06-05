import { useMemo } from 'react'
import { useWorkspace } from '../features/dashboard/workspace-context.tsx'
import { deriveProgress, deriveRisk } from '../features/projects/utils/project-metrics'

export function DashboardPage() {
  const { projects, tasks, selectedProjectId, currentUserId } = useWorkspace()

  const healthItems = useMemo(
    () =>
      projects.map((project) => {
        const progress = deriveProgress(project)
        const risk = deriveRisk(project)

        return {
          id: project.id,
          name: project.name,
          progress,
          risk,
          estimatedHours: project.estimated_hours ?? 0,
          actualHours: project.actual_hours ?? 0,
        }
      }),
    [projects],
  )

  const activeProjects = projects.filter((project) => project.status !== 'completed').length
  const completedProjects = projects.filter((project) => project.status === 'completed').length
  const riskProjects = healthItems.filter((project) => project.risk === 'Red').length
  const loggedHours = tasks.reduce((sum, task) => sum + (task.actual_hours ?? 0), 0)
  const openTasks = tasks.filter(
    (task) =>
      !['done', 'completed'].includes((task.status ?? '').toLowerCase()) &&
      task.assigned_to === currentUserId,
  )

  const cards = [
    { label: 'Active Projects', value: activeProjects },
    { label: 'Total Tasks', value: tasks.length },
    { label: 'Logged Hours', value: `${loggedHours.toFixed(1)}h` },
  ]

  const selectedProjectName = projects.find((project) => project.id === selectedProjectId)?.name

  return (
    <div className="space-y-5">
      <section className="page-section bg-slate-50">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Dashboard</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Portfolio Overview</h2>
        <p className="mt-2 text-sm text-slate-600">
          Total Projects: {projects.length} · Active: {activeProjects} · Completed: {completedProjects} · Risks: {riskProjects}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="page-section bg-white">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="page-section">
        <h3 className="section-title">Project Health</h3>
        <div className="mt-4 space-y-3">
          {healthItems.length === 0 ? (
            <p className="text-sm text-slate-500">No projects yet. Create your first project in the Projects module.</p>
          ) : (
            healthItems.slice(0, 6).map((project) => (
              <article key={project.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{project.name}</p>
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
              </article>
            ))
          )}
        </div>
      </section>

      {openTasks.length > 0 ? (
        <section className="page-section">
          <div className="flex items-center justify-between gap-3">
            <h3 className="section-title">My Tasks</h3>
            <span className="text-xs text-slate-500">
              {selectedProjectName ? `Current project: ${selectedProjectName}` : 'All projects'}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {openTasks.slice(0, 6).map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-sm text-slate-800">• {task.title}</p>
                <span className="text-xs text-slate-500">{task.priority ?? 'medium'}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}