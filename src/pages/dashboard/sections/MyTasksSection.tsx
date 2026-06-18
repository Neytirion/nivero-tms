import type { OpenTasksGroup } from '../useDashboardPageController'
import { formatDueDate } from '../dashboard-page.utils'

interface MyTasksSectionProps {
  openTasksByProject: OpenTasksGroup[]
  isMemberInSelectedProject: boolean
  selectedProjectName: string | undefined
}

export function MyTasksSection({
  openTasksByProject,
  isMemberInSelectedProject,
  selectedProjectName,
}: MyTasksSectionProps) {
  if (openTasksByProject.length === 0) {
    return null
  }

  return (
    <section className="page-section">
      <div className="flex items-center justify-between gap-3">
        <h3 className="section-title">My Tasks</h3>
        <span className="text-xs text-slate-500">
          {isMemberInSelectedProject
            ? 'All projects assigned to me'
            : selectedProjectName
              ? `Current project: ${selectedProjectName}`
              : 'All projects'}
        </span>
      </div>
      <div className="mt-3 space-y-3">
        {openTasksByProject.map((group) => (
          <article key={group.projectName} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{group.projectName}</h4>
            <div className="mt-2 space-y-2">
              {group.tasks.slice(0, 6).map((task) => (
                <div key={task.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="text-sm text-slate-800">• {task.title}</p>
                  <p className="text-[11px] text-slate-500">
                    Priority: {task.priority ?? 'medium'} · Due: {formatDueDate(task.due_date)}
                  </p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
