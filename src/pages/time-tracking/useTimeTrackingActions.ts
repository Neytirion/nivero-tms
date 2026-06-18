import { useEffect, useMemo, useState } from 'react'
import {
  type ProjectPreview,
  type TaskPreview,
  type TimeEntryPreview,
} from '../../lib/pm'
import { useTimeTrackingLoaders } from './useTimeTrackingLoaders'
import { useTimeTrackingMutations } from './useTimeTrackingMutations'

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

  const loadersInput = useMemo(
    () => ({
      projects,
      currentUserId,
      activeProjectId,
      weekRange,
      setStatus,
      setEntries,
      setIsEntriesLoading,
      setProjectTasks,
      setTaskLabelById,
      setIsTaskLabelsLoading,
    }),
    [activeProjectId, currentUserId, projects, setStatus, weekRange],
  )

  const { loadWeekEntries, loadProjectTasks } = useTimeTrackingLoaders(loadersInput)

  // Load time entries for current week and project
  useEffect(() => {
    void loadWeekEntries()
  }, [loadWeekEntries, activeProjectId, weekRange.endDate, weekRange.startDate])

  // Load project tasks for current active project
  useEffect(() => {
    void loadProjectTasks()
  }, [loadProjectTasks, activeProjectId, currentUserId, projects])

  const reloadCurrentWeek = async () => {
    await loadWeekEntries()
  }

  const refreshWorkspaceMetrics = async () => {
    try {
      await loadDashboardPreview()
    } catch {
      // Keep page usable even if background refresh fails
    }
  }

  const refreshAfterSave = async () => {
    await Promise.all([reloadCurrentWeek(), refreshWorkspaceMetrics()])
  }

  const { submitManualEntry, deleteEntryHandler, startTimerAndSave } = useTimeTrackingMutations({
    editingEntryId,
    manualDateMin,
    manualDateMax,
    setStatus,
    refreshAfterSave,
    refreshAfterDelete: refreshAfterSave,
    setEntryToDelete: input.setEntryToDelete,
  })

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
