import { useState, useMemo } from 'react'
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
    manualHours: string
    manualMinutes: string
  }>({
    minutes_spent: entry?.minutes_spent ?? 0,
    entry_date: entry?.entry_date ?? new Date().toISOString().split('T')[0],
    started_at: entry?.started_at ? entry.started_at.split('T')[1].substring(0, 5) : null,
    ended_at: entry?.ended_at ? entry.ended_at.split('T')[1].substring(0, 5) : null,
    manualHours: '',
    manualMinutes: '',
  })

  const [error, setError] = useState<string | null>(null)

  // Update form when entry changes
  if (entry && (formData.minutes_spent !== entry.minutes_spent || formData.entry_date !== entry.entry_date)) {
    const hours = Math.floor(entry.minutes_spent / 60)
    const minutes = entry.minutes_spent % 60
    setFormData({
      minutes_spent: entry.minutes_spent,
      entry_date: entry.entry_date,
      started_at: entry.started_at ? entry.started_at.split('T')[1].substring(0, 5) : null,
      ended_at: entry.ended_at ? entry.ended_at.split('T')[1].substring(0, 5) : null,
      manualHours: String(hours),
      manualMinutes: String(minutes),
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

  const handleManualTimeChange = (newHours: string, newMinutes: string) => {
    setFormData((prev) => ({
      ...prev,
      manualHours: newHours,
      manualMinutes: newMinutes,
    }))
    setError(null)
  }

  const handleSave = async () => {
    setError(null)

    // Determine which duration to use
    let finalMinutes: number
    
    if (formData.started_at && formData.ended_at) {
      // Use calculated duration from time range
      if (!calculatedDuration) {
        setError('End time must be after start time')
        return
      }
      finalMinutes = calculatedDuration.minutes
    } else if (formData.manualHours || formData.manualMinutes) {
      // Use manually entered duration
      const h = parseInt(formData.manualHours, 10) || 0
      const m = parseInt(formData.manualMinutes, 10) || 0
      finalMinutes = h * 60 + m
    } else {
      setError('Please set time range or enter hours/minutes manually')
      return
    }

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
                <input
                  id="start-time"
                  type="time"
                  value={formData.started_at ?? ''}
                  onChange={(e) => handleTimeChange(e.target.value || null, formData.ended_at)}
                  disabled={isSaving}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>
              <div>
                <label htmlFor="end-time" className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                <input
                  id="end-time"
                  type="time"
                  value={formData.ended_at ?? ''}
                  onChange={(e) => handleTimeChange(formData.started_at, e.target.value || null)}
                  disabled={isSaving}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">Optional. Duration will be calculated automatically.</p>
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

          {/* Manual Entry Section (show only if no time range) */}
          {!calculatedDuration && (
            <div className="border-t border-slate-200 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-3">Manual Duration</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="manual-hours" className="block text-sm font-medium text-slate-700 mb-1">Hours</label>
                  <input
                    id="manual-hours"
                    type="number"
                    min="0"
                    max="24"
                    value={formData.manualHours}
                    onChange={(e) => handleManualTimeChange(e.target.value, formData.manualMinutes)}
                    disabled={isSaving}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label htmlFor="manual-minutes" className="block text-sm font-medium text-slate-700 mb-1">Minutes</label>
                  <input
                    id="manual-minutes"
                    type="number"
                    min="0"
                    max="59"
                    value={formData.manualMinutes}
                    onChange={(e) => handleManualTimeChange(formData.manualHours, e.target.value)}
                    disabled={isSaving}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none disabled:bg-slate-100"
                  />
                </div>
              </div>
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
