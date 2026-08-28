import { useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { TimeEntryReport, ReportsSummary } from '../types/reports'
import type { DayChartData, ProjectChartData, MemberChartData } from '../utils/chart-data.utils'
import { groupByDays, groupByProjects, groupByMembers } from '../utils/chart-data.utils'
import { hoursToDisplay } from '../utils/reports.utils'

type ChartMode = 'days' | 'projects' | 'members'
type ChartData = DayChartData | ProjectChartData | MemberChartData

interface ReportsChartsProps {
  entries: TimeEntryReport[]
  summary: ReportsSummary
  isLoading: boolean
}

export function ReportsCharts({ entries, summary, isLoading }: ReportsChartsProps) {
  const [mode, setMode] = useState<ChartMode>('days')

  if (isLoading || entries.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-center py-16">
          <div className="text-sm text-slate-600">
            {isLoading ? 'Loading chart...' : 'No data to display'}
          </div>
        </div>
      </section>
    )
  }

  const modes = [
    { id: 'days' as const, label: '📅 By Day', icon: '📅' },
    { id: 'projects' as const, label: '📊 By Project', icon: '📊' },
    { id: 'members' as const, label: '👥 By Team', icon: '👥' },
  ]

  const dayData = groupByDays(entries)
  const projectData = groupByProjects(entries)
  const memberData = groupByMembers(entries)

  const data: ChartData[] = (mode === 'days' ? dayData : mode === 'projects' ? projectData : memberData) as ChartData[]
  const isLineChart = mode === 'days'

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total Hours</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{hoursToDisplay(summary.totalHours)}</p>
          <p className="mt-1 text-xs text-slate-600">{summary.entriesCount} entries</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-emerald-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Billable Hours</p>
          <p className="mt-2 text-2xl font-bold text-emerald-900">{hoursToDisplay(summary.billableHours)}</p>
          <p className="mt-1 text-xs text-emerald-600">
            {summary.totalHours > 0 ? Math.round((summary.billableHours / summary.totalHours) * 100) : 0}%
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-purple-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-600">Non-billable Hours</p>
          <p className="mt-2 text-2xl font-bold text-purple-900">{hoursToDisplay(summary.nonBillableHours)}</p>
          <p className="mt-1 text-xs text-purple-600">
            {summary.totalHours > 0 ? Math.round(((summary.totalHours - summary.billableHours) / summary.totalHours) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Chart Section */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        {/* Mode Selector */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Reports Analytics</h3>
          <div className="flex gap-2">
            {modes.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  mode === m.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
                title={m.label}
              >
                <span className="hidden sm:inline">{m.label}</span>
                <span className="sm:hidden">{m.icon}</span>
              </button>
            ))}
          </div>
        </div>

      {/* Chart */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {isLineChart ? (
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#64748b' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#64748b' }}
                label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value) => hoursToDisplay(value as number)}
                contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
                labelStyle={{ color: '#1e293b' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line
                type="monotone"
                dataKey="billable"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6 }}
                name="Billable"
              />
              <Line
                type="monotone"
                dataKey="nonBillable"
                stroke="#a855f7"
                strokeWidth={2}
                dot={{ fill: '#a855f7', r: 4 }}
                activeDot={{ r: 6 }}
                name="Non-billable"
              />
            </LineChart>
          ) : (
            <BarChart
              data={data}
              margin={{ top: 5, right: 30, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 12, fill: '#64748b' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                type="number"
                tick={{ fontSize: 12, fill: '#64748b' }}
                label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value) => hoursToDisplay(value as number)}
                contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}
                labelStyle={{ color: '#1e293b' }}
              />
              <Bar
                dataKey="hours"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                name="Hours"
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

        {/* Chart Info */}
        <div className="mt-4 text-xs text-slate-500">
          {mode === 'days' && 'Billable and non-billable hours tracked over time'}
          {mode === 'projects' && `${projectData.length} projects tracked`}
          {mode === 'members' && `${memberData.length} team members tracked`}
        </div>
      </section>
    </div>
  )
}
