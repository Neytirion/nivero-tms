import { createTimeEntry, deleteTimeEntry, updateTimeEntry, type TimeEntryPreview } from '../../../lib/pm'
import { parseTimeInputToHours, toDateInputValue } from '../utils/time-tracking.utils'

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
  manualStartTime: string
  manualEndTime: string
  manualIsBillable: boolean
  onSuccess: () => void
}

interface StartTimerAndSaveInput {
  activeProjectId: string
  timerTaskId: string
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

    const parsedHours = parseTimeInputToHours(formInput.manualHours)
    if (!parsedHours) {
      input.setStatus('Invalid time format. Use 1.5, 1:30, 90m, or 1h 30m')
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

    // Validate time range if both times are provided
    if (formInput.manualStartTime && formInput.manualEndTime) {
      if (formInput.manualStartTime >= formInput.manualEndTime) {
        input.setStatus('End time must be after start time')
        return
      }

      // Validate that duration approximately matches (allow 5 minutes tolerance)
      const [startHour, startMin] = formInput.manualStartTime.split(':').map(Number)
      const [endHour, endMin] = formInput.manualEndTime.split(':').map(Number)
      const startTotalMin = startHour * 60 + startMin
      const endTotalMin = endHour * 60 + endMin
      const durationMin = endTotalMin - startTotalMin
      
      if (Math.abs(durationMin - (parsedHours * 60)) > 5) {
        input.setStatus(`Duration mismatch: ${parsedHours} hours logged but ${(durationMin / 60).toFixed(1)} hours between start and end time`)
        return
      }
    }

    try {
      const startedAt = formInput.manualStartTime
        ? `${formInput.manualDate}T${formInput.manualStartTime}:00`
        : undefined
      const endedAt = formInput.manualEndTime
        ? `${formInput.manualDate}T${formInput.manualEndTime}:00`
        : undefined

      if (input.editingEntryId) {
        await updateTimeEntry(input.editingEntryId, {
          projectId: formInput.activeProjectId,
          taskId: formInput.manualTaskId || undefined,
          entryDate: formInput.manualDate,
          hoursSpent: parsedHours,
          isBillable: formInput.manualIsBillable,
          startedAt,
          endedAt,
        })
        input.setStatus('Time entry updated')
      } else {
        await createTimeEntry({
          projectId: formInput.activeProjectId,
          taskId: formInput.manualTaskId || undefined,
          entryDate: formInput.manualDate,
          hoursSpent: parsedHours,
          isBillable: formInput.manualIsBillable,
          startedAt,
          endedAt,
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
        isBillable: true,
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
