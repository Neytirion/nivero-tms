import { describe, expect, it } from 'vitest'
import {
  calculateSummary,
  filterTimeEntries,
  getDateRangeDefaults,
  hoursToDisplay,
  minutesToHours,
} from './reports.utils'
import type { ReportsFilterState, TimeEntryReport } from '../types/reports'

function createTimeEntry(overrides: Partial<TimeEntryReport> = {}): TimeEntryReport {
  return {
    id: 'entry-1',
    userId: 'user-1',
    memberName: 'John Doe',
    projectId: 'project-1',
    projectName: 'Project Alpha',
    clientName: 'Acme Corp',
    taskId: null,
    entryDate: '2026-08-27',
    minutesSpent: 60,
    isBillable: true,
    startedAt: null,
    endedAt: null,
    createdAt: '2026-08-27T10:00:00Z',
    ...overrides,
  }
}

describe('reports.utils', () => {
  describe('minutesToHours', () => {
    it('converts minutes to hours', () => {
      expect(minutesToHours(60)).toBe(1)
      expect(minutesToHours(120)).toBe(2)
      expect(minutesToHours(90)).toBe(1.5)
    })

    it('handles zero minutes', () => {
      expect(minutesToHours(0)).toBe(0)
    })
  })

  describe('hoursToDisplay', () => {
    it('formats hours only', () => {
      expect(hoursToDisplay(1)).toBe('1h')
      expect(hoursToDisplay(2)).toBe('2h')
    })

    it('formats minutes only', () => {
      expect(hoursToDisplay(0.25)).toBe('15m')
      expect(hoursToDisplay(0.5)).toBe('30m')
    })

    it('formats hours and minutes', () => {
      expect(hoursToDisplay(1.5)).toBe('1h 30m')
      expect(hoursToDisplay(2.25)).toBe('2h 15m')
    })

    it('handles zero', () => {
      expect(hoursToDisplay(0)).toBe('0m')
    })
  })

  describe('filterTimeEntries', () => {
    it('filters by member', () => {
      const entries = [
        createTimeEntry({ userId: 'user-1', memberName: 'John' }),
        createTimeEntry({ userId: 'user-2', memberName: 'Jane' }),
      ]

      const filters: ReportsFilterState = {
        selectedMemberIds: ['user-1'],
        selectedProjectIds: [],
        selectedClientNames: [],
        billableFilter: 'all',
        dateFrom: '2026-08-01',
        dateTo: '2026-08-31',
      }

      const result = filterTimeEntries(entries, filters)
      expect(result).toHaveLength(1)
      expect(result[0].userId).toBe('user-1')
    })

    it('filters by project', () => {
      const entries = [
        createTimeEntry({ projectId: 'proj-1' }),
        createTimeEntry({ projectId: 'proj-2' }),
      ]

      const filters: ReportsFilterState = {
        selectedMemberIds: [],
        selectedProjectIds: ['proj-1'],
        selectedClientNames: [],
        billableFilter: 'all',
        dateFrom: '2026-08-01',
        dateTo: '2026-08-31',
      }

      const result = filterTimeEntries(entries, filters)
      expect(result).toHaveLength(1)
      expect(result[0].projectId).toBe('proj-1')
    })

    it('filters by client', () => {
      const entries = [
        createTimeEntry({ clientName: 'Acme Corp' }),
        createTimeEntry({ clientName: 'Beta Inc' }),
      ]

      const filters: ReportsFilterState = {
        selectedMemberIds: [],
        selectedProjectIds: [],
        selectedClientNames: ['Acme Corp'],
        billableFilter: 'all',
        dateFrom: '2026-08-01',
        dateTo: '2026-08-31',
      }

      const result = filterTimeEntries(entries, filters)
      expect(result).toHaveLength(1)
      expect(result[0].clientName).toBe('Acme Corp')
    })

    it('filters by billable type', () => {
      const entries = [
        createTimeEntry({ isBillable: true }),
        createTimeEntry({ isBillable: false }),
      ]

      const billableFilters: ReportsFilterState = {
        selectedMemberIds: [],
        selectedProjectIds: [],
        selectedClientNames: [],
        billableFilter: 'billable',
        dateFrom: '2026-08-01',
        dateTo: '2026-08-31',
      }

      const result = filterTimeEntries(entries, billableFilters)
      expect(result).toHaveLength(1)
      expect(result[0].isBillable).toBe(true)
    })

    it('filters by date range', () => {
      const entries = [
        createTimeEntry({ entryDate: '2026-08-15' }),
        createTimeEntry({ entryDate: '2026-09-15' }),
      ]

      const filters: ReportsFilterState = {
        selectedMemberIds: [],
        selectedProjectIds: [],
        selectedClientNames: [],
        billableFilter: 'all',
        dateFrom: '2026-08-01',
        dateTo: '2026-08-31',
      }

      const result = filterTimeEntries(entries, filters)
      expect(result).toHaveLength(1)
      expect(result[0].entryDate).toBe('2026-08-15')
    })

    it('applies multiple filters together', () => {
      const entries = [
        createTimeEntry({ userId: 'user-1', projectId: 'proj-1', isBillable: true }),
        createTimeEntry({ userId: 'user-1', projectId: 'proj-2', isBillable: false }),
        createTimeEntry({ userId: 'user-2', projectId: 'proj-1', isBillable: true }),
      ]

      const filters: ReportsFilterState = {
        selectedMemberIds: ['user-1'],
        selectedProjectIds: ['proj-1'],
        selectedClientNames: [],
        billableFilter: 'billable',
        dateFrom: '2026-08-01',
        dateTo: '2026-08-31',
      }

      const result = filterTimeEntries(entries, filters)
      expect(result).toHaveLength(1)
      expect(result[0].userId).toBe('user-1')
      expect(result[0].projectId).toBe('proj-1')
      expect(result[0].isBillable).toBe(true)
    })
  })

  describe('calculateSummary', () => {
    it('calculates correct totals', () => {
      const entries = [
        createTimeEntry({ minutesSpent: 60, isBillable: true }),
        createTimeEntry({ minutesSpent: 60, isBillable: true }),
        createTimeEntry({ minutesSpent: 30, isBillable: false }),
      ]

      const summary = calculateSummary(entries)

      expect(summary.totalHours).toBe(2.5)
      expect(summary.billableHours).toBe(2)
      expect(summary.nonBillableHours).toBe(0.5)
      expect(summary.entriesCount).toBe(3)
    })

    it('returns zero when no entries', () => {
      const summary = calculateSummary([])

      expect(summary.totalHours).toBe(0)
      expect(summary.billableHours).toBe(0)
      expect(summary.nonBillableHours).toBe(0)
      expect(summary.entriesCount).toBe(0)
    })
  })

  describe('getDateRangeDefaults', () => {
    it('returns date range for last 30 days', () => {
      const range = getDateRangeDefaults()

      expect(range.dateFrom).toBeTruthy()
      expect(range.dateTo).toBeTruthy()

      // Verify format (YYYY-MM-DD)
      expect(range.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(range.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/)

      // Verify dateFrom is before dateTo
      expect(range.dateFrom < range.dateTo).toBe(true)
    })
  })
})
