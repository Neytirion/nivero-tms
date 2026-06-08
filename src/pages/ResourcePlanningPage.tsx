import { useEffect, useMemo, useState } from 'react'
import { useWorkspace } from '../features/dashboard/workspace-context.tsx'
import {
  getProjectMembers,
  getProjectTasks,
  getTimeEntries,
  type ProjectMemberListItem,
  type TaskPreview,
  type TimeEntryPreview,
} from '../lib/pm'

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

interface ConsultantRow {
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

function statusBadge(status: ConsultantRow['status']) {
  if (status === 'overbooked')
    return 'rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 border border-rose-200'
  if (status === 'at-risk')
    return 'rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200'
  return 'rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200'
}

function statusLabel(status: ConsultantRow['status']) {
  if (status === 'overbooked') return 'Overbooked'
  if (status === 'at-risk') return 'At Risk'
  return 'Available'
}

export function ResourcePlanningPage() {
  const { projects, status, setStatus } = useWorkspace()

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

  useEffect(() => {
    if (activeProjects.length === 0) return

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
  }, [activeProjects.length, weekRange.startDate, weekRange.endDate, setStatus])

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

  return (
    <div className="space-y-5">
      <section className="page-section bg-[linear-gradient(120deg,rgba(99,102,241,0.08),rgba(14,116,144,0.06))]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Resource Planning
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Consultant Allocation</h2>
        <p className="mt-2 text-sm text-slate-600">
          View allocation and availability across active projects to avoid overbooking.
        </p>
        <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          {isLoading ? 'Loading allocations...' : status}
        </p>
      </section>

      <section className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Week (for logged hours)
          </span>
          <input
            type="date"
            value={weekAnchorDate}
            onChange={(event) => setWeekAnchorDate(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
          />
        </label>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Week</p>
          <p className="text-sm font-semibold text-slate-800">
            {weekRange.startLabel} - {weekRange.endLabel}
          </p>
          <p className="text-[11px] text-slate-500">{weekRange.isoLabel}</p>
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Filter by status
          </span>
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value as typeof filterStatus)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
          >
            <option value="all">All consultants</option>
            <option value="overbooked">Overbooked only</option>
            <option value="at-risk">At Risk only</option>
            <option value="available">Available only</option>
          </select>
        </label>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <article
          className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 p-3"
          onClick={() => setFilterStatus(filterStatus === 'overbooked' ? 'all' : 'overbooked')}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-600">Overbooked</p>
          <p className="mt-1 text-2xl font-bold text-rose-800">{summaryOverbooked}</p>
          <p className="mt-0.5 text-xs text-rose-600">&gt; 100% allocation</p>
        </article>

        <article
          className="cursor-pointer rounded-xl border border-amber-200 bg-amber-50 p-3"
          onClick={() => setFilterStatus(filterStatus === 'at-risk' ? 'all' : 'at-risk')}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">At Risk</p>
          <p className="mt-1 text-2xl font-bold text-amber-800">{summaryAtRisk}</p>
          <p className="mt-0.5 text-xs text-amber-600">71–100% allocation</p>
        </article>

        <article
          className="cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50 p-3"
          onClick={() => setFilterStatus(filterStatus === 'available' ? 'all' : 'available')}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Available</p>
          <p className="mt-1 text-2xl font-bold text-emerald-800">{summaryAvailable}</p>
          <p className="mt-0.5 text-xs text-emerald-600">≤ 70% allocation</p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Consultant</th>
                <th className="px-4 py-3">Active Projects</th>
                <th className="px-4 py-3">Open Tasks</th>
                <th className="px-4 py-3">Unscheduled</th>
                <th className="px-4 py-3">Allocated</th>
                <th className="px-4 py-3">Logged this week</th>
                <th className="px-4 py-3">Allocation %</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                    Loading allocation data...
                  </td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                    No consultants found
                    {filterStatus !== 'all' ? ` with status "${filterStatus}"` : ' across active projects'}.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr key={row.userId} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{row.name}</p>
                      {row.email ? (
                        <p className="text-[11px] text-slate-500">{row.email}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.projects.map((name) => (
                          <span
                            key={name}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.openTasksCount}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {row.unscheduledTasksCount > 0 ? `+${row.unscheduledTasksCount} unscheduled` : '-'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {row.allocatedHours}h
                      <span className="ml-1 text-[11px] text-slate-400">/ {WEEKLY_CAPACITY_HOURS}h cap</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.loggedHoursThisWeek}h</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full transition-all ${
                              row.status === 'overbooked'
                                ? 'bg-rose-500'
                                : row.status === 'at-risk'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, row.allocationPct)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{row.allocationPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={statusBadge(row.status)}>{statusLabel(row.status)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
          Allocation = sum of open task estimates with due date in selected week / {WEEKLY_CAPACITY_HOURS}h capacity.
          Tasks without due date are tracked as unscheduled.
          Logged = time_entries for selected week. Based on {activeProjects.length} active project(s).
        </div>
      </section>
    </div>
  )
}
