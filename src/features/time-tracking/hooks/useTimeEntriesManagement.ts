import { useMemo, useState } from 'react'
import type { ProjectPreview, TimeEntryPreview } from '../../../lib/pm'

export interface TimeEntriesFilterState {
  dateFrom: string
  dateTo: string
  selectedProjectIds: string[]
  billableFilter: 'all' | 'billable' | 'non-billable'
}

interface UseTimeEntriesManagementProps {
  entries: TimeEntryPreview[]
  projects: ProjectPreview[]
  taskLabelById: Record<string, string>
}

export function useTimeEntriesManagement({
  entries,
  projects,
  taskLabelById,
}: UseTimeEntriesManagementProps) {
  const [filters, setFilters] = useState<TimeEntriesFilterState>({
    dateFrom: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    selectedProjectIds: [],
    billableFilter: 'all',
  })

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null)

  // Фильтрация записей
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Фильтр по датам
      if (entry.entry_date < filters.dateFrom || entry.entry_date > filters.dateTo) {
        return false
      }

      // Фильтр по проектам
      if (filters.selectedProjectIds.length > 0 && !filters.selectedProjectIds.includes(entry.project_id)) {
        return false
      }

      // Фильтр по типу (billable)
      if (filters.billableFilter === 'billable' && !entry.is_billable) {
        return false
      }
      if (filters.billableFilter === 'non-billable' && entry.is_billable) {
        return false
      }

      return true
    })
  }, [entries, filters])

  // Группировка по датам
  const entriesByDate = useMemo(() => {
    const grouped: Record<string, TimeEntryPreview[]> = {}

    filteredEntries.forEach((entry) => {
      if (!grouped[entry.entry_date]) {
        grouped[entry.entry_date] = []
      }
      grouped[entry.entry_date].push(entry)
    })

    // Сортировка по датам (новые сверху)
    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .map(([date, entries]) => ({ date, entries }))
  }, [filteredEntries])

  const handleUpdateFilter = (key: keyof TimeEntriesFilterState, value: unknown) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleResetFilters = () => {
    setFilters({
      dateFrom: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0],
      selectedProjectIds: [],
      billableFilter: 'all',
    })
  }

  return {
    filters,
    filteredEntries,
    entriesByDate,
    editingEntryId,
    deletingEntryId,
    projects,
    taskLabelById,
    handleUpdateFilter,
    handleResetFilters,
    setEditingEntryId,
    setDeletingEntryId,
  }
}
