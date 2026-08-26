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
    ...input,
  }
}

describe('GlobalTaskTimerContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
