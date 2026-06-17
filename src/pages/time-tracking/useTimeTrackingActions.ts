import { useEffect, useState } from 'react'
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
import { toDateInputValue } from '../time-tracking.utils'

export interface UseTimeTrackingActionsInput {
  projects: ProjectPreview[]
  currentUserId: string | null
  activeProjectId: string
  weekRange: { startDate: string; endDate: string }
  editingEntryId: string | null
  setStatus: (status: string) => void
  loadDashboardPreview: () => Promise<void>
  setEntryToDelete?: (entry: TimeEntryPreview | null) => void
}

export interface UseTimeTrackingActionsReturn {
  entries: TimeEntryPreview[]
  isEntriesLoading: boolean
  projectTasks: TaskPreview[]
  taskLabelById: Record<string, string>
  isTaskLabelsLoading: boolean
  manualDateMin: string | undefined
  manualDateMax: string | undefined
  reloadCurrentWeek: () => Promise<void>
  submitManualEntry: (input: {
    activeProjectId: string
    manualTaskId: string
    manualDate: string
    manualHours: string
    manualIsBillable: boolean
    manualNotes: string
    onSuccess: () => void
  }) => Promise<void>
  deleteEntryHandler: (entry: TimeEntryPreview) => Promise<void>
  startTimerAndSave: (input: {
    activeProjectId: string
    timerTaskId: string
    timerIsBillable: boolean
    timerNotes: string
    elapsedSec: number
    onSuccess: () => void
  }) => Promise<void>
}

/**
 * Handle async operations: loading entries, projects, saving/deleting entries
 */
export function useTimeTrackingActions(
  input: UseTimeTrackingActionsInput,
): UseTimeTrackingActionsReturn {
  const {
    projects,
    currentUserId,
    activeProjectId,
    weekRange,
    editingEntryId,
    setStatus,
    loadDashboardPreview,
  } = input

  const [entries, setEntries] = useState<TimeEntryPreview[]>([])
  const [isEntriesLoading, setIsEntriesLoading] = useState(false)
  const [projectTasks, setProjectTasks] = useState<TaskPreview[]>([])
  const [taskLabelById, setTaskLabelById] = useState<Record<string, string>>({})
  const [isTaskLabelsLoading, setIsTaskLabelsLoading] = useState(false)

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null
  const manualDateMin = activeProject?.start_date ?? undefined
  const manualDateMax = activeProject?.end_date ?? undefined

  // Load time entries for current week and project
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
        setStatus(
          error instanceof Error
            ? `Time entries load error: ${error.message}`
            : 'Time entries load error',
        )
        setEntries([])
      }

      setIsEntriesLoading(false)
    }

    void loadWeekEntries()
  }, [activeProjectId, setStatus, weekRange.endDate, weekRange.startDate])

  // Load project tasks for current active project
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
          setStatus(
            error instanceof Error
              ? `Task load error: ${error.message}`
              : 'Task load error',
          )
          setProjectTasks([])
          setTaskLabelById({})
        } finally {
          setIsTaskLabelsLoading(false)
        }

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
      } catch (error) {
        setStatus(
          error instanceof Error ? `Task load error: ${error.message}` : 'Task load error',
        )
        setProjectTasks([])
        setTaskLabelById({})
      } finally {
        setIsTaskLabelsLoading(false)
      }
    }

    void loadProjectTasks()
  }, [activeProjectId, currentUserId, projects, setStatus])

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
      setStatus(
        error instanceof Error
          ? `Time entries load error: ${error.message}`
          : 'Time entries load error',
      )
      setEntries([])
    }

    setIsEntriesLoading(false)
  }

  const refreshWorkspaceMetrics = async () => {
    try {
      await loadDashboardPreview()
    } catch {
      // Keep page usable even if background refresh fails
    }
  }

  const submitManualEntry = async (formInput: {
    activeProjectId: string
    manualTaskId: string
    manualDate: string
    manualHours: string
    manualIsBillable: boolean
    manualNotes: string
    onSuccess: () => void
  }) => {
    if (!formInput.activeProjectId) {
      setStatus('Select a project before logging time')
      return
    }

    const parsedHours = Number.parseFloat(formInput.manualHours)
    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      setStatus('Hours must be greater than 0')
      return
    }

    if (manualDateMin && formInput.manualDate < manualDateMin) {
      setStatus('Manual entry date must be within selected project dates')
      return
    }

    if (manualDateMax && formInput.manualDate > manualDateMax) {
      setStatus('Manual entry date must be within selected project dates')
      return
    }

    try {
      if (editingEntryId) {
        await updateTimeEntry(editingEntryId, {
          projectId: formInput.activeProjectId,
          taskId: formInput.manualTaskId || undefined,
          entryDate: formInput.manualDate,
          hoursSpent: parsedHours,
          isBillable: formInput.manualIsBillable,
          notes: formInput.manualNotes,
        })
        setStatus('Time entry updated')
      } else {
        await createTimeEntry({
          projectId: formInput.activeProjectId,
          taskId: formInput.manualTaskId || undefined,
          entryDate: formInput.manualDate,
          hoursSpent: parsedHours,
          isBillable: formInput.manualIsBillable,
          notes: formInput.manualNotes,
        })
        setStatus('Time entry created')
      }

      formInput.onSuccess()
      await Promise.all([reloadCurrentWeek(), refreshWorkspaceMetrics()])
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Time entry save error: ${error.message}`
          : 'Time entry save error',
      )
    }
  }

  const deleteEntryHandler = async (entry: TimeEntryPreview) => {
    try {
      await deleteTimeEntry(entry.id)
      input.setEntryToDelete?.(null)
      await Promise.all([reloadCurrentWeek(), refreshWorkspaceMetrics()])
      setStatus('Time entry deleted')
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Delete time entry error: ${error.message}`
          : 'Delete time entry error',
      )
    }
  }

  const startTimerAndSave = async (timerInput: {
    activeProjectId: string
    timerTaskId: string
    timerIsBillable: boolean
    timerNotes: string
    elapsedSec: number
    onSuccess: () => void
  }) => {
    if (!timerInput.activeProjectId) {
      setStatus('Select a project before saving timer entry')
      return
    }

    const timerEntryDate = toDateInputValue(new Date())
    const elapsedHours = Math.max(1 / 60, timerInput.elapsedSec / 3600)

    try {
      await createTimeEntry({
        projectId: timerInput.activeProjectId,
        taskId: timerInput.timerTaskId || undefined,
        entryDate: timerEntryDate,
        hoursSpent: elapsedHours,
        isBillable: timerInput.timerIsBillable,
        notes: timerInput.timerNotes,
      })

      timerInput.onSuccess()
      await Promise.all([reloadCurrentWeek(), refreshWorkspaceMetrics()])
      setStatus('Timer entry saved')
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Timer save error: ${error.message}`
          : 'Timer save error',
      )
    }
  }

  return {
    entries,
    isEntriesLoading,
    projectTasks,
    taskLabelById,
    isTaskLabelsLoading,
    manualDateMin,
    manualDateMax,
    reloadCurrentWeek,
    submitManualEntry,
    deleteEntryHandler,
    startTimerAndSave,
  }
}
