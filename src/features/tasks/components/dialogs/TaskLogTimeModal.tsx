import { useEffect, useMemo, useState } from 'react'

interface SubmitTimePayload {
  hours: number
  comment: string
  isBillable: boolean
  category: string
  startedAt?: string
  endedAt?: string
}

interface TaskLogTimeModalProps {
  isOpen: boolean
  taskTitle: string
  onClose: () => void
  onSubmit: (payload: SubmitTimePayload) => void | Promise<void>
  isSubmitting?: boolean
}

export function TaskLogTimeModal({
  isOpen,
  taskTitle,
  onClose,
  onSubmit,
  isSubmitting = false,
}: TaskLogTimeModalProps) {
  const [hours, setHours] = useState('1')
  const [comment, setComment] = useState('')
  const [isBillable, setIsBillable] = useState(true)
  const [category, setCategory] = useState('delivery')
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerStartedAt, setTimerStartedAt] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    if (!isTimerRunning || !timerStartedAt) {
      return
    }

    const timerId = window.setInterval(() => {
      const startedAtMs = new Date(timerStartedAt).getTime()
      const nextElapsed = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000))
      setElapsedSeconds(nextElapsed)
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [isTimerRunning, timerStartedAt])

  const timerHours = useMemo(() => Number((elapsedSeconds / 3600).toFixed(2)), [elapsedSeconds])

  const startTimer = () => {
    const startedAt = new Date().toISOString()
    setTimerStartedAt(startedAt)
    setElapsedSeconds(0)
    setIsTimerRunning(true)
  }

  const stopTimer = () => {
    setIsTimerRunning(false)
    setHours(String(timerHours || 0.25))
  }

  const submitPayload = {
    hours: Number(hours) || 0,
    comment,
    isBillable,
    category,
    startedAt: timerStartedAt ?? undefined,
    endedAt: timerStartedAt ? new Date().toISOString() : undefined,
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close log time modal"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
      />

      <section className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-900">Log Time</h2>
        <p className="mt-1 text-sm text-slate-500">Task: {taskTitle}</p>

        <div className="mt-4 space-y-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Hours</span>
            <input
              type="number"
              min="0.25"
              step="0.25"
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              disabled={isTimerRunning}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
          </label>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Timer</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{timerHours.toFixed(2)}h</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={startTimer}
                disabled={isTimerRunning}
                className="rounded-md bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800 hover:bg-cyan-200 disabled:opacity-60"
              >
                Start
              </button>
              <button
                type="button"
                onClick={stopTimer}
                disabled={!isTimerRunning}
                className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
              >
                Stop
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              >
                <option value="delivery">delivery</option>
                <option value="meeting">meeting</option>
                <option value="support">support</option>
                <option value="research">research</option>
                <option value="admin">admin</option>
              </select>
            </label>

            <label className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <input
                type="checkbox"
                checked={isBillable}
                onChange={(event) => setIsBillable(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-cyan-700 focus:ring-cyan-600"
              />
              Billable
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Comment</span>
            <input
              type="text"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Implemented authentication"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onSubmit(submitPayload)}
            disabled={isSubmitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save time
          </button>
        </div>
      </section>
    </div>
  )
}
