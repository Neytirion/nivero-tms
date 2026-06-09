import { useEffect, useMemo, useState } from 'react'
import { useWorkspace } from '../features/dashboard/workspace-context.tsx'
import { deriveProgress, deriveRisk } from '../features/projects/utils/project-metrics'
import { getProjectTasks, type TaskPreview } from '../lib/pm'

function formatDueDate(value: string | null | undefined) {
  if (!value) {
    return 'No due date'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

export function DashboardPage() {
  const { projects, tasks, selectedProjectId, currentUserId, getProjectRole } = useWorkspace()
  const [memberTasksAcrossProjects, setMemberTasksAcrossProjects] = useState<TaskPreview[]>([])

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

  const selectedProjectRole = selectedProjectId ? getProjectRole(selectedProjectId) : null
  const isMemberInSelectedProject = selectedProjectRole === 'member'

  useEffect(() => {
    let isCancelled = false

    const loadMemberTasksAcrossProjects = async () => {
      if (!isMemberInSelectedProject || !currentUserId || projects.length === 0) {
        if (!isCancelled) {
          setMemberTasksAcrossProjects([])
        }
        return
      }

      const tasksByProject = await Promise.all(
        projects.map(async (project) => ({
          projectId: project.id,
          projectName: project.name,
          tasks: await getProjectTasks(project.id),
        })),
      )

      if (isCancelled) {
        return
      }

      const assignedOpenTasks = tasksByProject
        .flatMap((item) => item.tasks.map((task) => ({ ...task, project_name: item.projectName })))
        .filter(
          (task) =>
            task.assigned_to === currentUserId &&
            !['done', 'completed'].includes((task.status ?? '').toLowerCase()),
        )
        .sort((a, b) => compareDueDateAsc(a.due_date, b.due_date))

      setMemberTasksAcrossProjects(assignedOpenTasks)
    }

    void loadMemberTasksAcrossProjects()

    return () => {
      isCancelled = true
    }
  }, [currentUserId, isMemberInSelectedProject, projects])

  const openTasksForDashboard = isMemberInSelectedProject ? memberTasksAcrossProjects : openTasks

  const cards = [
    { label: 'Active Projects', value: String(activeProjects) },
    { label: 'Total Tasks', value: String(tasks.length) },
    { label: 'Logged Hours', value: `${loggedHours.toFixed(1)}h` },
  ]

  const selectedProjectName = projects.find((project) => project.id === selectedProjectId)?.name
  const openTasksByProject = useMemo(() => {
    const grouped = new Map<string, { tasks: TaskPreview[]; nearestDueDate: string | null }>()

    for (const task of openTasksForDashboard) {
      const maybeProjectName =
        'project_name' in task ? (task as TaskPreview & { project_name?: string }).project_name : undefined
      const projectName: string = maybeProjectName || selectedProjectName || 'Current Project'

      const bucket = grouped.get(projectName)
      if (bucket) {
        bucket.tasks.push(task)
        if (compareDueDateAsc(task.due_date, bucket.nearestDueDate) < 0) {
          bucket.nearestDueDate = task.due_date
        }
      } else {
        grouped.set(projectName, {
          tasks: [task],
          nearestDueDate: task.due_date ?? null,
        })
      }
    }

    return Array.from(grouped.entries())
      .map(([projectName, value]) => ({
        projectName,
        nearestDueDate: value.nearestDueDate,
        tasks: [...value.tasks].sort((a, b) => compareDueDateAsc(a.due_date, b.due_date)),
      }))
      .sort((a, b) => compareDueDateAsc(a.nearestDueDate, b.nearestDueDate))
  }, [openTasksForDashboard, selectedProjectName])

  return (
    <div className="space-y-5">
      <section className="page-section bg-slate-50">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Dashboard</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Portfolio Overview</h2>

        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <article key={card.label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{card.label}</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{card.value}</p>
              </article>
            ))}
          </div>

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
        </div>
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
              </article>
            ))
          )}
        </div>
      </section>

      {openTasksForDashboard.length > 0 ? (
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
      ) : null}
    </div>
  )
}

function compareDueDateAsc(left: string | null | undefined, right: string | null | undefined) {
  if (!left && !right) {
    return 0
  }

  if (!left) {
    return 1
  }

  if (!right) {
    return -1
  }

  return left.localeCompare(right)
}