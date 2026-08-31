import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { TimeEntryPreview } from '../../../lib/pm'

interface TimeEntriesChartProps {
  entriesByDate: Array<{ date: string; entries: TimeEntryPreview[] }>
  dateFrom: string
  dateTo: string
}

interface ChartDataPoint {
  date: string
  fullDate: string
  hours: number
  entriesCount: number
}

function generateDateRange(dateFrom: string, dateTo: string): string[] {
  const dates: string[] = []
  const current = new Date(dateFrom)
  const end = new Date(dateTo)

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }

  return dates
}

export function TimeEntriesChart({ entriesByDate, dateFrom, dateTo }: TimeEntriesChartProps) {
  // Create a map of entries by date for quick lookup
  const entriesMap = new Map(entriesByDate.map(({ date, entries }) => [date, entries]))

  // Generate full date range and create chart data
  const allDates = generateDateRange(dateFrom, dateTo)
  const chartData: ChartDataPoint[] = allDates
    .map((fullDate) => {
      const entries = entriesMap.get(fullDate) ?? []
      return {
        date: new Date(fullDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate,
        hours: entries.reduce((sum, entry) => sum + entry.minutes_spent / 60, 0),
        entriesCount: entries.length,
      }
    })

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

      {chartData.length <= 14 && (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {chartData.map(({ date, fullDate, hours, entriesCount }) => (
            <div
              key={fullDate}
              className={`rounded-lg border p-3 transition ${
                hours > 0
                  ? 'border-slate-200 bg-white'
                  : 'border-slate-100 bg-slate-50/40'
              }`}
            >
              <p className="text-xs font-semibold text-slate-900">{date}</p>
              <p className={`mt-1 text-sm font-bold ${hours > 0 ? 'text-cyan-600' : 'text-slate-300'}`}>
                {hours.toFixed(1)}h
              </p>
              <p className={`text-xs ${hours > 0 ? 'text-slate-600' : 'text-slate-400'}`}>
                {entriesCount} entries
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
