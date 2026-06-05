import { useState } from 'react'

interface TaskLogTimeModalProps {
  isOpen: boolean
  taskTitle: string
  onClose: () => void
  onSubmit: (hours: number, comment: string) => void | Promise<void>
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
          </label>

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
            onClick={() => void onSubmit(Number(hours) || 0, comment)}
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
