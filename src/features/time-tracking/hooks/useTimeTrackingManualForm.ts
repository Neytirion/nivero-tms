import { useState } from 'react'
import { formatDurationFromSeconds, getEntryDurationSeconds, toDateInputValue } from '../utils/time-tracking.utils'
import type { TimeEntryPreview } from '../../../lib/pm'

export interface UseTimeTrackingManualFormReturn {
  manualTaskId: string
  manualDate: string
  manualHours: string
  manualStartTime: string
  manualEndTime: string
  manualIsBillable: boolean
  setManualTaskId: (id: string) => void
  setManualDate: (date: string) => void
  setManualHours: (hours: string) => void
  setManualStartTime: (time: string) => void
  setManualEndTime: (time: string) => void
  setManualIsBillable: (billable: boolean) => void
  resetManualEntryForm: () => void
  beginEditEntry: (entry: TimeEntryPreview, setEditingEntryId: (id: string | null) => void, setActiveProjectId: (id: string) => void, setWeekAnchorDate: (date: string) => void) => void
  cancelEditEntry: () => void
}

/**
 * Manage manual time entry form state
 */
export function useTimeTrackingManualForm(): UseTimeTrackingManualFormReturn {
  const [manualTaskId, setManualTaskId] = useState('')
  const [manualDate, setManualDate] = useState(() => toDateInputValue(new Date()))
  const [manualHours, setManualHours] = useState('1')
  const [manualStartTime, setManualStartTime] = useState('')
  const [manualEndTime, setManualEndTime] = useState('')
  const [manualIsBillable, setManualIsBillable] = useState(true)

  const resetManualEntryForm = () => {
    setManualTaskId('')
    setManualDate(toDateInputValue(new Date()))
    setManualHours('1')
    setManualStartTime('')
    setManualEndTime('')
    setManualIsBillable(true)
  }

  const beginEditEntry = (entry: TimeEntryPreview, setEditingEntryId: (id: string | null) => void, setActiveProjectId: (id: string) => void, setWeekAnchorDate: (date: string) => void) => {
    setActiveProjectId(entry.project_id)
    setWeekAnchorDate(entry.entry_date)
    setEditingEntryId(entry.id)
    setManualTaskId(entry.task_id ?? '')
    setManualDate(entry.entry_date)
    setManualHours(formatDurationFromSeconds(getEntryDurationSeconds(entry)))
    setManualStartTime(entry.started_at ? entry.started_at.split('T')[1].substring(0, 5) : '')
    setManualEndTime(entry.ended_at ? entry.ended_at.split('T')[1].substring(0, 5) : '')
    setManualIsBillable(entry.is_billable)
  }

  const cancelEditEntry = () => {
    resetManualEntryForm()
  }

  return {
    manualTaskId,
    manualDate,
    manualHours,
    manualStartTime,
    manualEndTime,
    manualIsBillable,
    setManualTaskId,
    setManualDate,
    setManualHours,
    setManualStartTime,
    setManualEndTime,
    setManualIsBillable,
    resetManualEntryForm,
    beginEditEntry,
    cancelEditEntry,
  }
}

// Helper to track if entry is being edited (separate from form state)
export function useTimeTrackingEditMode(
  initialEntry: TimeEntryPreview | null = null,
): [string | null, (entry: TimeEntryPreview | null) => void] {
  const [editingEntryId, setEditingEntryId] = useState<string | null>(
    initialEntry?.id ?? null,
  )

  const setEditingMode = (entry: TimeEntryPreview | null) => {
    setEditingEntryId(entry?.id ?? null)
  }

  return [editingEntryId, setEditingMode]
}
