import { useState, useMemo } from 'react'

interface TaskLogTimeModalProps {
  isOpen: boolean
  taskTitle: string
  onClose: () => void
  onSubmit: (startTime: string, endTime: string) => void | Promise<void>
  isSubmitting?: boolean
}

export function TaskLogTimeModal({
  isOpen,
  taskTitle,
  onClose,
  onSubmit,
  isSubmitting = false,
}: TaskLogTimeModalProps) {
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [error, setError] = useState('')

  const durationHours = useMemo(() => {
    if (!startTime || !endTime) return 0
    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)
    const startTotalMin = startH * 60 + startM
    const endTotalMin = endH * 60 + endM
    
    if (endTotalMin <= startTotalMin) {
      return 0
    }
    
    return (endTotalMin - startTotalMin) / 60
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
    
    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)
    const startTotalMin = startH * 60 + startM
    const endTotalMin = endH * 60 + endM
    
    if (endTotalMin <= startTotalMin) {
      setError('End time must be after start time')
      return
    }
    
    void onSubmit(startTime, endTime)
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

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Start Time</span>
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">End Time</span>
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              />
            </label>
          </div>

          {durationHours > 0 && (
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <p className="text-sm text-slate-600">
                Duration: <span className="font-semibold text-slate-900">{durationHours.toFixed(2)}h</span>
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-rose-50 px-3 py-2">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}
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
            onClick={handleSubmit}
            disabled={isSubmitting || durationHours <= 0}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save time
          </button>
        </div>
      </section>
    </div>
  )
}
