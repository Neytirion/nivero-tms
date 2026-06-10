import { useWorkspace } from '../features/dashboard/workspace-context.tsx'
import { ConfirmDialog } from '../shared/components'
import { TimeTrackingFilters } from './time-tracking/TimeTrackingFilters'
import { ManualEntryPanel } from './time-tracking/ManualEntryPanel'
import { TimerPanel } from './time-tracking/TimerPanel'
import { MyLogsSection } from './time-tracking/MyLogsSection'
import { WeeklyOverviewSection } from './time-tracking/WeeklyOverviewSection'
import { useTimeTrackingController } from './time-tracking/useTimeTrackingController'

export function TimeTrackingPage() {
  const { projects, selectedProjectId, currentUserId, status, setStatus, isLoading, loadDashboardPreview } = useWorkspace()
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
    timerTaskId,
    timerIsBillable,
    timerNotes,
    timerStartedAt,
    trackedTimerLabel,
    isTimerSaving,
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
    setTimerTaskId,
    setTimerIsBillable,
    setTimerNotes,
    setEntryToDelete,
    submitManualEntry,
    startTimer,
    stopAndSaveTimer,
    cancelTimer,
    cancelEditEntry,
    beginEditEntry,
    deleteEntryHandler,
  } = useTimeTrackingController({
    projects,
    selectedProjectId,
    currentUserId,
    setStatus,
    loadDashboardPreview,
  })

  return (
    <div className="space-y-5">
      <section className="page-section bg-[linear-gradient(120deg,rgba(6,182,212,0.08),rgba(16,185,129,0.08))]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Time Tracking</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Track Work Hours</h2>
        <p className="mt-2 text-sm text-slate-600">
          Manual entries, timer-based tracking, and weekly timesheet overview.
        </p>
        <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{status}</p>
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

        <TimerPanel
          activeProjectId={activeProjectId}
          trackedTimerLabel={trackedTimerLabel}
          timerTaskId={timerTaskId}
          timerIsBillable={timerIsBillable}
          timerNotes={timerNotes}
          timerStartedAt={timerStartedAt}
          isTimerSaving={isTimerSaving}
          projectTasks={projectTasks}
          onTimerTaskIdChange={setTimerTaskId}
          onTimerIsBillableChange={setTimerIsBillable}
          onTimerNotesChange={setTimerNotes}
          onStartTimer={startTimer}
          onStopAndSaveTimer={() => void stopAndSaveTimer()}
          onCancelTimer={cancelTimer}
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
