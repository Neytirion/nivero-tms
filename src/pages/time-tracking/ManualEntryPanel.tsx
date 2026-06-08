import type { TaskPreview } from '../../lib/pm'

type ManualEntryPanelProps = {
  activeProjectId: string
  projectTasks: TaskPreview[]
  manualTaskId: string
  manualDate: string
  manualDateMin?: string
  manualDateMax?: string
  manualHours: string
  manualIsBillable: boolean
  manualCategory: string
  manualCategoryOptions: string[]
  manualNotes: string
  editingEntryId: string | null
  isLoading: boolean
  onManualTaskIdChange: (value: string) => void
  onManualDateChange: (value: string) => void
  onManualHoursChange: (value: string) => void
  onManualIsBillableChange: (value: boolean) => void
  onManualCategoryChange: (value: string) => void
  onManualNotesChange: (value: string) => void
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
  manualIsBillable,
  manualCategory,
  manualCategoryOptions,
  manualNotes,
  editingEntryId,
  isLoading,
  onManualTaskIdChange,
  onManualDateChange,
  onManualHoursChange,
  onManualIsBillableChange,
  onManualCategoryChange,
  onManualNotesChange,
  onSubmit,
}: ManualEntryPanelProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Manual Time Entry</h3>
      <p className="mt-1 text-xs text-slate-500">Add hours manually and link them to a project and optional task.</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Task (optional)</span>
          <select
            value={manualTaskId}
            onChange={(event) => onManualTaskIdChange(event.target.value)}
            disabled={!activeProjectId}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="">Unlinked</option>
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
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Hours</span>
          <input
            type="number"
            min="0.25"
            step="0.25"
            value={manualHours}
            onChange={(event) => onManualHoursChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
          />
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

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Category</span>
          <select
            value={manualCategory}
            onChange={(event) => onManualCategoryChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
          >
            {manualCategoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Notes</span>
          <input
            type="text"
            value={manualNotes}
            onChange={(event) => onManualNotesChange(event.target.value)}
            placeholder="What was done"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
          />
        </label>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading || !activeProjectId}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {editingEntryId ? 'Update entry' : 'Save manual entry'}
        </button>
      </div>
    </article>
  )
}
