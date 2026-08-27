import type { ReportsFilterState, TimeEntryReport, ReportsSummary } from '../types/reports'

export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100
}

export function hoursToDisplay(hours: number): string {
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)
  
  if (wholeHours === 0 && minutes === 0) {
    return '0m'
  }
  
  if (wholeHours === 0) {
    return `${minutes}m`
  }
  
  if (minutes === 0) {
    return `${wholeHours}h`
  }
  
  return `${wholeHours}h ${minutes}m`
}

export function filterTimeEntries(
  entries: TimeEntryReport[],
  filters: ReportsFilterState,
): TimeEntryReport[] {
  return entries.filter((entry) => {
    // Filter by members
    if (filters.selectedMemberIds.length > 0 && !filters.selectedMemberIds.includes(entry.userId)) {
      return false
    }

    // Filter by projects
    if (filters.selectedProjectIds.length > 0 && !filters.selectedProjectIds.includes(entry.projectId)) {
      return false
    }

    // Filter by clients
    if (
      filters.selectedClientNames.length > 0 &&
      (!entry.clientName || !filters.selectedClientNames.includes(entry.clientName))
    ) {
      return false
    }

    // Filter by billable
    if (filters.billableFilter === 'billable' && !entry.isBillable) {
      return false
    }

    if (filters.billableFilter === 'non-billable' && entry.isBillable) {
      return false
    }

    // Filter by date range
    if (entry.entryDate < filters.dateFrom || entry.entryDate > filters.dateTo) {
      return false
    }

    return true
  })
}

export function calculateSummary(entries: TimeEntryReport[]): ReportsSummary {
  const totalMinutes = entries.reduce((sum, entry) => sum + entry.minutesSpent, 0)
  const billableMinutes = entries.reduce((sum, entry) => (entry.isBillable ? sum + entry.minutesSpent : sum), 0)
  const nonBillableMinutes = totalMinutes - billableMinutes

  // Rough estimate: average billable rate
  const averageHourlyValue = entries.length > 0 ? (totalMinutes / 60) * 75 : 0 // $75/hour default

  return {
    totalHours: minutesToHours(totalMinutes),
    billableHours: minutesToHours(billableMinutes),
    nonBillableHours: minutesToHours(nonBillableMinutes),
    entriesCount: entries.length,
    averageHourlyValue: Math.round(averageHourlyValue),
  }
}

export function getDateRangeDefaults(): { dateFrom: string; dateTo: string } {
  const today = new Date()
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  return {
    dateFrom: thirtyDaysAgo.toISOString().split('T')[0],
    dateTo: today.toISOString().split('T')[0],
  }
}
