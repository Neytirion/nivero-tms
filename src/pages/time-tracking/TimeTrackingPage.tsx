import { ConfirmDialog } from '../../shared/components'
import { TimeEntriesFilters } from '../../features/time-tracking/components/TimeEntriesFilters'
import { TimeEntriesGroupedByDay } from '../../features/time-tracking/components/TimeEntriesGroupedByDay'
import { TimeEntriesChart } from '../../features/time-tracking/components/TimeEntriesChart'
import { LogTimeModal } from '../../features/time-tracking/components/LogTimeModal'
import { useTimeEntriesViewer } from '../../features/time-tracking/hooks/useTimeEntriesViewer'
import type { TimeEntryPreview } from '../../lib/pm'
import { useState } from 'react'
import { BarChart3, Clock3, List, Plus } from 'lucide-react'

export function TimeTrackingPage() {
  const {
    entries,
    projects,
    taskLabelById,
    isLoading,
    filters,
    entriesByDate,
    totalHours,
    deletingEntryId,
    error,
    handleUpdateFilter,
    handleResetFilters,
    setDeletingEntryId,
    handleUpdate,
    handleDelete,
    refreshEntries,
  } = useTimeEntriesViewer()

  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isLogTimeOpen, setIsLogTimeOpen] = useState(false)
  const [activeView, setActiveView] = useState<'distribution' | 'logs'>('logs')

  const deletingEntry = deletingEntryId ? entries.find((e) => e.id === deletingEntryId) : null

  const handleSaveEdit = async (updatedEntry: Partial<TimeEntryPreview>) => {
    setIsSavingEdit(true)
    try {
      await handleUpdate(updatedEntry)
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingEntry) return
    await handleDelete(deletingEntry)
  }

  const handleDeleteEntry = (entry: TimeEntryPreview) => {
    setDeletingEntryId(entry.id)
  }

  if (error) {
    return (
      <div className="space-y-5">
        <section className="page-section bg-[linear-gradient(120deg,rgba(239,68,68,0.08),rgba(209,113,113,0.08))]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Time Tracking</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Time Logs</h2>
        </section>

        <section className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-semibold text-red-900">Error loading time entries</p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="page-section bg-[linear-gradient(120deg,rgba(6,182,212,0.08),rgba(16,185,129,0.08))]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Time Tracking</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Time Logs</h2>
            <p className="mt-2 text-sm text-slate-600">
              View and manage your logged time. Filter by date, project, or billable status.
            </p>
          </div>
          <button
            onClick={() => setIsLogTimeOpen(true)}
            className="mt-1 flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <Plus size={16} />
            Log Time
          </button>
        </div>
      </section>

      <TimeEntriesFilters
        filters={filters}
        projects={projects}
        onFilterChange={handleUpdateFilter}
        onReset={handleResetFilters}
      />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-5">
          <div className="flex rounded-lg border border-slate-200 bg-white p-1" role="tablist" aria-label="Time overview">
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'distribution'}
              onClick={() => setActiveView('distribution')}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${activeView === 'distribution' ? 'bg-cyan-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <BarChart3 size={15} />
              Daily Distribution
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'logs'}
              onClick={() => setActiveView('logs')}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${activeView === 'logs' ? 'bg-cyan-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <List size={15} />
              My Time Logs
            </button>
          </div>
          {entriesByDate.length > 0 && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <Clock3 size={15} className="text-cyan-600" />
              <span className="text-xs font-medium text-slate-600">Total Logged Time</span>
              <span className="text-sm font-bold text-slate-900">{totalHours.toFixed(1)}h</span>
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4">
          {activeView === 'distribution' && entriesByDate.length > 0 ? (
            <TimeEntriesChart
              entriesByDate={entriesByDate}
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
            />
          ) : activeView === 'logs' ? (
            <TimeEntriesGroupedByDay
              entriesByDate={entriesByDate}
              allEntries={entries}
              isLoading={isLoading}
              projects={projects}
              taskLabelById={taskLabelById}
              isSaving={isSavingEdit}
              onSave={handleSaveEdit}
              onDelete={handleDeleteEntry}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <p className="text-sm text-slate-600">No time distribution for the selected filters.</p>
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        isOpen={deletingEntryId !== null}
        title="Delete Time Entry"
        description="Are you sure you want to delete this time entry? This action cannot be undone."
        confirmText="Delete"
        tone="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingEntryId(null)}
      />

      <LogTimeModal
        isOpen={isLogTimeOpen}
        projects={projects}
        onClose={() => setIsLogTimeOpen(false)}
        onSaved={refreshEntries}
      />
    </div>
  )
}
