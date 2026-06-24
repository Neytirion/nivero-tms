import { createTimeEntry, deleteTimeEntry, updateTimeEntry, type TimeEntryPreview } from '../../lib/pm'
import { toDateInputValue } from './time-tracking.utils'

interface UseTimeTrackingMutationsInput {
  editingEntryId: string | null
  manualDateMin: string | undefined
  manualDateMax: string | undefined
  setStatus: (status: string) => void
  refreshAfterSave: () => Promise<void>
  refreshAfterDelete: () => Promise<void>
  setEntryToDelete?: (entry: TimeEntryPreview | null) => void
}

interface SubmitManualEntryInput {
  activeProjectId: string
  manualTaskId: string
  manualDate: string
  manualHours: string
  manualIsBillable: boolean
  manualNotes: string
  onSuccess: () => void
}

interface StartTimerAndSaveInput {
  activeProjectId: string
  timerTaskId: string
  timerIsBillable: boolean
  timerNotes: string
  elapsedSec: number
  onSuccess: () => void
}

export function useTimeTrackingMutations(input: UseTimeTrackingMutationsInput) {
  const submitManualEntry = async (formInput: SubmitManualEntryInput) => {
    if (!formInput.activeProjectId) {
      input.setStatus('Select a project before logging time')
      return
    }

    if (!formInput.manualTaskId) {
      input.setStatus('Select a task before logging time')
      return
    }

    const parsedHours = Number.parseFloat(formInput.manualHours)
    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      input.setStatus('Hours must be greater than 0')
      return
    }

    if (input.manualDateMin && formInput.manualDate < input.manualDateMin) {
      input.setStatus('Manual entry date must be within selected project dates')
      return
    }

    if (input.manualDateMax && formInput.manualDate > input.manualDateMax) {
      input.setStatus('Manual entry date must be within selected project dates')
      return
    }

    try {
      if (input.editingEntryId) {
        await updateTimeEntry(input.editingEntryId, {
          projectId: formInput.activeProjectId,
          taskId: formInput.manualTaskId || undefined,
          entryDate: formInput.manualDate,
          hoursSpent: parsedHours,
          isBillable: formInput.manualIsBillable,
          notes: formInput.manualNotes,
        })
        input.setStatus('Time entry updated')
      } else {
        await createTimeEntry({
          projectId: formInput.activeProjectId,
          taskId: formInput.manualTaskId || undefined,
          entryDate: formInput.manualDate,
          hoursSpent: parsedHours,
          isBillable: formInput.manualIsBillable,
          notes: formInput.manualNotes,
        })
        input.setStatus('Time entry created')
      }

      formInput.onSuccess()
      await input.refreshAfterSave()
    } catch (error) {
      input.setStatus(
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
      await input.refreshAfterDelete()
      input.setStatus('Time entry deleted')
    } catch (error) {
      input.setStatus(
        error instanceof Error
          ? `Delete time entry error: ${error.message}`
          : 'Delete time entry error',
      )
    }
  }

  const startTimerAndSave = async (timerInput: StartTimerAndSaveInput) => {
    if (!timerInput.activeProjectId) {
      input.setStatus('Select a project before saving timer entry')
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
      await input.refreshAfterSave()
      input.setStatus('Timer entry saved')
    } catch (error) {
      input.setStatus(
        error instanceof Error
          ? `Timer save error: ${error.message}`
          : 'Timer save error',
      )
    }
  }

  return {
    submitManualEntry,
    deleteEntryHandler,
    startTimerAndSave,
  }
}
