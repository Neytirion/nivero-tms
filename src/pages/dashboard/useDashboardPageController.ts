import { useEffect, useMemo, useState } from 'react'
import { useWorkspace } from '../../features/dashboard/workspace-context.tsx'
import { deriveBudgetConsumption, deriveForecastCompletionDate, deriveProgress, deriveRisk } from '../../features/projects/utils/project-metrics'
import { getProjectTasks, type TaskPreview } from '../../lib/pm'
import { compareDueDateAsc, countTasksDueThisWeek } from './dashboard-page.utils'

export type DashboardMode = 'consultant' | 'manager'

export interface DashboardHealthItem {
  id: string
  name: string
  progress: number
  risk: string
  startDate: string | null
  plannedEndDate: string | null
  estimatedHours: number
  actualHours: number
  forecastDate: string | null
  budgetConsumption: ReturnType<typeof deriveBudgetConsumption>
  isNotStarted: boolean
}

export interface OpenTasksGroup {
  projectName: string
  nearestDueDate: string | null
  tasks: TaskPreview[]
}

export function useDashboardPageController() {
  const { projects, tasks, selectedProjectId, currentUserId, getProjectRole } = useWorkspace()
  const [memberTasksAcrossProjects, setMemberTasksAcrossProjects] = useState<TaskPreview[]>([])
  const [dashboardModeOverride, setDashboardModeOverride] = useState<DashboardMode | null>(null)

  const hasManagerAccess = useMemo(
    () => projects.some((project) => {
      const role = getProjectRole(project.id)
      return role === 'owner' || role === 'admin' || role === 'manager'
    }),
    [projects, getProjectRole],
  )

  const dashboardMode: DashboardMode = dashboardModeOverride ?? (hasManagerAccess ? 'manager' : 'consultant')

  const healthItems = useMemo<DashboardHealthItem[]>(
    () =>
      projects.map((project) => {
        const progress = deriveProgress(project)
        const risk = deriveRisk(project)

        return {
          id: project.id,
          name: project.name,
          progress,
          risk,
          startDate: project.start_date,
          plannedEndDate: project.end_date,
          estimatedHours: project.estimated_hours ?? 0,
          actualHours: project.actual_hours ?? 0,
          forecastDate: deriveForecastCompletionDate(project),
          budgetConsumption: deriveBudgetConsumption(project),
          isNotStarted: project.start_date
            ? new Date(project.start_date).getTime() > new Date().getTime()
            : false,
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
          projectName: project.name,
          tasks: (await getProjectTasks(project.id)) ?? [],
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
  const dueThisWeekCount = countTasksDueThisWeek(openTasksForDashboard)
  const myTrackedTaskHours = openTasksForDashboard.reduce((sum, task) => sum + (task.actual_hours ?? 0), 0)

  const cards = [
    { label: 'Active Projects', value: String(activeProjects) },
    { label: 'Total Tasks', value: String(tasks.length) },
    { label: 'Logged Hours', value: `${loggedHours.toFixed(1)}h` },
  ]

  const selectedProjectName = projects.find((project) => project.id === selectedProjectId)?.name

  const openTasksByProject = useMemo<OpenTasksGroup[]>(() => {
    const grouped = new Map<string, { tasks: TaskPreview[]; nearestDueDate: string | null }>()

    for (const task of openTasksForDashboard) {
      const maybeProjectName =
        'project_name' in task ? (task as TaskPreview & { project_name?: string }).project_name : undefined
      const projectName = maybeProjectName || selectedProjectName || 'Current Project'

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

  return {
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
  }
}
