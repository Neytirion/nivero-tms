import { useState, useMemo, useEffect } from 'react'
import { X, Clock, Calendar, Briefcase, Tag, DollarSign } from 'lucide-react'
import { getProjectTasks, createTimeEntry } from '../../../lib/pm'
import type { ProjectPreview, TaskPreview } from '../../../lib/pm'
import { TwentyFourHourInput } from './TwentyFourHourInput'
import { localDateTimeToISOString } from '../utils/time-tracking.utils'

interface LogTimeModalProps {
  isOpen: boolean
  projects: ProjectPreview[]
  onClose: () => void
  onSaved: () => void
}

function getDefaultTimes() {
  const now = new Date()
  const end = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const startDate = new Date(now.getTime() - 60 * 60 * 1000)
  const start = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`
  return { start, end }
}

const QUICK_DURATIONS = [
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '4h', minutes: 240 },
  { label: '8h', minutes: 480 },
]

export function LogTimeModal({ isOpen, projects, onClose, onSaved }: LogTimeModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const defaults = getDefaultTimes()

  const [projectId, setProjectId] = useState('')
  const [taskId, setTaskId] = useState('')
  const [date, setDate] = useState(today)
  const [startTime, setStartTime] = useState(defaults.start)
  const [endTime, setEndTime] = useState(defaults.end)
  const [isBillable, setIsBillable] = useState(true)
  const [tasks, setTasks] = useState<TaskPreview[]>([])
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load tasks when project changes
  useEffect(() => {
    if (!projectId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTasks([])
       
      setTaskId('')
      return
    }
     
    setIsLoadingTasks(true)
     
    setTaskId('')
    getProjectTasks(projectId)
      .then(setTasks)
      .catch(() => setTasks([]))
      .finally(() => setIsLoadingTasks(false))
  }, [projectId])

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      const freshDefaults = getDefaultTimes()
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProjectId('')
       
      setTaskId('')
       
      setDate(new Date().toISOString().split('T')[0])
       
      setStartTime(freshDefaults.start)
       
      setEndTime(freshDefaults.end)
       
      setIsBillable(true)
       
      setError(null)
    }
  }, [isOpen])

  const calculatedDuration = useMemo(() => {
    if (!startTime || !endTime) return null
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const startMin = sh * 60 + sm
    const endMin = eh * 60 + em
    if (endMin <= startMin) return null
    const total = endMin - startMin
    return { total, hours: Math.floor(total / 60), mins: total % 60 }
  }, [startTime, endTime])

  const applyQuickDuration = (minutes: number) => {
    const now = new Date()
    const end = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const startDate = new Date(now.getTime() - minutes * 60 * 1000)
    const start = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`
    setStartTime(start)
    setEndTime(end)
    setError(null)
  }

  const handleSave = async () => {
    setError(null)

    if (!projectId) {
      setError('Please select a project')
      return
    }
    if (!date) {
      setError('Please select a date')
      return
    }
    if (!calculatedDuration) {
      setError('End time must be after start time')
      return
    }
    if (calculatedDuration.total <= 0) {
      setError('Duration must be greater than 0')
      return
    }

    setIsSaving(true)
    try {
      await createTimeEntry({
        projectId,
        taskId: taskId || undefined,
        entryDate: date,
        hoursSpent: calculatedDuration.total / 60,
        isBillable,
        startedAt: localDateTimeToISOString(date, startTime),
        endedAt: localDateTimeToISOString(date, endTime),
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save time entry')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              <Clock size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Log Time</h2>
              <p className="text-xs text-white/70">Add a time entry for any project and date</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/20 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Project */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Briefcase size={11} />
              Project
            </label>
            <select
              value={projectId}
              onChange={(e) => { setProjectId(e.target.value); setError(null) }}
              disabled={isSaving}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none disabled:bg-slate-100"
            >
              <option value="">Select a project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Task */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Tag size={11} />
              Task
              <span className="normal-case font-normal text-slate-400">(optional)</span>
            </label>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              disabled={!projectId || isLoadingTasks || isSaving}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none disabled:bg-slate-100"
            >
              <option value="">{isLoadingTasks ? 'Loading tasks…' : projectId ? 'No specific task' : 'Select project first'}</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Calendar size={11} />
              Date
            </label>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => { setDate(e.target.value); setError(null) }}
              disabled={isSaving}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none disabled:bg-slate-100"
            />
          </div>

          {/* Time Range */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Clock size={11} />
              Time Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="mb-1 block text-xs text-slate-500">Start</span>
                <TwentyFourHourInput
                  value={startTime}
                  onChange={(value) => { setStartTime(value); setError(null) }}
                  disabled={isSaving}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>
              <div>
                <span className="mb-1 block text-xs text-slate-500">End</span>
                <TwentyFourHourInput
                  value={endTime}
                  onChange={(value) => { setEndTime(value); setError(null) }}
                  disabled={isSaving}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* Quick duration buttons */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-slate-400">Quick:</span>
              {QUICK_DURATIONS.map(({ label, minutes }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => applyQuickDuration(minutes)}
                  disabled={isSaving}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 disabled:opacity-50"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Calculated Duration */}
          {calculatedDuration ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Duration</span>
                <span className="text-lg font-bold text-emerald-700">
                  {calculatedDuration.hours > 0 && `${calculatedDuration.hours}h `}
                  {calculatedDuration.mins > 0 && `${calculatedDuration.mins}m`}
                  {calculatedDuration.hours === 0 && calculatedDuration.mins === 0 && '0m'}
                </span>
              </div>
            </div>
          ) : (startTime && endTime) ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
              <p className="text-xs text-amber-700">End time must be after start time</p>
            </div>
          ) : null}

          {/* Billable */}
          <button
            type="button"
            onClick={() => setIsBillable((v) => !v)}
            disabled={isSaving}
            className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 transition ${
              isBillable
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-slate-50 text-slate-500'
            }`}
          >
            <DollarSign size={15} />
            <span className="text-sm font-medium">{isBillable ? 'Billable' : 'Non-billable'}</span>
            <span className="ml-auto text-xs opacity-60">Click to toggle</span>
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !projectId || !calculatedDuration}
            className="rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Log Time'}
          </button>
        </div>
      </div>
    </div>
  )
}
