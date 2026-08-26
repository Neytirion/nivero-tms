import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGlobalTaskTimer } from './GlobalTaskTimerContext'

function normalizeNumberInput(value: string) {
  if (!value.trim()) {
    return 0
  }

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }

  return parsed
}

function clampMinutes(value: number) {
  return Math.min(59, Math.max(0, value))
}

export function GlobalTaskTimerBar() {
  const {
    activeTask,
    elapsedLabel,
    timerIsBillable,
    isRunning,
    isSaving,
    pauseTimer,
    resumeTimer,
    stopAndSaveTimer,
    saveManualTime,
    setTimerIsBillable,
  } = useGlobalTaskTimer()

  const [manualHours, setManualHours] = useState('0')
  const [manualMinutes, setManualMinutes] = useState('30')
  const [showManualForm, setShowManualForm] = useState(false)

  if (!activeTask) {
    return null
  }

  const parsedHours = normalizeNumberInput(manualHours)
  const parsedMinutes = clampMinutes(normalizeNumberInput(manualMinutes))
  const manualDurationHours = parsedHours + (parsedMinutes / 60)
  const isManualDurationValid = manualDurationHours > 0

  const submitManual = async () => {
    await saveManualTime(manualDurationHours)
    setManualHours('0')
    setManualMinutes('30')
  }

  return (
    <section className="sticky top-0 z-30 rounded-2xl border border-cyan-200 bg-[linear-gradient(110deg,#ecfeff_0%,#f0fdfa_50%,#eff6ff_100%)] px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-800">Active Timer</p>
          <p className="flex items-center gap-1 truncate text-sm font-semibold text-slate-900">
            <Link
              to={`/app/projects/${activeTask.projectId}`}
              className="truncate text-cyan-900 underline decoration-cyan-300 underline-offset-2 hover:text-cyan-700"
              title={`Open project: ${activeTask.projectName}`}
            >
              {activeTask.projectName}
            </Link>
            <span aria-hidden="true">•</span>
            <Link
              to={`/app/tasks/${activeTask.taskId}`}
              className="truncate text-slate-900 underline decoration-slate-300 underline-offset-2 hover:text-slate-700"
              title={`Open task: ${activeTask.taskTitle}`}
            >
              {activeTask.taskTitle}
            </Link>
          </p>
          <p className="text-xl font-bold text-cyan-900">{elapsedLabel}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isRunning ? (
            <button
              type="button"
              onClick={pauseTimer}
              disabled={isSaving}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Pause
            </button>
          ) : (
            <button
              type="button"
              onClick={resumeTimer}
              disabled={isSaving}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Resume
            </button>
          )}

          <button
            type="button"
            onClick={() => void stopAndSaveTimer()}
            disabled={isSaving}
            className="rounded-lg bg-cyan-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Stop and save
          </button>

          <button
            type="button"
            onClick={() => setShowManualForm((value) => !value)}
            className="rounded-lg border border-cyan-300 bg-cyan-100 px-3 py-1.5 text-sm font-semibold text-cyan-900 transition hover:bg-cyan-200"
          >
            {showManualForm ? 'Hide manual' : 'Add manual time'}
          </button>
        </div>
      </div>

      <div className="mt-2 flex justify-end">
        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
          <input
            type="checkbox"
            checked={timerIsBillable}
            onChange={(event) => setTimerIsBillable(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-600"
          />
          Billable
        </label>
      </div>

      {showManualForm ? (
        <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Hours</span>
              <input
                type="number"
                min="0"
                step="1"
                value={manualHours}
                onChange={(event) => setManualHours(event.target.value)}
                className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-cyan-600"
                aria-label="Manual hours"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Minutes</span>
              <input
                type="number"
                min="0"
                max="59"
                step="1"
                value={manualMinutes}
                onChange={(event) => setManualMinutes(event.target.value)}
                className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-cyan-600"
                aria-label="Manual minutes"
              />
            </label>

          <button
            type="button"
            onClick={() => void submitManual()}
            disabled={isSaving || !isManualDurationValid}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save manual
          </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500">Quick add:</span>
            {[15, 30, 45, 60].map((minutesPreset) => (
              <button
                key={minutesPreset}
                type="button"
                onClick={() => {
                  setManualHours(String(Math.floor(minutesPreset / 60)))
                  setManualMinutes(String(minutesPreset % 60))
                }}
                className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {minutesPreset} min
              </button>
            ))}
          </div>

          <p className="text-[11px] text-slate-500">Will save: {parsedHours}h {parsedMinutes}m</p>
        </div>
      ) : null}
    </section>
  )
}
