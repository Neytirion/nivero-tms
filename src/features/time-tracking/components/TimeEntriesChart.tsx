import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { TimeEntryPreview } from '../../../lib/pm'

interface TimeEntriesChartProps {
  entriesByDate: Array<{ date: string; entries: TimeEntryPreview[] }>
}

interface ChartDataPoint {
  date: string
  fullDate: string
  hours: number
  entriesCount: number
}

export function TimeEntriesChart({ entriesByDate }: TimeEntriesChartProps) {
  // Transform data for chart
  const chartData: ChartDataPoint[] = entriesByDate
    .sort((a, b) => a.date.localeCompare(b.date)) // Sort by date ascending for left-to-right view
    .map(({ date, entries }) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: date,
      hours: entries.reduce((sum, entry) => sum + entry.minutes_spent / 60, 0),
      entriesCount: entries.length,
    }))

  if (chartData.length === 0) {
    return null
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-slate-900">Daily Time Distribution</h3>
        <p className="mt-1 text-xs text-slate-600">Hours logged per day</p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 12 }}
            axisLine={{ stroke: '#e2e8f0' }}
            label={{ value: 'Hours', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            } as React.CSSProperties}
            cursor={{ fill: 'rgba(6, 182, 212, 0.1)' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="square"
          />
          <Bar
            dataKey="hours"
            fill="#06b6d4"
            radius={[8, 8, 0, 0]}
            name="Hours Logged"
          />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {chartData.map(({ date, fullDate, hours, entriesCount }) => (
          <div key={fullDate} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-900">{date}</p>
            <p className="mt-1 text-sm font-bold text-cyan-600">{hours.toFixed(1)}h</p>
            <p className="text-xs text-slate-600">{entriesCount} entries</p>
          </div>
        ))}
      </div>
    </section>
  )
}
