import { useEffect, useRef, useState } from 'react'
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
    isRunning,
    isSaving,
    pauseTimer,
    resumeTimer,
    stopAndSaveTimer,
    saveManualTime,
  } = useGlobalTaskTimer()

  const [manualHours, setManualHours] = useState('0')
  const [manualMinutes, setManualMinutes] = useState('30')
  const [isExpanded, setIsExpanded] = useState(false)
  const [showManualForm, setShowManualForm] = useState(false)
  const cardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const setSafeBottom = () => {
      const height = cardRef.current?.offsetHeight ?? 0
      // Add extra visual breathing room between the timer card and floating page actions.
      const safeBottom = height > 0 ? height + 20 : 0
      document.documentElement.style.setProperty('--active-timer-safe-bottom', `${safeBottom}px`)
    }

    setSafeBottom()
    window.addEventListener('resize', setSafeBottom)

    return () => {
      window.removeEventListener('resize', setSafeBottom)
      document.documentElement.style.setProperty('--active-timer-safe-bottom', '0px')
    }
  }, [isExpanded, showManualForm, activeTask])

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

  const toggleExpanded = () => {
    setIsExpanded((value) => {
      if (value) {
        setShowManualForm(false)
      }
      return !value
    })
  }

  return (
    <section className="fixed inset-x-4 bottom-4 z-40 sm:inset-x-auto sm:right-6 sm:w-[380px]">
      <div ref={cardRef} className="rounded-2xl border border-cyan-200 bg-[linear-gradient(130deg,#ecfeff_0%,#f0fdfa_56%,#eff6ff_100%)] px-3.5 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.16)] backdrop-blur">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-800">Active Timer</p>
            <p className="mt-0.5 flex items-center gap-1 truncate text-sm font-semibold text-slate-900">
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
            <p className="mt-1 text-2xl font-bold leading-none text-cyan-900">{elapsedLabel}</p>
          </div>

          <button
            type="button"
            onClick={toggleExpanded}
            className="rounded-lg border border-cyan-300 bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-900 transition hover:bg-cyan-200"
          >
            {isExpanded ? 'Compact' : 'Expand'}
          </button>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2">
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
        </div>

        {isExpanded ? (
          <>
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-cyan-200/60 pt-2.5">
              <button
                type="button"
                onClick={() => setShowManualForm((value) => !value)}
                className="rounded-lg border border-cyan-300 bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-900 transition hover:bg-cyan-200"
              >
                {showManualForm ? 'Hide manual' : 'Add manual'}
              </button>
            </div>

            {showManualForm ? (
              <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
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
          </>
        ) : null}
      </div>
    </section>
  )
}
