import type { TimeEntryPreview } from '../../../../lib/pm'
import { FreeTimeSlots } from '../../../time-tracking/components/FreeTimeSlots'

interface TaskTimeTrackingSectionProps {
  canLogTime: boolean
  canEditEstimateHours: boolean
  isTaskEditing: boolean
  isCurrentTaskInTimer: boolean
  isGlobalTimerRunning: boolean
  estimateHoursDraft: string
  setEstimateHoursDraft: (v: string) => void
  estimateDurationLabel: string
  actualDurationLabel: string
  remainingDurationLabel: string
  overBudgetDurationLabel: string
  estimateHours: number
  isOverBudget: boolean
  progressPct: number
  onStartTimer: () => void
  onOpenLogTimeModal: () => void
  freeTimeEntries: TimeEntryPreview[]
  freeTimeDate: string
}

export function TaskTimeTrackingSection({
  canLogTime,
  canEditEstimateHours,
  isTaskEditing,
  isCurrentTaskInTimer,
  isGlobalTimerRunning,
  estimateHoursDraft,
  setEstimateHoursDraft,
  estimateDurationLabel,
  actualDurationLabel,
  remainingDurationLabel,
  overBudgetDurationLabel,
  estimateHours,
  isOverBudget,
  progressPct,
  onStartTimer,
  onOpenLogTimeModal,
  freeTimeEntries,
  freeTimeDate,
}: TaskTimeTrackingSectionProps) {
  const timerLabel = isCurrentTaskInTimer && isGlobalTimerRunning
    ? 'Timer running'
    : isCurrentTaskInTimer
      ? 'Resume timer'
      : 'Start timer'

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-sm font-semibold text-slate-900">Time Tracking</h2>
        {canLogTime ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onStartTimer}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              {timerLabel}
            </button>
            <button
              type="button"
              onClick={onOpenLogTimeModal}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Log time
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Estimate</p>
          {canEditEstimateHours && isTaskEditing ? (
            <div className="mt-2 flex items-center gap-2">
              <label htmlFor="task-estimate-hours" className="sr-only">Estimate hours</label>
              <input
                id="task-estimate-hours"
                type="number"
                min={0}
                step={0.25}
                inputMode="decimal"
                value={estimateHoursDraft}
                onChange={(event) => setEstimateHoursDraft(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
              />
              <span className="text-sm text-slate-500">h</span>
            </div>
          ) : (
            <p className="mt-2 text-2xl font-bold text-slate-900">{estimateDurationLabel}</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Logged</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{actualDurationLabel}</p>
        </div>

        <div className={`rounded-xl border p-4 ${isOverBudget ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wide ${isOverBudget ? 'text-rose-700' : 'text-slate-600'}`}>
            {isOverBudget ? 'Over budget' : 'Remaining'}
          </p>
          <p className={`mt-2 text-2xl font-bold ${isOverBudget ? 'text-rose-700' : 'text-slate-900'}`}>
            {isOverBudget ? `+${overBudgetDurationLabel}` : remainingDurationLabel}
          </p>
        </div>
      </div>

      {estimateHours > 0 ? (
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
            <span>Progress</span>
            <span className="font-semibold">{progressPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200">
            <div
              className={`h-2 rounded-full transition-all ${isOverBudget ? 'bg-rose-500' : 'bg-sky-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      ) : null}

      <FreeTimeSlots entries={freeTimeEntries} date={freeTimeDate} />
    </section>
  )
}
