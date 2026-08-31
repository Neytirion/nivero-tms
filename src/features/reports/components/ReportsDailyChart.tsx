import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { DayChartData } from '../utils/chart-data.utils'

interface ReportsDailyChartProps {
  data: DayChartData[]
  dateFrom: string
  dateTo: string
}

interface ChartDataPoint {
  date: string
  fullDate: string
  billable: number
  nonBillable: number
  total: number
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

export function ReportsDailyChart({ data, dateFrom, dateTo }: ReportsDailyChartProps) {
  // Create a map of entries by date for quick lookup
  const dataMap = new Map(data.map(({ date, billable, nonBillable, total }) => [date, { billable, nonBillable, total }]))

  // Generate full date range and create chart data
  const allDates = generateDateRange(dateFrom, dateTo)
  const chartData: ChartDataPoint[] = allDates.map((fullDate) => {
    const entry = dataMap.get(fullDate) ?? { billable: 0, nonBillable: 0, total: 0 }
    return {
      date: new Date(fullDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate,
      billable: entry.billable,
      nonBillable: entry.nonBillable,
      total: entry.total,
    }
  })

  if (chartData.length === 0) return null

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-slate-900">Daily Distribution</h3>
        <p className="mt-1 text-xs text-slate-600">Billable and non-billable hours per day</p>
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
            formatter={(value) => {
              if (typeof value === 'number') {
                return value.toFixed(2)
              }
              return value
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Bar dataKey="billable" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} name="Billable" />
          <Bar dataKey="nonBillable" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} name="Non-billable" />
        </BarChart>
      </ResponsiveContainer>

      {chartData.length <= 14 && (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {chartData.map(({ date, fullDate, billable, nonBillable, total }) => (
            <div
              key={fullDate}
              className={`rounded-lg border p-3 transition ${
                total > 0
                  ? 'border-slate-200 bg-white'
                  : 'border-slate-100 bg-slate-50/40'
              }`}
            >
              <p className="text-xs font-semibold text-slate-900">{date}</p>
              <div className="mt-1.5 space-y-1">
                {billable > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-600 font-medium">Billable</span>
                    <span className="text-xs font-bold text-emerald-700">{billable.toFixed(1)}h</span>
                  </div>
                )}
                {nonBillable > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-purple-600 font-medium">Non-bill</span>
                    <span className="text-xs font-bold text-purple-700">{nonBillable.toFixed(1)}h</span>
                  </div>
                )}
                {total === 0 && (
                  <p className="text-xs text-slate-400">—</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
