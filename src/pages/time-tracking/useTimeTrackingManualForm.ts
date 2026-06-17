import { useState } from 'react'
import { toDateInputValue } from '../time-tracking.utils'
import type { TimeEntryPreview } from '../../lib/pm'

export interface UseTimeTrackingManualFormReturn {
  manualTaskId: string
  manualDate: string
  manualHours: string
  manualIsBillable: boolean
  manualNotes: string
  setManualTaskId: (id: string) => void
  setManualDate: (date: string) => void
  setManualHours: (hours: string) => void
  setManualIsBillable: (billable: boolean) => void
  setManualNotes: (notes: string) => void
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
  const [manualIsBillable, setManualIsBillable] = useState(true)
  const [manualNotes, setManualNotes] = useState('')

  const resetManualEntryForm = () => {
    setManualTaskId('')
    setManualDate(toDateInputValue(new Date()))
    setManualHours('1')
    setManualIsBillable(true)
    setManualNotes('')
  }

  const beginEditEntry = (entry: TimeEntryPreview, setEditingEntryId: (id: string | null) => void, setActiveProjectId: (id: string) => void, setWeekAnchorDate: (date: string) => void) => {
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

  return {
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
