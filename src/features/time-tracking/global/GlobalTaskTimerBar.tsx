import { useState } from 'react'
import { useGlobalTaskTimer } from './GlobalTaskTimerContext'

export function GlobalTaskTimerBar() {
  const {
    activeTask,
    elapsedLabel,
    timerNotes,
    timerIsBillable,
    isRunning,
    isSaving,
    pauseTimer,
    resumeTimer,
    stopAndSaveTimer,
    saveManualTime,
    setTimerNotes,
    setTimerIsBillable,
  } = useGlobalTaskTimer()

  const [manualHours, setManualHours] = useState('0.5')
  const [manualNotes, setManualNotes] = useState('')
  const [showManualForm, setShowManualForm] = useState(false)

  if (!activeTask) {
    return null
  }

  const submitManual = async () => {
    const hours = Number.parseFloat(manualHours)
    await saveManualTime(hours, manualNotes || timerNotes)
    setManualNotes('')
    setManualHours('0.5')
  }

  return (
    <section className="sticky top-0 z-30 rounded-2xl border border-cyan-200 bg-[linear-gradient(110deg,#ecfeff_0%,#f0fdfa_50%,#eff6ff_100%)] px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-800">Active Timer</p>
          <p className="truncate text-sm font-semibold text-slate-900">
            {activeTask.projectName} • {activeTask.taskTitle}
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

      <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
        <input
          type="text"
          value={timerNotes}
          onChange={(event) => setTimerNotes(event.target.value)}
          placeholder="What are you working on?"
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-600"
        />
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
        <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[120px_minmax(0,1fr)_auto] md:items-center">
          <input
            type="number"
            min="0.25"
            step="0.25"
            value={manualHours}
            onChange={(event) => setManualHours(event.target.value)}
            className="h-9 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-cyan-600"
            aria-label="Manual hours"
          />
          <input
            type="text"
            value={manualNotes}
            onChange={(event) => setManualNotes(event.target.value)}
            placeholder="Optional manual note"
            className="h-9 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-600"
            aria-label="Manual notes"
          />
          <button
            type="button"
            onClick={() => void submitManual()}
            disabled={isSaving}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save manual
          </button>
        </div>
      ) : null}
    </section>
  )
}
