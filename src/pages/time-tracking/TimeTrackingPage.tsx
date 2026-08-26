import { useWorkspace } from '../../features/workspace/workspace-context.tsx'
import { ConfirmDialog } from '../../shared/components'
import { TimeTrackingFilters } from '../../features/time-tracking/components/TimeTrackingFilters'
import { ManualEntryPanel } from '../../features/time-tracking/components/ManualEntryPanel'
import { MyLogsSection } from '../../features/time-tracking/sections/MyLogsSection'
import { WeeklyOverviewSection } from '../../features/time-tracking/sections/WeeklyOverviewSection'
import { useTimeTrackingController } from '../../features/time-tracking/hooks/useTimeTrackingController'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export function TimeTrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { projects, selectedProjectId, currentUserId, setStatus, isLoading, loadDashboardPreview } = useWorkspace()
  const {
    entries,
    isEntriesLoading,
    activeProjectId,
    projectTasks,
    taskLabelById,
    isTaskLabelsLoading,
    editingEntryId,
    entryToDelete,
    manualTaskId,
    manualDate,
    manualDateMin,
    manualDateMax,
    manualHours,
    manualIsBillable,
    manualNotes,
    weekAnchorDate,
    weekRange,
    visibleEntries,
    weeklySummary,
    setActiveProjectId,
    setWeekAnchorDate,
    setManualTaskId,
    setManualDate,
    setManualHours,
    setManualIsBillable,
    setManualNotes,
    setEntryToDelete,
    submitManualEntry,
    cancelEditEntry,
    beginEditEntry,
    deleteEntryHandler,
    resetFilters,
  } = useTimeTrackingController({
    projects,
    selectedProjectId,
    currentUserId,
    setStatus,
    loadDashboardPreview,
  })

  // Reset filters when refresh signal is detected
  useEffect(() => {
    if (searchParams.has('refresh')) {
      resetFilters()
      // Remove the refresh parameter from URL
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('refresh')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, resetFilters, setSearchParams])

  return (
    <div className="space-y-5">
      <section className="page-section bg-[linear-gradient(120deg,rgba(6,182,212,0.08),rgba(16,185,129,0.08))]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Time Tracking</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Track Work Hours</h2>
        <p className="mt-2 text-sm text-slate-600">
          Manual entries and weekly timesheet overview. Active timer is shown globally at the top of the app.
        </p>
      </section>

      <TimeTrackingFilters
        projects={projects}
        activeProjectId={activeProjectId}
        weekAnchorDate={weekAnchorDate}
        weekRangeTitle={weekRange.title}
        onProjectChange={setActiveProjectId}
        onWeekAnchorDateChange={setWeekAnchorDate}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <ManualEntryPanel
          activeProjectId={activeProjectId}
          projectTasks={projectTasks}
          manualTaskId={manualTaskId}
          manualDate={manualDate}
          manualDateMin={manualDateMin}
          manualDateMax={manualDateMax}
          manualHours={manualHours}
          manualIsBillable={manualIsBillable}
          manualNotes={manualNotes}
          editingEntryId={editingEntryId}
          isLoading={isLoading}
          onManualTaskIdChange={setManualTaskId}
          onManualDateChange={setManualDate}
          onManualHoursChange={setManualHours}
          onManualIsBillableChange={setManualIsBillable}
          onManualNotesChange={setManualNotes}
          onSubmit={() => void submitManualEntry()}
        />
      </section>

      <MyLogsSection
        editingEntryId={editingEntryId}
        isEntriesLoading={isEntriesLoading}
        visibleEntries={visibleEntries}
        projects={projects}
        taskLabelById={taskLabelById}
        isTaskLabelsLoading={isTaskLabelsLoading}
        onCancelEdit={cancelEditEntry}
        onBeginEdit={beginEditEntry}
        onRequestDelete={setEntryToDelete}
      />

      <WeeklyOverviewSection
        isEntriesLoading={isEntriesLoading}
        entries={entries}
        projects={projects}
        taskLabelById={taskLabelById}
        isTaskLabelsLoading={isTaskLabelsLoading}
        weeklySummary={weeklySummary}
      />

      <ConfirmDialog
        isOpen={Boolean(entryToDelete)}
        title="Delete time entry"
        description={`Delete the time entry on ${entryToDelete?.entry_date ?? 'this date'}? This will also update the task and allocation totals.`}
        confirmText="Delete entry"
        tone="danger"
        onCancel={() => setEntryToDelete(null)}
        onConfirm={() => (entryToDelete ? deleteEntryHandler(entryToDelete) : Promise.resolve())}
      />
    </div>
  )
}
