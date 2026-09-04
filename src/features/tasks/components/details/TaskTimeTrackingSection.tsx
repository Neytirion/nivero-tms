import type { TimeEntryPreview } from '../../../../lib/pm'
import { FreeTimeSlots } from '../../../time-tracking/components/FreeTimeSlots'

interface TaskTimeTrackingSectionProps {
  canLogTime: boolean
  isTimerBlockedByExistingLog: boolean
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
  isTimerBlockedByExistingLog,
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">Time tracking</h2>
        {canLogTime ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onStartTimer}
              disabled={isTimerBlockedByExistingLog}
              title={isTimerBlockedByExistingLog ? 'The current time is already covered by another time log' : undefined}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:bg-slate-300"
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
      {isTimerBlockedByExistingLog ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" role="status">
          Timer unavailable: the current time is already covered by another time log.
        </p>
      ) : null}

      <div className="mb-5 grid divide-y divide-slate-100 border-y border-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="py-3 sm:pr-4">
          <p className="text-xs font-medium text-slate-500">Estimate</p>
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
            <p className="mt-1 text-xl font-bold text-slate-900">{estimateDurationLabel}</p>
          )}
        </div>

        <div className="py-3 sm:px-4">
          <p className="text-xs font-medium text-slate-500">Logged</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{actualDurationLabel}</p>
        </div>

        <div className={`py-3 sm:pl-4 ${isOverBudget ? 'text-rose-700' : ''}`}>
          <p className={`text-xs font-medium ${isOverBudget ? 'text-rose-700' : 'text-slate-500'}`}>
            {isOverBudget ? 'Over budget' : 'Remaining'}
          </p>
          <p className={`mt-1 text-xl font-bold ${isOverBudget ? 'text-rose-700' : 'text-slate-900'}`}>
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

      <div className="border-t border-slate-100 pt-4">
        <FreeTimeSlots entries={freeTimeEntries} date={freeTimeDate} />
      </div>
    </section>
  )
}
