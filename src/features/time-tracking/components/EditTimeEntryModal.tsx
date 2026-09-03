import { useState, useMemo } from 'react'
import { X } from 'lucide-react'
import type { TimeEntryPreview } from '../../../lib/pm'
import { TwentyFourHourInput } from './TwentyFourHourInput'

interface EditTimeEntryModalProps {
  entry: TimeEntryPreview | null
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onSave: (updatedEntry: Partial<TimeEntryPreview>) => Promise<void>
}

export function EditTimeEntryModal({ entry, isOpen, isSaving, onClose, onSave }: EditTimeEntryModalProps) {
  const [formData, setFormData] = useState<{
    minutes_spent: number
    entry_date: string
    started_at: string | null
    ended_at: string | null
  }>({
    minutes_spent: entry?.minutes_spent ?? 0,
    entry_date: entry?.entry_date ?? new Date().toISOString().split('T')[0],
    started_at: entry?.started_at ? entry.started_at.split('T')[1].substring(0, 5) : null,
    ended_at: entry?.ended_at ? entry.ended_at.split('T')[1].substring(0, 5) : null,
  })

  const [error, setError] = useState<string | null>(null)

  // Update form when entry changes
  if (entry && (formData.minutes_spent !== entry.minutes_spent || formData.entry_date !== entry.entry_date)) {
    setFormData({
      minutes_spent: entry.minutes_spent,
      entry_date: entry.entry_date,
      started_at: entry.started_at ? entry.started_at.split('T')[1].substring(0, 5) : null,
      ended_at: entry.ended_at ? entry.ended_at.split('T')[1].substring(0, 5) : null,
    })
  }

  // Calculate duration from time range
  const calculatedDuration = useMemo(() => {
    if (!formData.started_at || !formData.ended_at) return null

    const [startH, startM] = formData.started_at.split(':').map(Number)
    const [endH, endM] = formData.ended_at.split(':').map(Number)
    const startTotalMin = startH * 60 + startM
    const endTotalMin = endH * 60 + endM

    if (endTotalMin <= startTotalMin) return null

    const totalMin = endTotalMin - startTotalMin
    return {
      minutes: totalMin,
      hours: Math.floor(totalMin / 60),
      mins: totalMin % 60,
    }
  }, [formData.started_at, formData.ended_at])

  // When time range changes, update minutes_spent
  const handleTimeChange = (newStarted: string | null, newEnded: string | null) => {
    setFormData((prev) => ({
      ...prev,
      started_at: newStarted,
      ended_at: newEnded,
    }))
    setError(null)
  }

  const handleSave = async () => {
    setError(null)

    if (!formData.started_at || !formData.ended_at) {
      setError('Start and end times are required')
      return
    }

    if (!calculatedDuration) {
      setError('End time must be after start time')
      return
    }

    const finalMinutes = calculatedDuration.minutes

    if (finalMinutes <= 0) {
      setError('Duration must be greater than 0')
      return
    }

    if (!formData.entry_date) {
      setError('Date is required')
      return
    }

    if (!entry) return

    try {
      const startedAt = formData.started_at 
        ? `${formData.entry_date}T${formData.started_at}:00`
        : null
      const endedAt = formData.ended_at
        ? `${formData.entry_date}T${formData.ended_at}:00`
        : null

      await onSave({
        id: entry.id,
        minutes_spent: finalMinutes,
        entry_date: formData.entry_date,
        started_at: startedAt as string | null,
        ended_at: endedAt as string | null,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    }
  }

  if (!isOpen || !entry) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Edit Time Entry</h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-slate-500 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
              type="date"
              value={formData.entry_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, entry_date: e.target.value }))}
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none disabled:bg-slate-100"
            />
          </div>

          {/* Time Range Section */}
          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-3">Time Range</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="start-time" className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                <TwentyFourHourInput
                  id="start-time"
                  value={formData.started_at ?? ''}
                  onChange={(value) => handleTimeChange(value || null, formData.ended_at)}
                  disabled={isSaving}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>
              <div>
                <label htmlFor="end-time" className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                <TwentyFourHourInput
                  id="end-time"
                  value={formData.ended_at ?? ''}
                  onChange={(value) => handleTimeChange(formData.started_at, value || null)}
                  disabled={isSaving}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">Duration is calculated automatically.</p>
          </div>

          {/* Calculated Duration Display */}
          {calculatedDuration && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1">Calculated Duration</p>
              <p className="text-sm font-semibold text-emerald-900">
                {calculatedDuration.hours}h {calculatedDuration.mins}m
              </p>
            </div>
          )}

        </div>

        {/* Buttons */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 rounded-lg border border-cyan-300 bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
