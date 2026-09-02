function parseIsoDateToUtcTime(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  return Date.UTC(year, month - 1, day)
}

function getDurationDays(startDate: string, endDate: string): number | null {
  if (!startDate || !endDate) return null
  const startTime = parseIsoDateToUtcTime(startDate)
  const endTime = parseIsoDateToUtcTime(endDate)
  if (startTime === null || endTime === null || endTime < startTime) return null
  const dayInMs = 24 * 60 * 60 * 1000
  return Math.floor((endTime - startTime) / dayInMs) + 1
}

interface DateRangeStepProps {
  projectStartDate: string
  projectEndDate: string
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
}

export function DateRangeStep({
  projectStartDate,
  projectEndDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangeStepProps) {
  const durationDays = getDurationDays(projectStartDate, projectEndDate)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Project Timeline</h2>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Start Date <span className="text-red-500">*</span>
          </span>
          <input
            type="date"
            value={projectStartDate}
            onChange={(event) => onStartDateChange(event.target.value)}
            max={projectEndDate || undefined}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-colors"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            End Date <span className="text-red-500">*</span>
          </span>
          <input
            type="date"
            value={projectEndDate}
            onChange={(event) => onEndDateChange(event.target.value)}
            min={projectStartDate || undefined}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-colors"
          />
        </label>

        {durationDays !== null && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Project Duration:</span> {durationDays} days
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
