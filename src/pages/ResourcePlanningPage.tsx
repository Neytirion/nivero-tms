import { type ConsultantRow, useResourcePlanningController } from './resource-planning/useResourcePlanningController'

function statusBadge(status: ConsultantRow['status']) {
  if (status === 'overbooked') {
    return 'rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 border border-rose-200'
  }
  if (status === 'at-risk') {
    return 'rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200'
  }
  return 'rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200'
}

function statusLabel(status: ConsultantRow['status']) {
  if (status === 'overbooked') return 'Overbooked'
  if (status === 'at-risk') return 'At Risk'
  return 'Available'
}

export function ResourcePlanningPage() {
  const {
    status,
    isLoading,
    shouldBlockByRole,
    weekAnchorDate,
    setWeekAnchorDate,
    weekRange,
    filterStatus,
    setFilterStatus,
    summaryOverbooked,
    summaryAtRisk,
    summaryAvailable,
    visibleRows,
    activeProjectsCount,
    weeklyCapacityHours,
  } = useResourcePlanningController()

  if (shouldBlockByRole) {
    return (
      <div className="space-y-5">
        <section className="page-section bg-[linear-gradient(120deg,rgba(99,102,241,0.08),rgba(14,116,144,0.06))]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Resource Planning
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Consultant Allocation</h2>
          <p className="mt-2 text-sm text-slate-600">
            This module is available only for owner, admin, or manager roles.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="page-section bg-[linear-gradient(120deg,rgba(99,102,241,0.08),rgba(14,116,144,0.06))]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Resource Planning
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Consultant Allocation</h2>
        <p className="mt-2 text-sm text-slate-600">
          View allocation and availability across active projects to avoid overbooking.
        </p>
        <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          {isLoading ? 'Loading allocations...' : status}
        </p>
      </section>

      <section className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Week (for logged hours)
          </span>
          <input
            type="date"
            value={weekAnchorDate}
            onChange={(event) => setWeekAnchorDate(event.target.value)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
          />
        </label>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Week</p>
          <p className="text-sm font-semibold text-slate-800">
            {weekRange.startLabel} - {weekRange.endLabel}
          </p>
          <p className="text-[11px] text-slate-500">{weekRange.isoLabel}</p>
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Filter by status
          </span>
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value as typeof filterStatus)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
          >
            <option value="all">All consultants</option>
            <option value="overbooked">Overbooked only</option>
            <option value="at-risk">At Risk only</option>
            <option value="available">Available only</option>
          </select>
        </label>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <article
          className="cursor-pointer rounded-xl border border-rose-200 bg-rose-50 p-3"
          onClick={() => setFilterStatus(filterStatus === 'overbooked' ? 'all' : 'overbooked')}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-600">Overbooked</p>
          <p className="mt-1 text-2xl font-bold text-rose-800">{summaryOverbooked}</p>
          <p className="mt-0.5 text-xs text-rose-600">&gt; 100% allocation</p>
        </article>

        <article
          className="cursor-pointer rounded-xl border border-amber-200 bg-amber-50 p-3"
          onClick={() => setFilterStatus(filterStatus === 'at-risk' ? 'all' : 'at-risk')}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">At Risk</p>
          <p className="mt-1 text-2xl font-bold text-amber-800">{summaryAtRisk}</p>
          <p className="mt-0.5 text-xs text-amber-600">71-100% allocation</p>
        </article>

        <article
          className="cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50 p-3"
          onClick={() => setFilterStatus(filterStatus === 'available' ? 'all' : 'available')}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Available</p>
          <p className="mt-1 text-2xl font-bold text-emerald-800">{summaryAvailable}</p>
          <p className="mt-0.5 text-xs text-emerald-600">&lt;= 70% allocation</p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Consultant</th>
                <th className="px-4 py-3">Active Projects</th>
                <th className="px-4 py-3">Open Tasks</th>
                <th className="px-4 py-3">Unscheduled</th>
                <th className="px-4 py-3">Allocated</th>
                <th className="px-4 py-3">Logged this week</th>
                <th className="px-4 py-3">Allocation %</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                    Loading allocation data...
                  </td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                    No consultants found
                    {filterStatus !== 'all' ? ` with status "${filterStatus}"` : ' across active projects'}.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr key={row.userId} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{row.name}</p>
                      {row.email ? (
                        <p className="text-[11px] text-slate-500">{row.email}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.projects.map((name) => (
                          <span
                            key={name}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.openTasksCount}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {row.unscheduledTasksCount > 0 ? `+${row.unscheduledTasksCount} unscheduled` : '-'}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {row.allocatedHours}h
                      <span className="ml-1 text-[11px] text-slate-400">/ {weeklyCapacityHours}h cap</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.loggedHoursThisWeek}h</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full transition-all ${
                              row.status === 'overbooked'
                                ? 'bg-rose-500'
                                : row.status === 'at-risk'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, row.allocationPct)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{row.allocationPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={statusBadge(row.status)}>{statusLabel(row.status)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500">
          Allocation = sum of open task estimates with due date in selected week / {weeklyCapacityHours}h capacity.
          Tasks without due date are tracked as unscheduled.
          Logged = time_entries for selected week. Based on {activeProjectsCount} active project(s).
        </div>
      </section>
    </div>
  )
}
