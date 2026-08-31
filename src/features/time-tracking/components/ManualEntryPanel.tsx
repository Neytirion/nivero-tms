import type { TaskPreview } from '../../../lib/pm'

type ManualEntryPanelProps = {
  activeProjectId: string
  projectTasks: TaskPreview[]
  manualTaskId: string
  manualDate: string
  manualDateMin?: string
  manualDateMax?: string
  manualHours: string
  manualStartTime: string
  manualEndTime: string
  manualIsBillable: boolean
  editingEntryId: string | null
  isLoading: boolean
  onManualTaskIdChange: (value: string) => void
  onManualDateChange: (value: string) => void
  onManualHoursChange: (value: string) => void
  onManualStartTimeChange: (value: string) => void
  onManualEndTimeChange: (value: string) => void
  onManualIsBillableChange: (value: boolean) => void
  onSubmit: () => void
}

export function ManualEntryPanel({
  activeProjectId,
  projectTasks,
  manualTaskId,
  manualDate,
  manualDateMin,
  manualDateMax,
  manualHours,
  manualStartTime,
  manualEndTime,
  manualIsBillable,
  editingEntryId,
  isLoading,
  onManualTaskIdChange,
  onManualDateChange,
  onManualHoursChange,
  onManualStartTimeChange,
  onManualEndTimeChange,
  onManualIsBillableChange,
  onSubmit,
}: ManualEntryPanelProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Manual Time Entry</h3>
      <p className="mt-1 text-xs text-slate-500">Add hours manually and link them to a project and task.</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Task</span>
          <select
            value={manualTaskId}
            onChange={(event) => onManualTaskIdChange(event.target.value)}
            disabled={!activeProjectId}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="" disabled>Select a task</option>
            {projectTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Date</span>
          <input
            type="date"
            value={manualDate}
            onChange={(event) => onManualDateChange(event.target.value)}
            min={manualDateMin}
            max={manualDateMax}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
          />
          {activeProjectId && (manualDateMin || manualDateMax) ? (
            <p className="mt-1 text-[11px] text-slate-500">
              Allowed range: {manualDateMin ?? '...'} - {manualDateMax ?? '...'}
            </p>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Time spent</span>
          <input
            type="text"
            value={manualHours}
            onChange={(event) => onManualHoursChange(event.target.value)}
            placeholder="e.g. 45m, 1.5, 1:30, 1h 30m"
            aria-label="Time spent"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
          />
          <p className="mt-1 text-[11px] text-slate-500">Accepted: decimal hours, HH:MM, Xm, Xh Ym.</p>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Start Time (HH:MM)</span>
          <input
            type="time"
            value={manualStartTime}
            onChange={(event) => onManualStartTimeChange(event.target.value)}
            aria-label="Start time"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
          />
          <p className="mt-1 text-[11px] text-slate-500">Optional. When work started.</p>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">End Time (HH:MM)</span>
          <input
            type="time"
            value={manualEndTime}
            onChange={(event) => onManualEndTimeChange(event.target.value)}
            aria-label="End time"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
          />
          <p className="mt-1 text-[11px] text-slate-500">Optional. When work ended. Must be after start time.</p>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Billing Type</span>
          <select
            value={manualIsBillable ? 'billable' : 'non-billable'}
            onChange={(event) => onManualIsBillableChange(event.target.value === 'billable')}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
          >
            <option value="billable">Billable</option>
            <option value="non-billable">Non-billable</option>
          </select>
        </label>

      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading || !activeProjectId || !manualTaskId}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {editingEntryId ? 'Update entry' : 'Save manual entry'}
        </button>
      </div>
    </article>
  )
}
