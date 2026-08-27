import { useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { TimeEntryReport } from '../types/reports'
import { hoursToDisplay, minutesToHours } from '../utils/reports.utils'

interface ReportsChartsProps {
  entries: TimeEntryReport[]
  isLoading: boolean
}

export function ReportsCharts({ entries, isLoading }: ReportsChartsProps) {
  // Hours by project
  const hoursbyProject = useMemo(() => {
    const grouped = entries.reduce(
      (acc, entry) => {
        const existing = acc.find((item) => item.name === entry.projectName)
        if (existing) {
          existing.hours += minutesToHours(entry.minutesSpent)
        } else {
          acc.push({ name: entry.projectName, hours: minutesToHours(entry.minutesSpent) })
        }
        return acc
      },
      [] as Array<{ name: string; hours: number }>,
    )
    return grouped.sort((a, b) => b.hours - a.hours).slice(0, 10) // Top 10
  }, [entries])

  // Hours by member
  const hoursByMember = useMemo(() => {
    const grouped = entries.reduce(
      (acc, entry) => {
        const existing = acc.find((item) => item.name === entry.memberName)
        if (existing) {
          existing.hours += minutesToHours(entry.minutesSpent)
        } else {
          acc.push({ name: entry.memberName, hours: minutesToHours(entry.minutesSpent) })
        }
        return acc
      },
      [] as Array<{ name: string; hours: number }>,
    )
    return grouped.sort((a, b) => b.hours - a.hours)
  }, [entries])

  // Billable vs Non-billable
  const billableData = useMemo(() => {
    let billable = 0
    let nonBillable = 0

    entries.forEach((entry) => {
      const hours = minutesToHours(entry.minutesSpent)
      if (entry.isBillable) {
        billable += hours
      } else {
        nonBillable += hours
      }
    })

    return [
      { name: 'Billable', value: Math.round(billable * 100) / 100 },
      { name: 'Non-billable', value: Math.round(nonBillable * 100) / 100 },
    ]
  }, [entries])

  // Daily trend
  const dailyTrend = useMemo(() => {
    const grouped = entries.reduce(
      (acc, entry) => {
        const existing = acc.find((item) => item.date === entry.entryDate)
        if (existing) {
          existing.hours += minutesToHours(entry.minutesSpent)
        } else {
          acc.push({ date: entry.entryDate, hours: minutesToHours(entry.minutesSpent) })
        }
        return acc
      },
      [] as Array<{ date: string; hours: number }>,
    )
    return grouped.sort((a, b) => a.date.localeCompare(b.date))
  }, [entries])

  if (isLoading) {
    return <div className="text-center py-8 text-slate-600">Loading charts...</div>
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-slate-600">
        No data available for charts. Adjust your filters to see visualizations.
      </div>
    )
  }

  const COLORS = ['#7c3aed', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

  return (
    <div className="grid gap-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Hours by Project</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={hoursbyProject}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={195} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => hoursToDisplay(value as number)} />
            <Bar dataKey="hours" fill="#7c3aed" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Hours by Team Member</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={hoursByMember} margin={{ top: 5, right: 30, left: 150, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis />
            <YAxis />
            <Tooltip formatter={(value) => hoursToDisplay(value as number)} />
            <Bar dataKey="hours" fill="#ec4899" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Billable vs Non-billable</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={billableData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${hoursToDisplay(value)}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {billableData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => hoursToDisplay(value as number)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Daily Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyTrend} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip formatter={(value) => hoursToDisplay(value as number)} />
              <Line type="monotone" dataKey="hours" stroke="#06b6d4" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
