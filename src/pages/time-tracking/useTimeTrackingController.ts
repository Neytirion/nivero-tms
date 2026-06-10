import { useEffect, useMemo, useState } from 'react'
import {
  createTimeEntry,
  deleteTimeEntry,
  getProjectTasks,
  getTimeEntries,
  updateTimeEntry,
  type ProjectPreview,
  type TaskPreview,
  type TimeEntryPreview,
} from '../../lib/pm'
import {
  buildWeeklySummary,
  endOfWeek,
  startOfWeek,
  toDateInputValue,
} from '../time-tracking.utils'

interface UseTimeTrackingControllerInput {
  projects: ProjectPreview[]
  selectedProjectId: string | null
  currentUserId: string | null
  setStatus: (status: string) => void
  loadDashboardPreview: () => Promise<void>
}

export function useTimeTrackingController(input: UseTimeTrackingControllerInput) {
  const { projects, selectedProjectId, currentUserId, setStatus, loadDashboardPreview } = input
  const [entries, setEntries] = useState<TimeEntryPreview[]>([])
  const [isEntriesLoading, setIsEntriesLoading] = useState(false)
  const [activeProjectId, setActiveProjectId] = useState(selectedProjectId ?? '')
  const [projectTasks, setProjectTasks] = useState<TaskPreview[]>([])
  const [taskLabelById, setTaskLabelById] = useState<Record<string, string>>({})
  const [isTaskLabelsLoading, setIsTaskLabelsLoading] = useState(false)
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
  }, [activeProjectId, setStatus, weekRange.endDate, weekRange.startDate])

  useEffect(() => {
    const loadProjectTasks = async () => {
      setIsTaskLabelsLoading(true)

      if (!activeProjectId) {
        try {
          const tasksByProject = await Promise.all(
            projects.map(async (project) => ({
              tasks: await getProjectTasks(project.id),
            })),
          )

          const allTasks = tasksByProject.flatMap((item) => item.tasks)
          setProjectTasks(allTasks)
          setTaskLabelById(
            allTasks.reduce<Record<string, string>>((acc, task) => {
              acc[task.id] = task.title
              return acc
            }, {}),
          )
        } catch (error) {
          setStatus(error instanceof Error ? `Task load error: ${error.message}` : 'Task load error')
          setProjectTasks([])
          setTaskLabelById({})
        } finally {
          setIsTaskLabelsLoading(false)
        }

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
        setTaskLabelById(
          nextTasks.reduce<Record<string, string>>((acc, task) => {
            acc[task.id] = task.title
            return acc
          }, {}),
        )
        setManualTaskId((prev) => (visibleTasks.some((task) => task.id === prev) ? prev : ''))
        setTimerTaskId((prev) => (visibleTasks.some((task) => task.id === prev) ? prev : ''))
      } catch (error) {
        setStatus(error instanceof Error ? `Task load error: ${error.message}` : 'Task load error')
        setProjectTasks([])
        setTaskLabelById({})
      } finally {
        setIsTaskLabelsLoading(false)
      }
    }

    void loadProjectTasks()
  }, [activeProjectId, currentUserId, projects, setStatus])

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

  return {
    entries,
    isEntriesLoading,
    activeProjectId,
    projectTasks,
    taskLabelById,
    isTaskLabelsLoading,
    editingEntryId,
    entryToDelete,
    manualTaskId,
    manualDate,
    manualDateMin,
    manualDateMax,
    manualHours,
    manualIsBillable,
    manualNotes,
    timerTaskId,
    timerIsBillable,
    timerNotes,
    timerStartedAt,
    trackedTimerLabel,
    isTimerSaving,
    weekAnchorDate,
    weekRange,
    visibleEntries,
    weeklySummary,
    setActiveProjectId,
    setWeekAnchorDate,
    setManualTaskId,
    setManualDate,
    setManualHours,
    setManualIsBillable,
    setManualNotes,
    setTimerTaskId,
    setTimerIsBillable,
    setTimerNotes,
    setEntryToDelete,
    submitManualEntry,
    startTimer,
    stopAndSaveTimer,
    cancelTimer,
    cancelEditEntry,
    beginEditEntry,
    deleteEntryHandler,
  }
}
