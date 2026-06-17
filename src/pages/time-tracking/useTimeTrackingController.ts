import { useMemo } from 'react'
import type { ProjectPreview } from '../../lib/pm'
import { endOfWeek, startOfWeek, toDateInputValue } from '../time-tracking.utils'
import { useTimeTrackingFilters } from './useTimeTrackingFilters'
import { useTimeTrackingManualForm } from './useTimeTrackingManualForm'
import { useTimeTrackingTimer } from './useTimeTrackingTimer'
import {
  useTimeTrackingActions,
  type UseTimeTrackingActionsInput,
} from './useTimeTrackingActions'
import { buildWeeklySummary } from '../time-tracking.utils'

interface UseTimeTrackingControllerInput {
  projects: ProjectPreview[]
  selectedProjectId: string | null
  currentUserId: string | null
  setStatus: (status: string) => void
  loadDashboardPreview: () => Promise<void>
}

/**
 * Compose time tracking hooks into a cohesive controller
 *
 * Refactored from monolithic 350-line hook into:
 * - useTimeTrackingFilters: project/week/edit selection
 * - useTimeTrackingManualForm: manual entry form state
 * - useTimeTrackingTimer: timer state and elapsed calculation
 * - useTimeTrackingActions: API calls and data loading
 *
 * Benefits:
 * - Each hook has single responsibility
 * - Easier to test, reuse, and maintain
 * - Clearer data flow
 */
export function useTimeTrackingController(input: UseTimeTrackingControllerInput) {
  const { projects, selectedProjectId, currentUserId, setStatus, loadDashboardPreview } =
    input

  // Filters: project, week, edit mode
  const { activeProjectId, editingEntryId, weekAnchorDate, entryToDelete, setActiveProjectId, setEditingEntryId, setWeekAnchorDate, setEntryToDelete } =
    useTimeTrackingFilters(selectedProjectId)

  // Manual entry form
  const {
    manualTaskId,
    manualDate,
    manualHours,
    manualIsBillable,
    manualNotes,
    setManualTaskId,
    setManualDate,
    setManualHours,
    setManualIsBillable,
    setManualNotes,
    resetManualEntryForm: resetManualForm,
    beginEditEntry,
    cancelEditEntry,
  } = useTimeTrackingManualForm()

  // Timer
  const {
    timerTaskId,
    timerIsBillable,
    timerNotes,
    timerStartedAt,
    timerElapsedSec,
    isTimerSaving,
    trackedTimerLabel,
    setTimerTaskId,
    setTimerIsBillable,
    setTimerNotes,
    setTimerStartedAt,
    setIsTimerSaving,
    startTimer: timerStartRaw,
    cancelTimer,
  } = useTimeTrackingTimer()

  // Compute week range
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

  // Actions: load data, save, delete
  const actionsInput: UseTimeTrackingActionsInput = {
    projects,
    currentUserId,
    activeProjectId,
    weekRange,
    editingEntryId,
    setStatus,
    loadDashboardPreview,
    setEntryToDelete,
  }

  const {
    entries,
    isEntriesLoading,
    projectTasks,
    taskLabelById,
    isTaskLabelsLoading,
    manualDateMin,
    manualDateMax,
    reloadCurrentWeek,
    submitManualEntry: submitManualRaw,
    deleteEntryHandler,
    startTimerAndSave,
  } = useTimeTrackingActions(actionsInput)

  // Derived state
  const visibleEntries = useMemo(
    () => (currentUserId ? entries.filter((entry) => entry.user_id === currentUserId) : entries),
    [currentUserId, entries],
  )

  const weeklySummary = useMemo(() => buildWeeklySummary(visibleEntries), [visibleEntries])

  // Composed actions with proper sequencing
  const submitManualEntry = async () => {
    await submitManualRaw({
      activeProjectId,
      manualTaskId,
      manualDate,
      manualHours,
      manualIsBillable,
      manualNotes,
      onSuccess: () => {
        resetManualForm()
        setWeekAnchorDate(manualDate)
      },
    })
  }

  const handleBeginEditEntry = (entry) => {
    beginEditEntry(entry, setEditingEntryId, setActiveProjectId, setWeekAnchorDate)
  }

  const startTimer = () => {
    if (!activeProjectId) {
      setStatus('Select a project before starting timer')
      return
    }

    timerStartRaw()
  }

  const stopAndSaveTimer = async () => {
    if (!timerStartedAt || isTimerSaving) {
      return
    }

    setIsTimerSaving(true)

    try {
      await startTimerAndSave({
        activeProjectId,
        timerTaskId,
        timerIsBillable,
        timerNotes,
        elapsedSec: timerElapsedSec,
        onSuccess: () => {
          setTimerStartedAt(null)
          setTimerNotes('')
          const now = new Date()
          const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
          setWeekAnchorDate(dateStr)
        },
      })
    } finally {
      setIsTimerSaving(false)
    }
  }

  return {
    // Entries & loading
    entries,
    isEntriesLoading,
    visibleEntries,
    
    // Project selection
    activeProjectId,
    projectTasks,
    taskLabelById,
    isTaskLabelsLoading,

    // Edit mode
    editingEntryId,
    entryToDelete,

    // Manual entry form
    manualTaskId,
    manualDate,
    manualHours,
    manualIsBillable,
    manualNotes,
    manualDateMin,
    manualDateMax,

    // Timer state
    timerTaskId,
    timerIsBillable,
    timerNotes,
    timerStartedAt,
    trackedTimerLabel,
    isTimerSaving,

    // Week selection
    weekAnchorDate,
    weekRange,
    weeklySummary,

    // Setters (preserve original API)
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

    // Actions
    submitManualEntry,
    deleteEntryHandler,
    startTimer,
    stopAndSaveTimer,
    cancelTimer,
    cancelEditEntry,
    beginEditEntry: handleBeginEditEntry,
    reloadCurrentWeek,
  }
}
