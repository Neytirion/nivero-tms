import { useEffect, useMemo, useState } from 'react'

export interface UseTimeTrackingTimerReturn {
  timerTaskId: string
  timerIsBillable: boolean
  timerNotes: string
  timerStartedAt: number | null
  timerElapsedSec: number
  isTimerSaving: boolean
  trackedTimerLabel: string
  setTimerTaskId: (id: string) => void
  setTimerIsBillable: (billable: boolean) => void
  setTimerNotes: (notes: string) => void
  setTimerStartedAt: (timestamp: number | null) => void
  setIsTimerSaving: (saving: boolean) => void
  startTimer: () => void
  stopTimer: () => void
  cancelTimer: () => void
}

/**
 * Manage timer state and elapsed time calculation
 */
export function useTimeTrackingTimer(): UseTimeTrackingTimerReturn {
  const [timerTaskId, setTimerTaskId] = useState('')
  const [timerIsBillable, setTimerIsBillable] = useState(true)
  const [timerNotes, setTimerNotes] = useState('')
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null)
  const [timerElapsedSec, setTimerElapsedSec] = useState(0)
  const [isTimerSaving, setIsTimerSaving] = useState(false)

  // Update elapsed time every second when timer is running
  useEffect(() => {
    if (!timerStartedAt) {
      return
    }

    const intervalId = window.setInterval(() => {
      setTimerElapsedSec(Math.floor((Date.now() - timerStartedAt) / 1000))
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [timerStartedAt])

  const trackedTimerLabel = useMemo(() => {
    const hours = Math.floor(timerElapsedSec / 3600)
    const minutes = Math.floor((timerElapsedSec % 3600) / 60)
    const seconds = timerElapsedSec % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }

    return `${seconds}s`
  }, [timerElapsedSec])

  const startTimer = () => {
    setTimerStartedAt(Date.now())
    setTimerElapsedSec(0)
  }

  const stopTimer = () => {
    // Just stop the timer, don't reset yet (let caller decide when to reset after saving)
    setTimerStartedAt(null)
  }

  const cancelTimer = () => {
    setTimerStartedAt(null)
    setTimerElapsedSec(0)
  }

  return {
    timerTaskId,
    timerIsBillable,
    timerNotes,
    timerStartedAt,
    timerElapsedSec,
    isTimerSaving,
    trackedTimerLabel,
    setTimerTaskId,
    setTimerIsBillable,
    setTimerNotes,
    setTimerStartedAt,
    setIsTimerSaving,
    startTimer,
    stopTimer,
    cancelTimer,
  }
}
