import { useState } from 'react'
import { X } from 'lucide-react'
import type { TimeEntryPreview } from '../../../lib/pm'

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

  const handleSave = async () => {
    setError(null)

    if (formData.minutes_spent <= 0) {
      setError('Hours must be greater than 0')
      return
    }

    if (!formData.entry_date) {
      setError('Date is required')
      return
    }

    // Validate time range if both times are provided
    if (formData.started_at && formData.ended_at) {
      if (formData.started_at >= formData.ended_at) {
        setError('End time must be after start time')
        return
      }

      // Validate that duration matches
      const [startHour, startMin] = formData.started_at.split(':').map(Number)
      const [endHour, endMin] = formData.ended_at.split(':').map(Number)
      const startTotalMin = startHour * 60 + startMin
      const endTotalMin = endHour * 60 + endMin
      const durationMin = endTotalMin - startTotalMin
      
      if (Math.abs(durationMin - formData.minutes_spent) > 5) {
        setError(`Duration mismatch: ${formData.minutes_spent} minutes logged but ${durationMin} minutes between start and end time`)
        return
      }
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
        minutes_spent: formData.minutes_spent,
        entry_date: formData.entry_date,
        started_at: startedAt as any,
        ended_at: endedAt as any,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    }
  }

  if (!isOpen || !entry) {
    return null
  }

  const hours = Math.floor(formData.minutes_spent / 60)
  const minutes = formData.minutes_spent % 60

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

          {/* Start Time */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Time (HH:MM)</label>
            <input
              type="time"
              value={formData.started_at ?? ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, started_at: e.target.value || null }))}
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none disabled:bg-slate-100"
            />
            <p className="mt-1 text-xs text-slate-500">Optional. Leave empty to not track specific time range.</p>
          </div>

          {/* End Time */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End Time (HH:MM)</label>
            <input
              type="time"
              value={formData.ended_at ?? ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, ended_at: e.target.value || null }))}
              disabled={isSaving}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none disabled:bg-slate-100"
            />
            <p className="mt-1 text-xs text-slate-500">Optional. Must be after start time if provided.</p>
          </div>

          {/* Hours and Minutes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hours</label>
              <input
                type="number"
                min="0"
                max="24"
                value={hours}
                onChange={(e) => {
                  const h = Math.max(0, parseInt(e.target.value) || 0)
                  setFormData((prev) => ({
                    ...prev,
                    minutes_spent: h * 60 + minutes,
                  }))
                }}
                disabled={isSaving}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Minutes</label>
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => {
                  const m = Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                  setFormData((prev) => ({
                    ...prev,
                    minutes_spent: hours * 60 + m,
                  }))
                }}
                disabled={isSaving}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Total display */}
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-600">Total time: {hours}h {minutes}m ({formData.minutes_spent} minutes)</p>
            {formData.started_at && formData.ended_at && (
              <p className="text-xs text-slate-600 mt-1">Time range: {formData.started_at} - {formData.ended_at}</p>
            )}
          </div>
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
