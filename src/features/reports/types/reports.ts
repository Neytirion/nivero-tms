export type BillableFilter = 'all' | 'billable' | 'non-billable'

export interface ReportsFilterState {
  selectedMemberIds: string[]
  selectedProjectIds: string[]
  selectedClientNames: string[]
  billableFilter: BillableFilter
  dateFrom: string
  dateTo: string
}

export interface TimeEntryReport {
  id: string
  userId: string
  memberName: string
  projectId: string
  projectName: string
  clientName: string | null
  taskId: string | null
  entryDate: string
  minutesSpent: number
  isBillable: boolean
  startedAt: string | null
  endedAt: string | null
  createdAt: string
}

export interface ReportsSummary {
  totalHours: number
  billableHours: number
  nonBillableHours: number
  entriesCount: number
  averageHourlyValue: number
}
