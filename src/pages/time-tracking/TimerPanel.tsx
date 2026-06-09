import type { TaskPreview } from '../../lib/pm'

type TimerPanelProps = {
  activeProjectId: string
  trackedTimerLabel: string
  timerTaskId: string
  timerIsBillable: boolean
  timerNotes: string
  timerStartedAt: number | null
  isTimerSaving: boolean
  projectTasks: TaskPreview[]
  onTimerTaskIdChange: (value: string) => void
  onTimerIsBillableChange: (value: boolean) => void
  onTimerNotesChange: (value: string) => void
  onStartTimer: () => void
  onStopAndSaveTimer: () => void
  onCancelTimer: () => void
}

export function TimerPanel({
  activeProjectId,
  trackedTimerLabel,
  timerTaskId,
  timerIsBillable,
  timerNotes,
  timerStartedAt,
  isTimerSaving,
  projectTasks,
  onTimerTaskIdChange,
  onTimerIsBillableChange,
  onTimerNotesChange,
  onStartTimer,
  onStopAndSaveTimer,
  onCancelTimer,
}: TimerPanelProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Timer-based Tracking</h3>
      <p className="mt-1 text-xs text-slate-500">Start timer while working, then save tracked time as an entry.</p>

      <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">Elapsed</p>
        <p className="mt-1 text-2xl font-bold text-cyan-900">{trackedTimerLabel}</p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Task (optional)</span>
          <select
            value={timerTaskId}
            onChange={(event) => onTimerTaskIdChange(event.target.value)}
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
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Billing Type</span>
          <select
            value={timerIsBillable ? 'billable' : 'non-billable'}
            onChange={(event) => onTimerIsBillableChange(event.target.value === 'billable')}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
          >
            <option value="billable">Billable</option>
            <option value="non-billable">Non-billable</option>
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Notes</span>
          <input
            type="text"
            value={timerNotes}
            onChange={(event) => onTimerNotesChange(event.target.value)}
            placeholder="Short work log"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
          />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {!timerStartedAt ? (
          <button
            type="button"
            onClick={onStartTimer}
            disabled={!activeProjectId}
            className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Start timer
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onStopAndSaveTimer}
              disabled={isTimerSaving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isTimerSaving ? 'Saving...' : 'Stop and save'}
            </button>
            <button
              type="button"
              onClick={onCancelTimer}
              disabled={isTimerSaving}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Discard
            </button>
          </>
        )}
      </div>
    </article>
  )
}
