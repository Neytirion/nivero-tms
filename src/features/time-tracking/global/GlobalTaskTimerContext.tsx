import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { createTimeEntry, type ProjectPreview, type TaskPreview } from '../../../lib/pm'

const TIMER_STORAGE_KEY = 'nivero:global-task-timer:v1'

interface PersistedTimerState {
  activeTask: ActiveTimerTask
  elapsedBeforeRunSeconds: number
  startedAtMs: number | null
}

interface HydratedTimerState {
  activeTask: ActiveTimerTask | null
  startedAtMs: number | null
  elapsedBeforeRunSeconds: number
  elapsedSeconds: number
}

interface GlobalTaskTimerProviderProps {
  children: ReactNode
  projects: ProjectPreview[]
  currentUserId?: string | null
  setStatus?: (status: string) => void
  reloadCurrentTasks?: () => Promise<void>
  loadDashboardPreview?: () => Promise<void>
}

interface ActiveTimerTask {
  taskId: string
  taskTitle: string
  projectId: string
  projectName: string
}

interface GlobalTaskTimerContextValue {
  activeTask: ActiveTimerTask | null
  timerTaskId: string | null
  timerProjectId: string | null
  timerProjectName: string | null
  timerTaskTitle: string | null
  elapsedSeconds: number
  elapsedLabel: string
  isRunning: boolean
  isPaused: boolean
  isSaving: boolean
  lastSavedAt: number | null
  startTimerForTask: (task: TaskPreview) => void
  pauseTimer: () => void
  resumeTimer: () => void
  stopAndSaveTimer: () => Promise<void>
  saveManualTime: (hours: number) => Promise<void>
}

const defaultGlobalTaskTimerContext: GlobalTaskTimerContextValue = {
  activeTask: null,
  timerTaskId: null,
  timerProjectId: null,
  timerProjectName: null,
  timerTaskTitle: null,
  elapsedSeconds: 0,
  elapsedLabel: '00:00:00',
  isRunning: false,
  isPaused: false,
  isSaving: false,
  lastSavedAt: null,
  startTimerForTask: () => undefined,
  pauseTimer: () => undefined,
  resumeTimer: () => undefined,
  stopAndSaveTimer: async () => undefined,
  saveManualTime: async () => undefined,
}

function formatElapsedSeconds(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const hh = String(hours).padStart(2, '0')
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

function toEntryDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isValidPersistedTimerState(value: unknown): value is PersistedTimerState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PersistedTimerState>
  const activeTask = candidate.activeTask as Partial<ActiveTimerTask> | undefined

  if (!activeTask) {
    return false
  }

  const hasValidTask =
    typeof activeTask.taskId === 'string' && activeTask.taskId.length > 0 &&
    typeof activeTask.taskTitle === 'string' && activeTask.taskTitle.length > 0 &&
    typeof activeTask.projectId === 'string' && activeTask.projectId.length > 0 &&
    typeof activeTask.projectName === 'string' && activeTask.projectName.length > 0

  const hasValidElapsed =
    typeof candidate.elapsedBeforeRunSeconds === 'number' &&
    Number.isFinite(candidate.elapsedBeforeRunSeconds) &&
    candidate.elapsedBeforeRunSeconds >= 0

  const hasValidStartedAt =
    candidate.startedAtMs === null ||
    (typeof candidate.startedAtMs === 'number' && Number.isFinite(candidate.startedAtMs) && candidate.startedAtMs > 0)

  return hasValidTask && hasValidElapsed && hasValidStartedAt
}

function isMissingTaskReferenceError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  const isForeignKeyTaskError = message.includes('task_id') && message.includes('foreign key')
  const isInvalidTaskIdError = message.includes('invalid task_id')
  const isTaskNotFoundError = message.includes('task not found')

  return isForeignKeyTaskError || isInvalidTaskIdError || isTaskNotFoundError
}

function readHydratedTimerState(): HydratedTimerState {
  if (typeof window === 'undefined') {
    return {
      activeTask: null,
      startedAtMs: null,
      elapsedBeforeRunSeconds: 0,
      elapsedSeconds: 0,
    }
  }

  try {
    const raw = window.localStorage.getItem(TIMER_STORAGE_KEY)
    if (!raw) {
      return {
        activeTask: null,
        startedAtMs: null,
        elapsedBeforeRunSeconds: 0,
        elapsedSeconds: 0,
      }
    }

    const parsed: unknown = JSON.parse(raw)
    if (!isValidPersistedTimerState(parsed)) {
      window.localStorage.removeItem(TIMER_STORAGE_KEY)
      return {
        activeTask: null,
        startedAtMs: null,
        elapsedBeforeRunSeconds: 0,
        elapsedSeconds: 0,
      }
    }

    if (parsed.startedAtMs) {
      const runningSeconds = Math.max(0, Math.floor((Date.now() - parsed.startedAtMs) / 1000))
      return {
        activeTask: parsed.activeTask,
        startedAtMs: parsed.startedAtMs,
        elapsedBeforeRunSeconds: parsed.elapsedBeforeRunSeconds,
        elapsedSeconds: parsed.elapsedBeforeRunSeconds + runningSeconds,
      }
    }

    return {
      activeTask: parsed.activeTask,
      startedAtMs: null,
      elapsedBeforeRunSeconds: parsed.elapsedBeforeRunSeconds,
      elapsedSeconds: parsed.elapsedBeforeRunSeconds,
    }
  } catch {
    window.localStorage.removeItem(TIMER_STORAGE_KEY)
    return {
      activeTask: null,
      startedAtMs: null,
      elapsedBeforeRunSeconds: 0,
      elapsedSeconds: 0,
    }
  }
}

const GlobalTaskTimerContext = createContext<GlobalTaskTimerContextValue>(defaultGlobalTaskTimerContext)

export function GlobalTaskTimerProvider({
  children,
  projects,
  currentUserId = null,
  setStatus = () => undefined,
  reloadCurrentTasks = async () => undefined,
  loadDashboardPreview = async () => undefined,
}: GlobalTaskTimerProviderProps) {
  const [hydratedState] = useState(readHydratedTimerState)
  const [activeTask, setActiveTask] = useState<ActiveTimerTask | null>(hydratedState.activeTask)
  const [startedAtMs, setStartedAtMs] = useState<number | null>(hydratedState.startedAtMs)
  const [elapsedBeforeRunSeconds, setElapsedBeforeRunSeconds] = useState(hydratedState.elapsedBeforeRunSeconds)
  const [elapsedSeconds, setElapsedSeconds] = useState(hydratedState.elapsedSeconds)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)

  useEffect(() => {
    if (!activeTask) {
      window.localStorage.removeItem(TIMER_STORAGE_KEY)
      return
    }

    const payload: PersistedTimerState = {
      activeTask,
      elapsedBeforeRunSeconds,
      startedAtMs,
    }

    window.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(payload))
  }, [activeTask, elapsedBeforeRunSeconds, startedAtMs])

  useEffect(() => {
    if (!startedAtMs) {
      return
    }

    const updateElapsed = () => {
      const runningSeconds = Math.floor((Date.now() - startedAtMs) / 1000)
      setElapsedSeconds(elapsedBeforeRunSeconds + Math.max(0, runningSeconds))
    }

    updateElapsed()

    const intervalId = window.setInterval(() => {
      updateElapsed()
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [elapsedBeforeRunSeconds, startedAtMs])

  const clearTimerState = () => {
    setActiveTask(null)
    setStartedAtMs(null)
    setElapsedBeforeRunSeconds(0)
    setElapsedSeconds(0)
  }

  useEffect(() => {
    const onTaskDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ taskId?: string }>
      const deletedTaskId = customEvent.detail?.taskId
      if (!deletedTaskId || !activeTask) {
        return
      }

      if (activeTask.taskId !== deletedTaskId) {
        return
      }

      clearTimerState()
      setStatus('Active timer stopped because the task was deleted')
    }

    window.addEventListener('tasks:deleted', onTaskDeleted)
    return () => {
      window.removeEventListener('tasks:deleted', onTaskDeleted)
    }
  }, [activeTask, setStatus])

  const elapsedLabel = useMemo(() => formatElapsedSeconds(elapsedSeconds), [elapsedSeconds])

  const startTimerForTask = (task: TaskPreview) => {
    if (!currentUserId) {
      setStatus('Sign in before tracking time')
      return
    }

    if (!task.project_id) {
      setStatus('Task must belong to a project before tracking time')
      return
    }

    if (!task.assigned_to || task.assigned_to !== currentUserId) {
      setStatus('You can only start tracking on tasks assigned to you')
      return
    }

    if (activeTask && (activeTask.taskId !== task.id || activeTask.projectId !== task.project_id)) {
      setStatus('Stop the active timer before starting another task')
      return
    }

    if (activeTask && startedAtMs) {
      setStatus('Timer is already running for this task')
      return
    }

    const linkedProject = projects.find((project) => project.id === task.project_id)
    const projectName = linkedProject?.name ?? 'Project'

    setActiveTask({
      taskId: task.id,
      taskTitle: task.title,
      projectId: task.project_id,
      projectName,
    })

    if (!activeTask) {
      setElapsedBeforeRunSeconds(0)
      setElapsedSeconds(0)
    }

    setStartedAtMs(Date.now())
    setStatus(activeTask ? 'Timer resumed' : `Timer started: ${task.title}`)
  }

  const pauseTimer = () => {
    if (!startedAtMs) {
      return
    }

    const runningSeconds = Math.floor((Date.now() - startedAtMs) / 1000)
    const nextElapsedSeconds = elapsedBeforeRunSeconds + Math.max(0, runningSeconds)
    setElapsedBeforeRunSeconds(nextElapsedSeconds)
    setElapsedSeconds(nextElapsedSeconds)
    setStartedAtMs(null)
    setStatus('Timer paused')
  }

  const resumeTimer = () => {
    if (!activeTask || startedAtMs) {
      return
    }

    setStartedAtMs(Date.now())
    setStatus('Timer resumed')
  }

  const refreshAfterSave = async () => {
    try {
      await Promise.all([reloadCurrentTasks(), loadDashboardPreview()])
    } catch {
      // Keep timer UX responsive even if background refresh fails
    }
  }

  const createTimerEntryWithTaskFallback = async (input: {
    projectId: string
    taskId: string
    entryDate: string
    hoursSpent: number
    durationSeconds?: number
    isBillable: boolean
    startedAt?: string
    endedAt?: string
  }) => {
    try {
      await createTimeEntry(input)
    } catch (error) {
      if (!isMissingTaskReferenceError(error)) {
        throw error
      }

      await createTimeEntry({
        ...input,
        taskId: undefined,
      })

      setStatus('Active task was deleted. Time was saved as unlinked.')
    }
  }

  const stopAndSaveTimer = async () => {
    if (!activeTask || isSaving) {
      return
    }

    const effectiveElapsedSeconds = startedAtMs
      ? elapsedBeforeRunSeconds + Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000))
      : elapsedBeforeRunSeconds

    if (effectiveElapsedSeconds <= 0) {
      setStatus('Timer has no tracked time yet')
      return
    }

    setIsSaving(true)

    const endedAt = new Date()
    const startedAt = new Date(endedAt.getTime() - (effectiveElapsedSeconds * 1000))

    try {
      await createTimerEntryWithTaskFallback({
        projectId: activeTask.projectId,
        taskId: activeTask.taskId,
        entryDate: toEntryDate(),
        hoursSpent: effectiveElapsedSeconds / 3600,
        durationSeconds: effectiveElapsedSeconds,
        isBillable: true,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
      })

      await refreshAfterSave()
      setLastSavedAt(Date.now())
      setStatus(`Timer saved: ${activeTask.taskTitle}`)
      clearTimerState()
    } catch (error) {
      setStatus(error instanceof Error ? `Timer save error: ${error.message}` : 'Timer save error')
    } finally {
      setIsSaving(false)
    }
  }

  const saveManualTime = async (hours: number) => {
    if (!activeTask || isSaving) {
      return
    }

    if (!Number.isFinite(hours) || hours <= 0) {
      setStatus('Manual hours must be greater than 0')
      return
    }

    setIsSaving(true)

    try {
      await createTimerEntryWithTaskFallback({
        projectId: activeTask.projectId,
        taskId: activeTask.taskId,
        entryDate: toEntryDate(),
        hoursSpent: hours,
        isBillable: true,
      })

      await refreshAfterSave()
      setLastSavedAt(Date.now())
      setStatus(`Manual time saved: ${activeTask.taskTitle}`)
    } catch (error) {
      setStatus(error instanceof Error ? `Manual time save error: ${error.message}` : 'Manual time save error')
    } finally {
      setIsSaving(false)
    }
  }

  const value: GlobalTaskTimerContextValue = {
    activeTask,
    timerTaskId: activeTask?.taskId ?? null,
    timerProjectId: activeTask?.projectId ?? null,
    timerProjectName: activeTask?.projectName ?? null,
    timerTaskTitle: activeTask?.taskTitle ?? null,
    elapsedSeconds,
    elapsedLabel,
    isRunning: Boolean(activeTask && startedAtMs),
    isPaused: Boolean(activeTask && !startedAtMs),
    isSaving,
    lastSavedAt,
    startTimerForTask,
    pauseTimer,
    resumeTimer,
    stopAndSaveTimer,
    saveManualTime,
  }

  return <GlobalTaskTimerContext.Provider value={value}>{children}</GlobalTaskTimerContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGlobalTaskTimer() {
  return useContext(GlobalTaskTimerContext)
}
