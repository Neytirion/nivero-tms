import { useState, useMemo, useEffect } from 'react'

interface TaskLogTimeModalProps {
  isOpen: boolean
  taskTitle: string
  onClose: () => void
  onSubmit: (startTime: string, endTime: string) => void | Promise<void>
  isSubmitting?: boolean
}

function getDefaultTimes() {
  const now = new Date()
  const endHour = now.getHours()
  const endMin = now.getMinutes()
  const startHour = Math.max(0, endHour - 1)
  const startMin = endMin

  const formatTime = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  return {
    startTime: formatTime(startHour, startMin),
    endTime: formatTime(endHour, endMin),
  }
}

export function TaskLogTimeModal({
  isOpen,
  taskTitle,
  onClose,
  onSubmit,
  isSubmitting = false,
}: TaskLogTimeModalProps) {
  const defaults = getDefaultTimes()
  const [startTime, setStartTime] = useState(defaults.startTime)
  const [endTime, setEndTime] = useState(defaults.endTime)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      const newDefaults = getDefaultTimes()
      setStartTime(newDefaults.startTime)
      setEndTime(newDefaults.endTime)
      setError('')
    }
  }, [isOpen])

  const durationInfo = useMemo(() => {
    if (!startTime || !endTime) return { hours: 0, minutes: 0, totalMinutes: 0, isValid: false }
    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)
    const startTotalMin = startH * 60 + startM
    const endTotalMin = endH * 60 + endM

    if (endTotalMin <= startTotalMin) {
      return { hours: 0, minutes: 0, totalMinutes: 0, isValid: false }
    }

    const totalMinutes = endTotalMin - startTotalMin
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    return { hours, minutes, totalMinutes, isValid: true }
  }, [startTime, endTime])

  if (!isOpen) {
    return null
  }

  const handleSubmit = () => {
    setError('')

    if (!startTime || !endTime) {
      setError('Select both start and end time')
      return
    }

    if (!durationInfo.isValid) {
      setError('End time must be after start time')
      return
    }

    void onSubmit(startTime, endTime)
  }

  const setQuickTime = (minutes: number) => {
    const start = new Date()
    const end = new Date(start.getTime() + minutes * 60000)

    const formatTime = (date: Date) => {
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }

    setStartTime(formatTime(start))
    setEndTime(formatTime(end))
    setError('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close log time modal"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px]"
      />

      <section className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-200 bg-gradient-to-r from-sky-50 to-emerald-50 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Log Time</h2>
          <p className="mt-2 text-sm text-slate-600">{taskTitle}</p>
        </div>

        {/* Content */}
        <div className="space-y-5 p-6">
          {/* Time Inputs */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="start-time" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Start Time
                </label>
                <input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(event) => {
                    setStartTime(event.target.value)
                    setError('')
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div>
                <label htmlFor="end-time" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  End Time
                </label>
                <input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(event) => {
                    setEndTime(event.target.value)
                    setError('')
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            {/* Duration Display */}
            {durationInfo.isValid && (
              <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-sky-50 p-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Logged Duration</p>
                    <div className="flex items-baseline gap-2">
                      {durationInfo.hours > 0 && (
                        <>
                          <span className="text-2xl font-bold text-emerald-700">{durationInfo.hours}</span>
                          <span className="text-sm font-medium text-slate-600">h</span>
                        </>
                      )}
                      {durationInfo.minutes > 0 && (
                        <>
                          <span className={`${durationInfo.hours > 0 ? 'text-lg' : 'text-2xl'} font-bold text-emerald-700`}>
                            {durationInfo.minutes}
                          </span>
                          <span className="text-sm font-medium text-slate-600">m</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-1">Total</p>
                    <p className="text-sm font-semibold text-slate-700">{durationInfo.totalMinutes} min</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="border-t border-slate-200 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Quick Log</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setQuickTime(30)}
                disabled={isSubmitting}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                30 min
              </button>
              <button
                type="button"
                onClick={() => setQuickTime(60)}
                disabled={isSubmitting}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                1 hour
              </button>
              <button
                type="button"
                onClick={() => setQuickTime(120)}
                disabled={isSubmitting}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                2 hours
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg bg-rose-50 p-3">
              <svg className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-rose-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !durationInfo.isValid}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : 'Log Time'}
          </button>
        </div>
      </section>
    </div>
  )
}
