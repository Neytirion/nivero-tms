import { useMemo } from 'react'
import { ReportsFilters, ReportsTable, ReportsCharts } from '../../features/reports/components'
import { useReportsController } from '../../features/reports/hooks/useReportsController'
import { calculateSummary } from '../../features/reports/utils/reports.utils'

export function ReportsPage() {
  const {
    isLoading,
    isFilterLoading,
    timeEntries,
    projects,
    filters,
    error,
    uniqueMembers,
    uniqueClients,
    handleUpdateFilter,
    handleResetFilters,
  } = useReportsController()

  const summary = useMemo(() => calculateSummary(timeEntries), [timeEntries])

  if (error) {
    return (
      <div className="space-y-5">
        <section className="page-section bg-[linear-gradient(120deg,rgba(239,68,68,0.08),rgba(209,113,113,0.08))]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Reports</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Time Tracking Reports</h2>
        </section>

        <section className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-900">Error loading data</p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="page-section bg-[linear-gradient(120deg,rgba(6,182,212,0.08),rgba(16,185,129,0.08))]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Reports</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Time Tracking Reports</h2>
        <p className="mt-2 text-sm text-slate-600">
          Analyze logged time across members, projects, and clients with flexible filtering.
        </p>
      </section>

      <ReportsFilters
        filters={filters}
        isLoading={isLoading || isFilterLoading}
        projects={projects}
        uniqueMembers={uniqueMembers}
        uniqueClients={uniqueClients}
        onFilterChange={handleUpdateFilter}
        onReset={handleResetFilters}
      />

      <ReportsCharts entries={timeEntries} isLoading={isFilterLoading} />

      <ReportsTable entries={timeEntries} summary={summary} isLoading={isFilterLoading} />
    </div>
  )
}
