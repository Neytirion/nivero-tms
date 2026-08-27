import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProjectPreview, TaskPreview } from '../../../lib/pm'
import { GlobalTaskTimerProvider, useGlobalTaskTimer } from './GlobalTaskTimerContext'

const mocks = vi.hoisted(() => ({
  createTimeEntry: vi.fn(),
}))

vi.mock('../../../lib/pm', async () => {
  const actual = await vi.importActual<typeof import('../../../lib/pm')>('../../../lib/pm')
  return {
    ...actual,
    createTimeEntry: mocks.createTimeEntry,
  }
})

function createTask(input: Partial<TaskPreview> = {}): TaskPreview {
  return {
    id: 't1',
    work_package_id: null,
    title: 'Task One',
    description: null,
    status: 'todo',
    priority: 'medium',
    assigned_to: 'u1',
    created_by: 'u1',
    estimate_hours: null,
    actual_hours: null,
    blocked_by_task_id: null,
    due_date: null,
    project_id: 'p1',
    created_at: '2026-06-01T00:00:00.000Z',
    is_billable: true,
    ...input,
  }
}

describe('GlobalTaskTimerContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    mocks.createTimeEntry.mockResolvedValue({ id: 'te-1' })
  })

  it('does not start timer for task assigned to another user', () => {
    const setStatus = vi.fn()
    const projects = [{ id: 'p1', name: 'Apollo' } as ProjectPreview]

    const wrapper = ({ children }: { children: ReactNode }) => (
      <GlobalTaskTimerProvider
        projects={projects}
        currentUserId="u1"
        setStatus={setStatus}
      >
        {children}
      </GlobalTaskTimerProvider>
    )

    const { result } = renderHook(() => useGlobalTaskTimer(), { wrapper })

    act(() => {
      result.current.startTimerForTask(createTask({ assigned_to: 'u2' }))
    })

    expect(result.current.activeTask).toBeNull()
    expect(setStatus).toHaveBeenLastCalledWith('You can only start tracking on tasks assigned to you')
  })

  it('blocks starting a second task while another timer is active', () => {
    const setStatus = vi.fn()
    const projects = [{ id: 'p1', name: 'Apollo' } as ProjectPreview]

    const wrapper = ({ children }: { children: ReactNode }) => (
      <GlobalTaskTimerProvider
        projects={projects}
        currentUserId="u1"
        setStatus={setStatus}
      >
        {children}
      </GlobalTaskTimerProvider>
    )

    const { result } = renderHook(() => useGlobalTaskTimer(), { wrapper })

    act(() => {
      result.current.startTimerForTask(createTask({ id: 't1', title: 'Task One' }))
    })

    act(() => {
      result.current.startTimerForTask(createTask({ id: 't2', title: 'Task Two' }))
    })

    expect(result.current.activeTask?.taskId).toBe('t1')
    expect(setStatus).toHaveBeenLastCalledWith('Stop the active timer before starting another task')
  })

  it('saves short timer sessions in seconds without forcing a full minute', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-26T10:00:00.000Z'))

    const setStatus = vi.fn()
    const projects = [{ id: 'p1', name: 'Apollo' } as ProjectPreview]

    const wrapper = ({ children }: { children: ReactNode }) => (
      <GlobalTaskTimerProvider
        projects={projects}
        currentUserId="u1"
        setStatus={setStatus}
      >
        {children}
      </GlobalTaskTimerProvider>
    )

    const { result } = renderHook(() => useGlobalTaskTimer(), { wrapper })

    act(() => {
      result.current.startTimerForTask(createTask({ id: 't-short', title: 'Quick task' }))
    })

    await act(async () => {
      vi.advanceTimersByTime(3200)
      await result.current.stopAndSaveTimer()
    })

    expect(mocks.createTimeEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'p1',
        taskId: 't-short',
        durationSeconds: 3,
      }),
    )

    vi.useRealTimers()
  })

  it('restores active timer state from localStorage after reload', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-26T10:00:00.000Z'))

    const setStatus = vi.fn()
    const projects = [{ id: 'p1', name: 'Apollo' } as ProjectPreview]

    window.localStorage.setItem('nivero:global-task-timer:v1', JSON.stringify({
      activeTask: {
        taskId: 't-restored',
        taskTitle: 'Restored task',
        projectId: 'p1',
        projectName: 'Apollo',
      },
      elapsedBeforeRunSeconds: 120,
      startedAtMs: Date.now() - 30000,
    }))

    const wrapper = ({ children }: { children: ReactNode }) => (
      <GlobalTaskTimerProvider
        projects={projects}
        currentUserId="u1"
        setStatus={setStatus}
      >
        {children}
      </GlobalTaskTimerProvider>
    )

    const { result } = renderHook(() => useGlobalTaskTimer(), { wrapper })

    expect(result.current.activeTask?.taskId).toBe('t-restored')
    expect(result.current.isRunning).toBe(true)
    expect(result.current.elapsedSeconds).toBe(150)
    expect(result.current.elapsedLabel).toBe('00:02:30')

    vi.useRealTimers()
  })

  it('saves timer as unlinked when active task was deleted', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-26T10:00:00.000Z'))

    mocks.createTimeEntry
      .mockRejectedValueOnce(new Error('insert or update on table "time_entries" violates foreign key constraint "time_entries_task_id_fkey"'))
      .mockResolvedValueOnce({ id: 'te-1' })

    const setStatus = vi.fn()
    const projects = [{ id: 'p1', name: 'Apollo' } as ProjectPreview]

    const wrapper = ({ children }: { children: ReactNode }) => (
      <GlobalTaskTimerProvider
        projects={projects}
        currentUserId="u1"
        setStatus={setStatus}
      >
        {children}
      </GlobalTaskTimerProvider>
    )

    const { result } = renderHook(() => useGlobalTaskTimer(), { wrapper })

    act(() => {
      result.current.startTimerForTask(createTask({ id: 't-deleted', title: 'Deleted task' }))
    })

    await act(async () => {
      vi.advanceTimersByTime(3200)
      await result.current.stopAndSaveTimer()
    })

    expect(mocks.createTimeEntry).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        projectId: 'p1',
        taskId: 't-deleted',
      }),
    )
    expect(mocks.createTimeEntry).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        projectId: 'p1',
        taskId: undefined,
      }),
    )
    expect(result.current.activeTask).toBeNull()

    vi.useRealTimers()
  })

  it('saves timer as unlinked when backend returns "Invalid task_id: task not found"', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-26T10:00:00.000Z'))

    mocks.createTimeEntry
      .mockRejectedValueOnce(new Error('Invalid task_id: task not found'))
      .mockResolvedValueOnce({ id: 'te-1' })

    const setStatus = vi.fn()
    const projects = [{ id: 'p1', name: 'Apollo' } as ProjectPreview]

    const wrapper = ({ children }: { children: ReactNode }) => (
      <GlobalTaskTimerProvider
        projects={projects}
        currentUserId="u1"
        setStatus={setStatus}
      >
        {children}
      </GlobalTaskTimerProvider>
    )

    const { result } = renderHook(() => useGlobalTaskTimer(), { wrapper })

    act(() => {
      result.current.startTimerForTask(createTask({ id: 't-missing', title: 'Missing task' }))
    })

    await act(async () => {
      vi.advanceTimersByTime(2200)
      await result.current.stopAndSaveTimer()
    })

    expect(mocks.createTimeEntry).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        projectId: 'p1',
        taskId: 't-missing',
      }),
    )
    expect(mocks.createTimeEntry).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        projectId: 'p1',
        taskId: undefined,
      }),
    )
    expect(result.current.activeTask).toBeNull()

    vi.useRealTimers()
  })

  it('stops active timer when the active task is deleted', () => {
    const setStatus = vi.fn()
    const projects = [{ id: 'p1', name: 'Apollo' } as ProjectPreview]

    const wrapper = ({ children }: { children: ReactNode }) => (
      <GlobalTaskTimerProvider
        projects={projects}
        currentUserId="u1"
        setStatus={setStatus}
      >
        {children}
      </GlobalTaskTimerProvider>
    )

    const { result } = renderHook(() => useGlobalTaskTimer(), { wrapper })

    act(() => {
      result.current.startTimerForTask(createTask({ id: 't-active', title: 'Active task' }))
    })

    expect(result.current.activeTask?.taskId).toBe('t-active')

    act(() => {
      window.dispatchEvent(new CustomEvent('tasks:deleted', { detail: { taskId: 't-active' } }))
    })

    expect(result.current.activeTask).toBeNull()
    expect(result.current.isRunning).toBe(false)
    expect(setStatus).toHaveBeenCalledWith('Active timer stopped because the task was deleted')
  })
})
