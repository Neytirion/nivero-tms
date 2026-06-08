import { useEffect, useMemo, useState } from 'react'
import { useWorkspace } from '../features/dashboard/workspace-context.tsx'
import { ConfirmDialog } from '../shared/components'
import {
  createTimeEntry,
  deleteTimeEntry,
  getProjectTasks,
  getTimeEntries,
  updateTimeEntry,
  type TaskPreview,
  type TimeEntryPreview,
} from '../lib/pm'
import {
  buildWeeklySummary,
  endOfWeek,
  formatHours,
  startOfWeek,
  toDateInputValue,
  toHours,
} from './time-tracking.utils'

const BILLABLE_CATEGORIES = ['delivery', 'support', 'research']
const NON_BILLABLE_CATEGORIES = ['meeting', 'admin']

export function TimeTrackingPage() {
  const { projects, selectedProjectId, currentUserId, status, setStatus, isLoading, loadDashboardPreview } = useWorkspace()
  const [entries, setEntries] = useState<TimeEntryPreview[]>([])
  const [isEntriesLoading, setIsEntriesLoading] = useState(false)
  const [activeProjectId, setActiveProjectId] = useState(selectedProjectId ?? '')
  const [projectTasks, setProjectTasks] = useState<TaskPreview[]>([])
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [entryToDelete, setEntryToDelete] = useState<TimeEntryPreview | null>(null)

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
  const [isTimerSaving, setIsTimerSaving] = useState(false)

  const [weekAnchorDate, setWeekAnchorDate] = useState(toDateInputValue(new Date()))

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  )
  const manualDateMin = activeProject?.start_date ?? undefined
  const manualDateMax = activeProject?.end_date ?? undefined

  const manualCategoryOptions = manualIsBillable ? BILLABLE_CATEGORIES : NON_BILLABLE_CATEGORIES
  const timerCategoryOptions = timerIsBillable ? BILLABLE_CATEGORIES : NON_BILLABLE_CATEGORIES
  const visibleEntries = useMemo(
    () => (currentUserId ? entries.filter((entry) => entry.user_id === currentUserId) : entries),
    [currentUserId, entries],
  )

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

  const weeklySummary = useMemo(() => buildWeeklySummary(visibleEntries), [visibleEntries])

  const resetManualEntryForm = () => {
    setEditingEntryId(null)
    setManualTaskId('')
    setManualDate(toDateInputValue(new Date()))
    setManualHours('1')
    setManualIsBillable(true)
    setManualCategory(BILLABLE_CATEGORIES[0])
    setManualNotes('')
  }

  const beginEditEntry = (entry: TimeEntryPreview) => {
    setActiveProjectId(entry.project_id)
    setWeekAnchorDate(entry.entry_date)
    setEditingEntryId(entry.id)
    setManualTaskId(entry.task_id ?? '')
    setManualDate(entry.entry_date)
    setManualHours((entry.minutes_spent / 60).toFixed(2))
    setManualIsBillable(entry.is_billable)
    setManualCategory(entry.category)
    setManualNotes(entry.notes ?? '')
  }

  const cancelEditEntry = () => {
    resetManualEntryForm()
  }

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
    const loadProjectTasks = async () => {
      if (!activeProjectId) {
        setProjectTasks([])
        setManualTaskId('')
        setTimerTaskId('')
        return
      }

      try {
        const nextTasks = await getProjectTasks(activeProjectId)
        const visibleTasks = nextTasks.filter((task) => {
          if (!currentUserId) {
            return true
          }

          return task.assigned_to === currentUserId
        })

        setProjectTasks(visibleTasks)
        setManualTaskId((prev) => (visibleTasks.some((task) => task.id === prev) ? prev : ''))
        setTimerTaskId((prev) => (visibleTasks.some((task) => task.id === prev) ? prev : ''))
      } catch (error) {
        setStatus(error instanceof Error ? `Task load error: ${error.message}` : 'Task load error')
        setProjectTasks([])
      }
    }

    void loadProjectTasks()
  }, [activeProjectId, currentUserId, setStatus])

  useEffect(() => {
    if (!timerStartedAt) {
      return
    }

    const intervalId = window.setInterval(() => {
      setTimerElapsedSec(Math.floor((Date.now() - timerStartedAt) / 1000))
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [timerStartedAt])

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

  const refreshWorkspaceMetrics = async () => {
    try {
      await loadDashboardPreview()
    } catch {
      // Keep page usable even if background refresh fails.
    }
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

    if (manualDateMin && manualDate < manualDateMin) {
      setStatus('Manual entry date must be within selected project dates')
      return
    }

    if (manualDateMax && manualDate > manualDateMax) {
      setStatus('Manual entry date must be within selected project dates')
      return
    }

    try {
      if (editingEntryId) {
        await updateTimeEntry(editingEntryId, {
          projectId: activeProjectId,
          taskId: manualTaskId || undefined,
          entryDate: manualDate,
          hoursSpent: parsedHours,
          isBillable: manualIsBillable,
          category: manualCategory,
          notes: manualNotes,
        })
        setStatus('Time entry updated')
      } else {
        await createTimeEntry({
          projectId: activeProjectId,
          taskId: manualTaskId || undefined,
          entryDate: manualDate,
          hoursSpent: parsedHours,
          isBillable: manualIsBillable,
          category: manualCategory,
          notes: manualNotes,
        })
        setStatus('Time entry created')
      }

      resetManualEntryForm()
      setWeekAnchorDate(manualDate)
      await Promise.all([reloadCurrentWeek(), refreshWorkspaceMetrics()])
    } catch (error) {
      setStatus(error instanceof Error ? `Time entry save error: ${error.message}` : 'Time entry save error')
    }
  }

  const deleteEntryHandler = async (entry: TimeEntryPreview) => {
    try {
      await deleteTimeEntry(entry.id)
      if (editingEntryId === entry.id) {
        resetManualEntryForm()
      }
      setEntryToDelete(null)
      await Promise.all([reloadCurrentWeek(), refreshWorkspaceMetrics()])
      setStatus('Time entry deleted')
    } catch (error) {
      setStatus(error instanceof Error ? `Delete time entry error: ${error.message}` : 'Delete time entry error')
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
    if (!timerStartedAt || isTimerSaving) {
      return
    }

    if (!activeProjectId) {
      setStatus('Select a project before saving timer entry')
      return
    }

    const timerEntryDate = toDateInputValue(new Date())
    const elapsedSec = Math.floor((Date.now() - timerStartedAt) / 1000)
    const elapsedHours = Math.max(1 / 60, elapsedSec / 3600)

    setIsTimerSaving(true)

    try {
      await createTimeEntry({
        projectId: activeProjectId,
        taskId: timerTaskId || undefined,
        entryDate: timerEntryDate,
        hoursSpent: elapsedHours,
        isBillable: timerIsBillable,
        category: timerCategory,
        notes: timerNotes,
      })

      setTimerStartedAt(null)
      setTimerElapsedSec(0)
      setTimerNotes('')
      setWeekAnchorDate(timerEntryDate)
      await Promise.all([reloadCurrentWeek(), refreshWorkspaceMetrics()])
      setStatus('Timer entry saved')
    } catch (error) {
      setStatus(error instanceof Error ? `Timer save error: ${error.message}` : 'Timer save error')
    } finally {
      setIsTimerSaving(false)
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
                min={manualDateMin}
                max={manualDateMax}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
              />
              {activeProjectId && (manualDateMin || manualDateMax) ? (
                <p className="mt-1 text-[11px] text-slate-500">
                  Allowed range: {manualDateMin ?? '...'} - {manualDateMax ?? '...'}
                </p>
              ) : null}
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
                onChange={(event) => {
                  const nextIsBillable = event.target.value === 'billable'
                  setManualIsBillable(nextIsBillable)
                  setManualCategory((prev) => {
                    const options = nextIsBillable ? BILLABLE_CATEGORIES : NON_BILLABLE_CATEGORIES
                    return options.includes(prev) ? prev : options[0]
                  })
                }}
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
              {editingEntryId ? 'Update entry' : 'Save manual entry'}
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
                onChange={(event) => {
                  const nextIsBillable = event.target.value === 'billable'
                  setTimerIsBillable(nextIsBillable)
                  setTimerCategory((prev) => {
                    const options = nextIsBillable ? BILLABLE_CATEGORIES : NON_BILLABLE_CATEGORIES
                    return options.includes(prev) ? prev : options[0]
                  })
                }}
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
                  disabled={isTimerSaving}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isTimerSaving ? 'Saving...' : 'Stop and save'}
                </button>
                <button
                  type="button"
                  onClick={cancelTimer}
                  disabled={isTimerSaving}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
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
          <div>
            <h3 className="text-sm font-semibold text-slate-900">My Logs This Week</h3>
            <p className="mt-1 text-xs text-slate-500">Edit or delete your own time entries here, even if the task was removed.</p>
          </div>
          {editingEntryId ? (
            <button
              type="button"
              onClick={cancelEditEntry}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Cancel edit
            </button>
          ) : null}
        </div>

        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Project</th>
                <th className="px-3 py-2 text-left">Task</th>
                <th className="px-3 py-2 text-left">Hours</th>
                <th className="px-3 py-2 text-left">Notes</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isEntriesLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                    Loading entries...
                  </td>
                </tr>
              ) : visibleEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                    No entries for selected week.
                  </td>
                </tr>
              ) : (
                visibleEntries.map((entry) => {
                  const projectName = projects.find((project) => project.id === entry.project_id)?.name ?? entry.project_id
                  const taskName = entry.task_id
                    ? projectTasks.find((task) => task.id === entry.task_id)?.title ?? entry.task_id
                    : 'Unlinked'

                  return (
                    <tr key={entry.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-700">{entry.entry_date}</td>
                      <td className="px-3 py-2 text-slate-700">{projectName}</td>
                      <td className="px-3 py-2 text-slate-600">{taskName}</td>
                      <td className="px-3 py-2 text-slate-700">{toHours(entry.minutes_spent).toFixed(2)}</td>
                      <td className="px-3 py-2 text-slate-500">{entry.notes || '—'}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => beginEditEntry(entry)}
                            className="rounded-md border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-800 hover:bg-cyan-100"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setEntryToDelete(entry)}
                            className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
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

      <ConfirmDialog
        isOpen={Boolean(entryToDelete)}
        title="Delete time entry"
        description={`Delete the time entry on ${entryToDelete?.entry_date ?? 'this date'}? This will also update the task and allocation totals.`}
        confirmText="Delete entry"
        tone="danger"
        onCancel={() => setEntryToDelete(null)}
        onConfirm={() => (entryToDelete ? deleteEntryHandler(entryToDelete) : Promise.resolve())}
      />
    </div>
  )
}
