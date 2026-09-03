import { useEffect, useMemo, useState } from 'react'
import { useAuthSession } from '../../auth/useAuthSession'
import { getTimeEntries, getMyProjects, getProjectTasks, updateTimeEntry, deleteTimeEntry } from '../../../lib/pm'
import type { ProjectPreview, TaskPreview, TimeEntryPreview } from '../../../lib/pm'
import { useToast } from '../../../shared/components'
import { useTimeEntriesManagement, type TimeEntriesFilterState } from './useTimeEntriesManagement'
import { getEntryDurationSeconds } from '../utils/time-tracking.utils'

interface UseTimeEntriesViewerResult {
  entries: TimeEntryPreview[]
  projects: ProjectPreview[]
  taskLabelById: Record<string, string>
  isLoading: boolean
  filters: TimeEntriesFilterState
  entriesByDate: Array<{ date: string; entries: TimeEntryPreview[] }>
  totalHours: number
  editingEntryId: string | null
  deletingEntryId: string | null
  error: string | null
  handleUpdateFilter: (key: keyof TimeEntriesFilterState, value: unknown) => void
  handleResetFilters: () => void
  setEditingEntryId: (id: string | null) => void
  setDeletingEntryId: (id: string | null) => void
  handleUpdate: (updatedEntry: Partial<TimeEntryPreview>) => Promise<void>
  handleDelete: (entry: TimeEntryPreview) => Promise<void>
  refreshEntries: () => Promise<void>
}

export function useTimeEntriesViewer(): UseTimeEntriesViewerResult {
  const { user } = useAuthSession()
  const { showToast } = useToast()

  const [entries, setEntries] = useState<TimeEntryPreview[]>([])
  const [projects, setProjects] = useState<ProjectPreview[]>([])
  const [tasks, setTasks] = useState<TaskPreview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async (userId: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const [entriesData, projectsData] = await Promise.all([
        getTimeEntries({ userId }),
        getMyProjects(),
      ])

      const projectIds = [...new Set(entriesData.map((entry) => entry.project_id))]
      const taskGroups = await Promise.all(projectIds.map((projectId) => getProjectTasks(projectId)))

      setEntries(entriesData)
      setProjects(projectsData)
      setTasks(taskGroups.flat())
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load time entries'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!user?.id) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData(user.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const refreshEntries = async () => {
    if (!user?.id) return
    await loadData(user.id)
  }

  // Build task label map
  const taskLabelById = useMemo(() => {
    const labels: Record<string, string> = {}
    entries.forEach((entry) => {
      if (entry.task_id) {
        const task = tasks.find((candidate) => candidate.id === entry.task_id)
        labels[entry.task_id] = task?.title ?? 'Task unavailable'
      }
    })
    return labels
  }, [entries, tasks])

  // Use management hook
  const management = useTimeEntriesManagement({
    entries,
    projects,
    taskLabelById,
  })

  const handleUpdate = async (updatedEntry: Partial<TimeEntryPreview>) => {
    if (!updatedEntry.id) return

    // Get the current entry to get required fields
    const currentEntry = entries.find((e) => e.id === updatedEntry.id)
    if (!currentEntry) return

    try {
      await updateTimeEntry(updatedEntry.id, {
        projectId: currentEntry.project_id,
        taskId: currentEntry.task_id ?? undefined,
        entryDate: updatedEntry.entry_date ?? currentEntry.entry_date,
        hoursSpent: updatedEntry.minutes_spent
          ? updatedEntry.minutes_spent / 60
          : currentEntry.minutes_spent / 60,
        isBillable: updatedEntry.is_billable ?? currentEntry.is_billable,
        startedAt: updatedEntry.started_at ?? undefined,
        endedAt: updatedEntry.ended_at ?? undefined,
      })

      // Update local state
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === updatedEntry.id
            ? { ...entry, ...updatedEntry }
            : entry
        )
      )

      showToast('Time entry updated successfully', 'success')
      management.setEditingEntryId(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update entry'
      showToast(message, 'error')
    }
  }

  const handleDelete = async (entry: TimeEntryPreview) => {
    try {
      await deleteTimeEntry(entry.id)

      // Update local state
      setEntries((prev) => prev.filter((e) => e.id !== entry.id))

      showToast('Time entry deleted successfully', 'success')
      management.setDeletingEntryId(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete entry'
      showToast(message, 'error')
    }
  }

  // Calculate total hours for filtered entries
  const totalHours = useMemo(() => {
    return management.entriesByDate.reduce((sum, dayGroup) => {
      return sum + dayGroup.entries.reduce((daySum, entry) => daySum + getEntryDurationSeconds(entry) / 3600, 0)
    }, 0)
  }, [management.entriesByDate])

  return {
    entries,
    projects,
    taskLabelById,
    isLoading,
    filters: management.filters,
    entriesByDate: management.entriesByDate,
    totalHours,
    editingEntryId: management.editingEntryId,
    deletingEntryId: management.deletingEntryId,
    error,
    handleUpdateFilter: management.handleUpdateFilter,
    handleResetFilters: management.handleResetFilters,
    setEditingEntryId: management.setEditingEntryId,
    setDeletingEntryId: management.setDeletingEntryId,
    handleUpdate,
    handleDelete,
    refreshEntries,
  }
}
