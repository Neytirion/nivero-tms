import type { TimeEntryReport, ReportsSummary } from '../types/reports'
import { hoursToDisplay } from '../utils/reports.utils'

interface ReportsTableProps {
  entries: TimeEntryReport[]
  summary: ReportsSummary
  isLoading: boolean
}

export function ReportsTable({ entries, summary, isLoading }: ReportsTableProps) {
  if (isLoading) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-slate-600">Loading entries...</div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
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

        <div className="rounded-lg border border-slate-200 bg-blue-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">Est. Value</p>
          <p className="mt-2 text-2xl font-bold text-blue-900">${summary.averageHourlyValue}</p>
          <p className="mt-1 text-xs text-blue-600">@ $75/hr</p>
        </div>
      </div>

      {/* Table */}
      {entries.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-sm text-slate-600">No entries found for the selected filters</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Date</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Member</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Project</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">Client</th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-600">Duration</th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-600">Type</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-900">
                    {new Date(entry.entryDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900">{entry.memberName}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{entry.projectName}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{entry.clientName || '-'}</td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                    {hoursToDisplay((entry.minutesSpent / 60))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                        entry.isBillable
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {entry.isBillable ? 'Billable' : 'Non-billable'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
