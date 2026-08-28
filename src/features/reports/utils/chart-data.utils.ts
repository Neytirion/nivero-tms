import type { TimeEntryReport } from '../types/reports'

export interface DayChartData {
  date: string
  billable: number
  nonBillable: number
  total: number
}

export interface ProjectChartData {
  name: string
  hours: number
  percentage: number
}

export interface MemberChartData {
  name: string
  hours: number
  percentage: number
}

export function groupByDays(entries: TimeEntryReport[]): DayChartData[] {
  const grouped: Record<string, { billable: number; nonBillable: number }> = {}

  for (const entry of entries) {
    const date = entry.entryDate
    if (!grouped[date]) {
      grouped[date] = { billable: 0, nonBillable: 0 }
    }

    if (entry.isBillable) {
      grouped[date].billable += entry.minutesSpent
    } else {
      grouped[date].nonBillable += entry.minutesSpent
    }
  }

  return Object.entries(grouped)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, { billable, nonBillable }]) => ({
      date,
      billable: Math.round((billable / 60) * 100) / 100,
      nonBillable: Math.round((nonBillable / 60) * 100) / 100,
      total: Math.round(((billable + nonBillable) / 60) * 100) / 100,
    }))
}

export function groupByProjects(entries: TimeEntryReport[]): ProjectChartData[] {
  const grouped: Record<string, number> = {}
  let totalMinutes = 0

  for (const entry of entries) {
    grouped[entry.projectName] = (grouped[entry.projectName] ?? 0) + entry.minutesSpent
    totalMinutes += entry.minutesSpent
  }

  return Object.entries(grouped)
    .map(([name, minutes]) => ({
      name,
      hours: Math.round((minutes / 60) * 100) / 100,
      percentage: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0,
    }))
    .sort((a, b) => b.hours - a.hours)
}

export function groupByMembers(entries: TimeEntryReport[]): MemberChartData[] {
  const grouped: Record<string, number> = {}
  let totalMinutes = 0

  for (const entry of entries) {
    grouped[entry.memberName] = (grouped[entry.memberName] ?? 0) + entry.minutesSpent
    totalMinutes += entry.minutesSpent
  }

  return Object.entries(grouped)
    .map(([name, minutes]) => ({
      name,
      hours: Math.round((minutes / 60) * 100) / 100,
      percentage: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0,
    }))
    .sort((a, b) => b.hours - a.hours)
}
