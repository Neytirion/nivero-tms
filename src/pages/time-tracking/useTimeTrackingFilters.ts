import { useState } from 'react'
import type { TimeEntryPreview } from '../../lib/pm'

export interface UseTimeTrackingFiltersReturn {
  activeProjectId: string
  editingEntryId: string | null
  weekAnchorDate: string
  entryToDelete: TimeEntryPreview | null
  setActiveProjectId: (id: string) => void
  setEditingEntryId: (id: string | null) => void
  setWeekAnchorDate: (date: string) => void
  setEntryToDelete: (entry: TimeEntryPreview | null) => void
  resetFilters: () => void
}

/**
 * Manage filters: active project, week selection, edit mode, and entry deletion
 */
export function useTimeTrackingFilters(
  initialProjectId: string | null,
): UseTimeTrackingFiltersReturn {
  const [activeProjectId, setActiveProjectId] = useState(initialProjectId ?? '')
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [weekAnchorDate, setWeekAnchorDate] = useState(() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  })
  const [entryToDelete, setEntryToDelete] = useState<TimeEntryPreview | null>(null)

  const getDefaultWeekAnchorDate = () => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  const resetFilters = () => {
    setActiveProjectId(initialProjectId ?? '')
    setEditingEntryId(null)
    setWeekAnchorDate(getDefaultWeekAnchorDate())
    setEntryToDelete(null)
  }

  return {
    activeProjectId,
    editingEntryId,
    weekAnchorDate,
    entryToDelete,
    setActiveProjectId,
    setEditingEntryId,
    setWeekAnchorDate,
    setEntryToDelete,
    resetFilters,
  }
}
