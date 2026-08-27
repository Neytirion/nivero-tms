import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { ReportsFilterState, TimeEntryReport } from '../types/reports'
import { filterTimeEntries, getDateRangeDefaults } from '../utils/reports.utils'

interface Project {
  id: string
  name: string
  customer_name: string | null
}

export function useReportsController() {
  const [isLoading, setIsLoading] = useState(true)
  const [isFilterLoading, setIsFilterLoading] = useState(false)
  const [timeEntries, setTimeEntries] = useState<TimeEntryReport[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState<ReportsFilterState>(() => {
    const { dateFrom, dateTo } = getDateRangeDefaults()
    return {
      selectedMemberIds: [],
      selectedProjectIds: [],
      selectedClientNames: [],
      billableFilter: 'all',
      dateFrom,
      dateTo,
    }
  })

  // Load projects and their clients
  const loadProjects = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('projects')
        .select('id, name, customer_name')
        .order('name')

      if (err) throw err
      setProjects(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    }
  }, [])

  // Load time entries with member names
  const loadTimeEntries = useCallback(async () => {
    setIsFilterLoading(true)
    try {
      // Load time entries
      const { data, error: err } = await supabase
        .from('time_entries')
        .select('id, user_id, project_id, task_id, entry_date, minutes_spent, is_billable, started_at, ended_at, created_at')
        .gte('entry_date', filters.dateFrom)
        .lte('entry_date', filters.dateTo)
        .order('entry_date', { ascending: false })

      if (err) throw err

      // Get unique project IDs to load member names
      const uniqueProjectIds = Array.from(new Set((data || []).map((e) => e.project_id)))

      // Load member names from project members for each project
      const memberNamesMap: Record<string, string> = {}
      for (const projectId of uniqueProjectIds) {
        const { data: members } = await supabase.rpc('get_project_members_with_profile', {
          p_project_id: projectId,
        })

        if (members) {
          members.forEach((member: { user_id: string; full_name: string | null }) => {
            if (member.user_id && member.full_name) {
              memberNamesMap[member.user_id] = member.full_name
            }
          })
        }
      }

      // Transform entries
      const entries: TimeEntryReport[] = (data || []).map((entry) => {
        const project = projects.find((p) => p.id === entry.project_id)
        const memberName = memberNamesMap[entry.user_id] || entry.user_id.substring(0, 8)

        return {
          id: entry.id,
          userId: entry.user_id,
          memberName,
          projectId: entry.project_id,
          projectName: project?.name || 'Unknown',
          clientName: project?.customer_name || null,
          taskId: entry.task_id,
          entryDate: entry.entry_date,
          minutesSpent: entry.minutes_spent,
          isBillable: entry.is_billable,
          startedAt: entry.started_at,
          endedAt: entry.ended_at,
          createdAt: entry.created_at,
        }
      })

      setTimeEntries(entries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load time entries')
    } finally {
      setIsFilterLoading(false)
    }
  }, [filters.dateFrom, filters.dateTo, projects])

  // Initial load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      await loadProjects()
      setIsLoading(false)
    }

    load()
  }, [loadProjects])

  // Load entries when date range changes
  useEffect(() => {
    const load = async () => {
      await loadTimeEntries()
    }

    load()
  }, [filters.dateFrom, filters.dateTo, projects, loadTimeEntries])

  const filteredEntries = useMemo(() => {
    return filterTimeEntries(timeEntries, filters)
  }, [timeEntries, filters])

  const uniqueMembers = useMemo(() => {
    return Array.from(new Map(timeEntries.map((e) => [e.userId, { id: e.userId, name: e.memberName }])).values()).sort(
      (a, b) => a.name.localeCompare(b.name),
    )
  }, [timeEntries])

  const uniqueClients = useMemo(() => {
    return Array.from(new Set(projects.map((p) => p.customer_name).filter((c) => c !== null) as string[])).sort()
  }, [projects])

  const handleUpdateFilter = useCallback((key: keyof ReportsFilterState, value: unknown) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  const handleResetFilters = useCallback(() => {
    const { dateFrom, dateTo } = getDateRangeDefaults()
    setFilters({
      selectedMemberIds: [],
      selectedProjectIds: [],
      selectedClientNames: [],
      billableFilter: 'all',
      dateFrom,
      dateTo,
    })
  }, [])

  return {
    isLoading,
    isFilterLoading,
    timeEntries: filteredEntries,
    projects,
    filters,
    error,
    uniqueMembers,
    uniqueClients,
    handleUpdateFilter,
    handleResetFilters,
  }
}
