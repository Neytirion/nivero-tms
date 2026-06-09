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
  startOfWeek,
  toDateInputValue,
} from './time-tracking.utils'
import { TimeTrackingFilters } from './time-tracking/TimeTrackingFilters'
import { ManualEntryPanel } from './time-tracking/ManualEntryPanel'
import { TimerPanel } from './time-tracking/TimerPanel'
import { MyLogsSection } from './time-tracking/MyLogsSection'
import { WeeklyOverviewSection } from './time-tracking/WeeklyOverviewSection'

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
  const [manualNotes, setManualNotes] = useState('')

  const [timerTaskId, setTimerTaskId] = useState('')
  const [timerIsBillable, setTimerIsBillable] = useState(true)
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
          Manual entries, timer-based tracking, and weekly timesheet overview.
        </p>
        <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{status}</p>
      </section>

      <TimeTrackingFilters
        projects={projects}
        activeProjectId={activeProjectId}
        weekAnchorDate={weekAnchorDate}
        weekRangeTitle={weekRange.title}
        onProjectChange={setActiveProjectId}
        onWeekAnchorDateChange={setWeekAnchorDate}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <ManualEntryPanel
          activeProjectId={activeProjectId}
          projectTasks={projectTasks}
          manualTaskId={manualTaskId}
          manualDate={manualDate}
          manualDateMin={manualDateMin}
          manualDateMax={manualDateMax}
          manualHours={manualHours}
          manualIsBillable={manualIsBillable}
          manualNotes={manualNotes}
          editingEntryId={editingEntryId}
          isLoading={isLoading}
          onManualTaskIdChange={setManualTaskId}
          onManualDateChange={setManualDate}
          onManualHoursChange={setManualHours}
          onManualIsBillableChange={setManualIsBillable}
          onManualNotesChange={setManualNotes}
          onSubmit={() => void submitManualEntry()}
        />

        <TimerPanel
          activeProjectId={activeProjectId}
          trackedTimerLabel={trackedTimerLabel}
          timerTaskId={timerTaskId}
          timerIsBillable={timerIsBillable}
          timerNotes={timerNotes}
          timerStartedAt={timerStartedAt}
          isTimerSaving={isTimerSaving}
          projectTasks={projectTasks}
          onTimerTaskIdChange={setTimerTaskId}
          onTimerIsBillableChange={setTimerIsBillable}
          onTimerNotesChange={setTimerNotes}
          onStartTimer={startTimer}
          onStopAndSaveTimer={() => void stopAndSaveTimer()}
          onCancelTimer={cancelTimer}
        />
      </section>

      <MyLogsSection
        editingEntryId={editingEntryId}
        isEntriesLoading={isEntriesLoading}
        visibleEntries={visibleEntries}
        projects={projects}
        projectTasks={projectTasks}
        onCancelEdit={cancelEditEntry}
        onBeginEdit={beginEditEntry}
        onRequestDelete={setEntryToDelete}
      />

      <WeeklyOverviewSection
        isEntriesLoading={isEntriesLoading}
        entries={entries}
        projects={projects}
        projectTasks={projectTasks}
        weeklySummary={weeklySummary}
      />

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
