import type { CompanySpendSummary, ReportProject, ReportsFilterState, TimeEntryReport, ReportsSummary } from '../types/reports'

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

  return {
    totalHours: minutesToHours(totalMinutes),
    billableHours: minutesToHours(billableMinutes),
    nonBillableHours: minutesToHours(nonBillableMinutes),
    entriesCount: entries.length,
  }
}

export function calculateCompanySpend(
  entries: TimeEntryReport[],
  projects: ReportProject[],
): CompanySpendSummary[] {
  const projectById = new Map(projects.map((project) => [project.id, project]))
  const grouped = new Map<string, CompanySpendSummary & { totalSpend: number; hasMissingRate: boolean }>()

  for (const entry of entries) {
    const project = projectById.get(entry.projectId)
    const companyName = project?.customer_name ?? entry.clientName ?? 'No company'
    const current = grouped.get(companyName) ?? {
      companyName,
      totalMinutes: 0,
      spend: 0,
      projectCount: 0,
      totalSpend: 0,
      hasMissingRate: false,
    }

    current.totalMinutes += entry.minutesSpent
    if (project?.hourlyRate == null) {
      current.hasMissingRate = true
    } else {
      current.totalSpend += (entry.minutesSpent / 60) * project.hourlyRate
    }
    grouped.set(companyName, current)
  }

  const projectCounts = new Map<string, Set<string>>()
  for (const entry of entries) {
    const companyName = projectById.get(entry.projectId)?.customer_name ?? entry.clientName ?? 'No company'
    const projectIds = projectCounts.get(companyName) ?? new Set<string>()
    projectIds.add(entry.projectId)
    projectCounts.set(companyName, projectIds)
  }

  return Array.from(grouped.values())
    .map(({ totalSpend, hasMissingRate, ...summary }) => ({
      ...summary,
      spend: hasMissingRate ? null : Math.round(totalSpend * 100) / 100,
      projectCount: projectCounts.get(summary.companyName)?.size ?? 0,
    }))
    .sort((a, b) => (b.spend ?? -1) - (a.spend ?? -1))
}

export function getDateRangeDefaults(): { dateFrom: string; dateTo: string } {
  const today = new Date()
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  return {
    dateFrom: thirtyDaysAgo.toISOString().split('T')[0],
    dateTo: today.toISOString().split('T')[0],
  }
}
