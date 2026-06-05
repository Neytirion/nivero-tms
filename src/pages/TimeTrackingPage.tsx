import { useEffect, useMemo, useState } from 'react'
import { useWorkspace } from '../features/dashboard/workspace-context.tsx'
import { createTimeEntry, getProjectTasks, getTimeEntries, type TaskPreview, type TimeEntryPreview } from '../lib/pm'

const BILLABLE_CATEGORIES = ['delivery', 'support', 'research']
const NON_BILLABLE_CATEGORIES = ['meeting', 'admin']

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function startOfWeek(date: Date) {
  const value = new Date(date)
  const day = value.getDay()
  const diff = day === 0 ? -6 : 1 - day
  value.setDate(value.getDate() + diff)
  value.setHours(0, 0, 0, 0)
  return value
}

function endOfWeek(date: Date) {
  const value = new Date(date)
  value.setDate(value.getDate() + 6)
  value.setHours(23, 59, 59, 999)
  return value
}

function toHours(minutes: number) {
  return minutes / 60
}

function formatHours(minutes: number) {
  return `${toHours(minutes).toFixed(2)}h`
}

export function TimeTrackingPage() {
  const { projects, selectedProjectId, status, setStatus, isLoading } = useWorkspace()
  const [entries, setEntries] = useState<TimeEntryPreview[]>([])
  const [isEntriesLoading, setIsEntriesLoading] = useState(false)
  const [activeProjectId, setActiveProjectId] = useState(selectedProjectId ?? '')
  const [projectTasks, setProjectTasks] = useState<TaskPreview[]>([])

  const [manualTaskId, setManualTaskId] = useState('')
  const [manualDate, setManualDate] = useState(toDateInputValue(new Date()))
  const [manualHours, setManualHours] = useState('1')
  const [manualIsBillable, setManualIsBillable] = useState(true)
  const [manualCategory, setManualCategory] = useState(BILLABLE_CATEGORIES[0])
  const [manualNotes, setManualNotes] = useState('')

  const [timerTaskId, setTimerTaskId] = useState('')
  const [timerIsBillable, setTimerIsBillable] = useState(true)
  const [timerCategory, setTimerCategory] = useState(BILLABLE_CATEGORIES[0])
  const [timerNotes, setTimerNotes] = useState('')
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null)
  const [timerElapsedSec, setTimerElapsedSec] = useState(0)

  const [weekAnchorDate, setWeekAnchorDate] = useState(toDateInputValue(new Date()))

  const manualCategoryOptions = manualIsBillable ? BILLABLE_CATEGORIES : NON_BILLABLE_CATEGORIES
  const timerCategoryOptions = timerIsBillable ? BILLABLE_CATEGORIES : NON_BILLABLE_CATEGORIES

  const weekRange = useMemo(() => {
    const anchor = new Date(`${weekAnchorDate}T00:00:00`)
    const start = startOfWeek(anchor)
    const end = endOfWeek(start)

    return {
      startDate: toDateInputValue(start),
      endDate: toDateInputValue(end),
      title: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
    }
  }, [weekAnchorDate])

  const weeklySummary = useMemo(() => {
    const byDay = entries.reduce<Record<string, number>>((acc, entry) => {
      const key = entry.entry_date
      acc[key] = (acc[key] ?? 0) + entry.minutes_spent
      return acc
    }, {})

    const totalMinutes = entries.reduce((sum, entry) => sum + entry.minutes_spent, 0)
    const billableMinutes = entries
      .filter((entry) => entry.is_billable)
      .reduce((sum, entry) => sum + entry.minutes_spent, 0)

    const nonBillableMinutes = totalMinutes - billableMinutes

    return {
      byDay,
      totalMinutes,
      billableMinutes,
      nonBillableMinutes,
    }
  }, [entries])

  useEffect(() => {
    if (selectedProjectId && !activeProjectId) {
      setActiveProjectId(selectedProjectId)
    }
  }, [selectedProjectId, activeProjectId])

  useEffect(() => {
    const loadWeekEntries = async () => {
      setIsEntriesLoading(true)

      try {
        const nextEntries = await getTimeEntries({
          fromDate: weekRange.startDate,
          toDate: weekRange.endDate,
          projectId: activeProjectId || undefined,
        })
        setEntries(nextEntries)
      } catch (error) {
        setStatus(error instanceof Error ? `Time entries load error: ${error.message}` : 'Time entries load error')
        setEntries([])
      }

      setIsEntriesLoading(false)
    }

    void loadWeekEntries()
  }, [activeProjectId, weekRange.endDate, weekRange.startDate, setStatus])

  useEffect(() => {
    if (!activeProjectId) {
      setProjectTasks([])
      setManualTaskId('')
      setTimerTaskId('')
      return
    }

    const loadProjectTasks = async () => {
      try {
        const nextTasks = await getProjectTasks(activeProjectId)
        setProjectTasks(nextTasks)
        setManualTaskId((prev) => (nextTasks.some((task) => task.id === prev) ? prev : ''))
        setTimerTaskId((prev) => (nextTasks.some((task) => task.id === prev) ? prev : ''))
      } catch (error) {
        setStatus(error instanceof Error ? `Task load error: ${error.message}` : 'Task load error')
        setProjectTasks([])
      }
    }

    void loadProjectTasks()
  }, [activeProjectId, setStatus])

  useEffect(() => {
    if (!timerStartedAt) {
      return
    }

    const intervalId = window.setInterval(() => {
      setTimerElapsedSec(Math.floor((Date.now() - timerStartedAt) / 1000))
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [timerStartedAt])

  useEffect(() => {
    if (!manualCategoryOptions.includes(manualCategory)) {
      setManualCategory(manualCategoryOptions[0])
    }
  }, [manualCategory, manualCategoryOptions])

  useEffect(() => {
    if (!timerCategoryOptions.includes(timerCategory)) {
      setTimerCategory(timerCategoryOptions[0])
    }
  }, [timerCategory, timerCategoryOptions])

  const reloadCurrentWeek = async () => {
    setIsEntriesLoading(true)

    try {
      const nextEntries = await getTimeEntries({
        fromDate: weekRange.startDate,
        toDate: weekRange.endDate,
        projectId: activeProjectId || undefined,
      })
      setEntries(nextEntries)
    } catch (error) {
      setStatus(error instanceof Error ? `Time entries load error: ${error.message}` : 'Time entries load error')
      setEntries([])
    }

    setIsEntriesLoading(false)
  }

  const submitManualEntry = async () => {
    if (!activeProjectId) {
      setStatus('Select a project before logging time')
      return
    }

    const parsedHours = Number.parseFloat(manualHours)
    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      setStatus('Hours must be greater than 0')
      return
    }

    try {
      await createTimeEntry({
        projectId: activeProjectId,
        taskId: manualTaskId || undefined,
        entryDate: manualDate,
        hoursSpent: parsedHours,
        isBillable: manualIsBillable,
        category: manualCategory,
        notes: manualNotes,
      })

      setManualNotes('')
      setStatus('Time entry created')
      await reloadCurrentWeek()
    } catch (error) {
      setStatus(error instanceof Error ? `Create time entry error: ${error.message}` : 'Create time entry error')
    }
  }

  const startTimer = () => {
    if (!activeProjectId) {
      setStatus('Select a project before starting timer')
      return
    }

    setTimerStartedAt(Date.now())
    setTimerElapsedSec(0)
  }

  const stopAndSaveTimer = async () => {
    if (!timerStartedAt) {
      return
    }

    if (!activeProjectId) {
      setStatus('Select a project before saving timer entry')
      return
    }

    const elapsedHours = Math.max(0, timerElapsedSec / 3600)
    if (elapsedHours <= 0) {
      setStatus('Tracked time must be greater than 0')
      setTimerStartedAt(null)
      setTimerElapsedSec(0)
      return
    }

    try {
      await createTimeEntry({
        projectId: activeProjectId,
        taskId: timerTaskId || undefined,
        entryDate: toDateInputValue(new Date()),
        hoursSpent: elapsedHours,
        isBillable: timerIsBillable,
        category: timerCategory,
        notes: timerNotes,
      })

      setTimerStartedAt(null)
      setTimerElapsedSec(0)
      setTimerNotes('')
      setStatus('Timer entry saved')
      await reloadCurrentWeek()
    } catch (error) {
      setStatus(error instanceof Error ? `Timer save error: ${error.message}` : 'Timer save error')
    }
  }

  const cancelTimer = () => {
    setTimerStartedAt(null)
    setTimerElapsedSec(0)
  }

  const trackedTimerLabel = useMemo(() => {
    const hours = Math.floor(timerElapsedSec / 3600)
    const minutes = Math.floor((timerElapsedSec % 3600) / 60)
    const seconds = timerElapsedSec % 60

    return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
  }, [timerElapsedSec])

  return (
    <div className="space-y-5">
      <section className="page-section bg-[linear-gradient(120deg,rgba(6,182,212,0.08),rgba(16,185,129,0.08))]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Time Tracking</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Track Work Hours</h2>
        <p className="mt-2 text-sm text-slate-600">
          Manual entries, timer-based tracking, billable categories, and weekly timesheet overview.
        </p>
        <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{status}</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Project</span>
            <select
              value={activeProjectId}
              onChange={(event) => setActiveProjectId(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
            >
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Week</span>
            <input
              type="date"
              value={weekAnchorDate}
              onChange={(event) => setWeekAnchorDate(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
          </label>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Week Range</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{weekRange.title}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Manual Time Entry</h3>
          <p className="mt-1 text-xs text-slate-500">Add hours manually and link them to a project and optional task.</p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Task (optional)</span>
              <select
                value={manualTaskId}
                onChange={(event) => setManualTaskId(event.target.value)}
                disabled={!activeProjectId}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">Unlinked</option>
                {projectTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Date</span>
              <input
                type="date"
                value={manualDate}
                onChange={(event) => setManualDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Hours</span>
              <input
                type="number"
                min="0.25"
                step="0.25"
                value={manualHours}
                onChange={(event) => setManualHours(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Billing Type</span>
              <select
                value={manualIsBillable ? 'billable' : 'non-billable'}
                onChange={(event) => setManualIsBillable(event.target.value === 'billable')}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
              >
                <option value="billable">Billable</option>
                <option value="non-billable">Non-billable</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Category</span>
              <select
                value={manualCategory}
                onChange={(event) => setManualCategory(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
              >
                {manualCategoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Notes</span>
              <input
                type="text"
                value={manualNotes}
                onChange={(event) => setManualNotes(event.target.value)}
                placeholder="What was done"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
              />
            </label>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => void submitManualEntry()}
              disabled={isLoading || !activeProjectId}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save manual entry
            </button>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Timer-based Tracking</h3>
          <p className="mt-1 text-xs text-slate-500">Start timer while working, then save tracked time as an entry.</p>

          <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">Elapsed</p>
            <p className="mt-1 text-2xl font-bold text-cyan-900">{trackedTimerLabel}</p>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Task (optional)</span>
              <select
                value={timerTaskId}
                onChange={(event) => setTimerTaskId(event.target.value)}
                disabled={!activeProjectId}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">Unlinked</option>
                {projectTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Billing Type</span>
              <select
                value={timerIsBillable ? 'billable' : 'non-billable'}
                onChange={(event) => setTimerIsBillable(event.target.value === 'billable')}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
              >
                <option value="billable">Billable</option>
                <option value="non-billable">Non-billable</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Category</span>
              <select
                value={timerCategory}
                onChange={(event) => setTimerCategory(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
              >
                {timerCategoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Notes</span>
              <input
                type="text"
                value={timerNotes}
                onChange={(event) => setTimerNotes(event.target.value)}
                placeholder="Short work log"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {!timerStartedAt ? (
              <button
                type="button"
                onClick={startTimer}
                disabled={!activeProjectId}
                className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Start timer
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void stopAndSaveTimer()}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
                >
                  Stop and save
                </button>
                <button
                  type="button"
                  onClick={cancelTimer}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Discard
                </button>
              </>
            )}
          </div>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Weekly Timesheet Overview</h3>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="rounded-full bg-slate-100 px-2 py-1">Total: {formatHours(weeklySummary.totalMinutes)}</span>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">
              Billable: {formatHours(weeklySummary.billableMinutes)}
            </span>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">
              Non-billable: {formatHours(weeklySummary.nonBillableMinutes)}
            </span>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Project</th>
                <th className="px-3 py-2 text-left">Task</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-left">Hours</th>
                <th className="px-3 py-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {isEntriesLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                    Loading entries...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                    No entries for selected week.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const projectName = projects.find((project) => project.id === entry.project_id)?.name ?? entry.project_id
                  const taskName = entry.task_id ? projectTasks.find((task) => task.id === entry.task_id)?.title ?? entry.task_id : 'Unlinked'

                  return (
                    <tr key={entry.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-700">{entry.entry_date}</td>
                      <td className="px-3 py-2 text-slate-700">{projectName}</td>
                      <td className="px-3 py-2 text-slate-600">{taskName}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            entry.is_billable
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {entry.is_billable ? 'Billable' : 'Non-billable'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{entry.category}</td>
                      <td className="px-3 py-2 text-slate-700">{toHours(entry.minutes_spent).toFixed(2)}</td>
                      <td className="px-3 py-2 text-slate-500">{entry.notes || '—'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Daily Breakdown</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {Object.keys(weeklySummary.byDay).length === 0 ? (
              <p className="text-xs text-slate-500">No logged days yet.</p>
            ) : (
              Object.entries(weeklySummary.byDay)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([date, minutes]) => (
                  <div key={date} className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
                    <p className="text-[11px] text-slate-500">{date}</p>
                    <p className="text-sm font-semibold text-slate-800">{formatHours(minutes)}</p>
                  </div>
                ))
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
