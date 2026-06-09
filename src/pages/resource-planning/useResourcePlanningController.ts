import { useEffect, useMemo, useState } from 'react'
import { useWorkspace } from '../../features/dashboard/workspace-context.tsx'
import {
  getProjectMembers,
  getProjectTasks,
  getTimeEntries,
  type ProjectMemberListItem,
  type TaskPreview,
  type TimeEntryPreview,
} from '../../lib/pm'

const WEEKLY_CAPACITY_HOURS = 40

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function startOfWeek(date: Date) {
  const value = new Date(date)
  const day = value.getDay()
  value.setDate(value.getDate() - (day === 0 ? 6 : day - 1))
  value.setHours(0, 0, 0, 0)
  return value
}

function endOfWeek(start: Date) {
  const value = new Date(start)
  value.setDate(value.getDate() + 6)
  value.setHours(23, 59, 59, 999)
  return value
}

function formatWeekdayDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

function isTaskInSelectedWeek(task: TaskPreview, startDate: string, endDate: string) {
  const dueDate = task.due_date?.slice(0, 10)
  if (!dueDate) {
    return false
  }

  return dueDate >= startDate && dueDate <= endDate
}

export interface ConsultantRow {
  userId: string
  name: string
  email: string
  projects: string[]
  openTasksCount: number
  unscheduledTasksCount: number
  allocatedHours: number
  loggedHoursThisWeek: number
  allocationPct: number
  status: 'overbooked' | 'at-risk' | 'available'
}

function deriveStatus(pct: number): ConsultantRow['status'] {
  if (pct > 100) return 'overbooked'
  if (pct > 70) return 'at-risk'
  return 'available'
}

export function useResourcePlanningController() {
  const { projects, status, setStatus, getProjectRole } = useWorkspace()

  const [weekAnchorDate, setWeekAnchorDate] = useState(toDateInputValue(new Date()))
  const [isLoading, setIsLoading] = useState(false)
  const [membersByProject, setMembersByProject] = useState<Record<string, ProjectMemberListItem[]>>({})
  const [tasksByProject, setTasksByProject] = useState<Record<string, TaskPreview[]>>({})
  const [weekTimeEntries, setWeekTimeEntries] = useState<TimeEntryPreview[]>([])
  const [filterStatus, setFilterStatus] = useState<'all' | ConsultantRow['status']>('all')

  const weekRange = useMemo(() => {
    const anchor = new Date(`${weekAnchorDate}T00:00:00`)
    const start = startOfWeek(anchor)
    const end = endOfWeek(start)
    return {
      startDate: toDateInputValue(start),
      endDate: toDateInputValue(end),
      startLabel: formatWeekdayDate(start),
      endLabel: formatWeekdayDate(end),
      isoLabel: `${toDateInputValue(start)} -> ${toDateInputValue(end)}`,
    }
  }, [weekAnchorDate])

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status !== 'completed'),
    [projects],
  )
  const hasKnownProjectRole = useMemo(
    () => projects.some((project) => getProjectRole(project.id) !== null),
    [getProjectRole, projects],
  )
  const canViewResourcePlanning = useMemo(
    () =>
      projects.some((project) => {
        const role = getProjectRole(project.id)
        return role === 'owner' || role === 'admin' || role === 'manager'
      }),
    [getProjectRole, projects],
  )
  const shouldBlockByRole = projects.length > 0 && hasKnownProjectRole && !canViewResourcePlanning

  useEffect(() => {
    if (shouldBlockByRole || activeProjects.length === 0) return

    const load = async () => {
      setIsLoading(true)

      try {
        const [membersResults, tasksResults, entries] = await Promise.all([
          Promise.all(
            activeProjects.map(async (project) => ({
              projectId: project.id,
              members: await getProjectMembers(project.id),
            })),
          ),
          Promise.all(
            activeProjects.map(async (project) => ({
              projectId: project.id,
              tasks: await getProjectTasks(project.id),
            })),
          ),
          getTimeEntries({ fromDate: weekRange.startDate, toDate: weekRange.endDate }),
        ])

        setMembersByProject(
          membersResults.reduce<Record<string, ProjectMemberListItem[]>>((acc, item) => {
            acc[item.projectId] = item.members
            return acc
          }, {}),
        )

        setTasksByProject(
          tasksResults.reduce<Record<string, TaskPreview[]>>((acc, item) => {
            acc[item.projectId] = item.tasks
            return acc
          }, {}),
        )

        setWeekTimeEntries(entries)
      } catch (error) {
        setStatus(
          error instanceof Error ? `Resource load error: ${error.message}` : 'Resource load error',
        )
      }

      setIsLoading(false)
    }

    void load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldBlockByRole, activeProjects.length, weekRange.startDate, weekRange.endDate, setStatus])

  const consultantRows = useMemo<ConsultantRow[]>(() => {
    const byUser = new Map<
      string,
      {
        userId: string
        name: string
        email: string
        projectNames: Set<string>
        openTasksThisWeek: TaskPreview[]
        unscheduledOpenTasks: TaskPreview[]
      }
    >()

    for (const project of activeProjects) {
      const members = membersByProject[project.id] ?? []
      const tasks = tasksByProject[project.id] ?? []

      for (const member of members) {
        if (!member.user_id) continue

        if (!byUser.has(member.user_id)) {
          byUser.set(member.user_id, {
            userId: member.user_id,
            name: member.full_name || member.email || member.user_id,
            email: member.email || '',
            projectNames: new Set(),
            openTasksThisWeek: [],
            unscheduledOpenTasks: [],
          })
        }

        const entry = byUser.get(member.user_id)!
        entry.projectNames.add(project.name)

        const openAssigned = tasks.filter(
          (task) =>
            task.assigned_to === member.user_id &&
            !['done', 'completed'].includes((task.status ?? '').toLowerCase()),
        )

        const openAssignedThisWeek = openAssigned.filter((task) =>
          isTaskInSelectedWeek(task, weekRange.startDate, weekRange.endDate),
        )
        const unscheduledOpenAssigned = openAssigned.filter((task) => !task.due_date)

        entry.openTasksThisWeek.push(...openAssignedThisWeek)
        entry.unscheduledOpenTasks.push(...unscheduledOpenAssigned)
      }
    }

    const loggedByUser = weekTimeEntries.reduce<Record<string, number>>((acc, entry) => {
      acc[entry.user_id] = (acc[entry.user_id] ?? 0) + entry.minutes_spent
      return acc
    }, {})

    return Array.from(byUser.values())
      .map((item) => {
        const allocatedHours = item.openTasksThisWeek.reduce(
          (sum, task) => sum + (task.estimate_hours ?? 0),
          0,
        )
        const loggedHoursThisWeek = (loggedByUser[item.userId] ?? 0) / 60
        const allocationPct = Math.round((allocatedHours / WEEKLY_CAPACITY_HOURS) * 100)
        const status = deriveStatus(allocationPct)

        return {
          userId: item.userId,
          name: item.name,
          email: item.email,
          projects: Array.from(item.projectNames),
          openTasksCount: item.openTasksThisWeek.length,
          unscheduledTasksCount: item.unscheduledOpenTasks.length,
          allocatedHours: Math.round(allocatedHours * 10) / 10,
          loggedHoursThisWeek: Math.round(loggedHoursThisWeek * 10) / 10,
          allocationPct,
          status,
        }
      })
      .sort((a, b) => b.allocationPct - a.allocationPct)
  }, [activeProjects, membersByProject, tasksByProject, weekRange.endDate, weekRange.startDate, weekTimeEntries])

  const visibleRows =
    filterStatus === 'all' ? consultantRows : consultantRows.filter((row) => row.status === filterStatus)

  const summaryOverbooked = consultantRows.filter((row) => row.status === 'overbooked').length
  const summaryAtRisk = consultantRows.filter((row) => row.status === 'at-risk').length
  const summaryAvailable = consultantRows.filter((row) => row.status === 'available').length

  return {
    status,
    isLoading,
    shouldBlockByRole,
    weekAnchorDate,
    setWeekAnchorDate,
    weekRange,
    filterStatus,
    setFilterStatus,
    summaryOverbooked,
    summaryAtRisk,
    summaryAvailable,
    visibleRows,
    activeProjectsCount: activeProjects.length,
    weeklyCapacityHours: WEEKLY_CAPACITY_HOURS,
  }
}
