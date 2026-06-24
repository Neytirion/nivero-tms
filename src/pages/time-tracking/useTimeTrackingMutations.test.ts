import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createTimeEntry: vi.fn(),
  updateTimeEntry: vi.fn(),
  deleteTimeEntry: vi.fn(),
}))

vi.mock('../../lib/pm', () => ({
  createTimeEntry: mocks.createTimeEntry,
  updateTimeEntry: mocks.updateTimeEntry,
  deleteTimeEntry: mocks.deleteTimeEntry,
}))

import { useTimeTrackingMutations } from './useTimeTrackingMutations'

describe('useTimeTrackingMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createTimeEntry.mockResolvedValue({ id: 'entry-1' })
    mocks.updateTimeEntry.mockResolvedValue({ id: 'entry-1' })
    mocks.deleteTimeEntry.mockResolvedValue(undefined)
  })

  it('rejects manual submit when task is not selected', async () => {
    const setStatus = vi.fn()
    const refreshAfterSave = vi.fn().mockResolvedValue(undefined)
    const onSuccess = vi.fn()

    const { result } = renderHook(() =>
      useTimeTrackingMutations({
        editingEntryId: null,
        manualDateMin: '2026-06-01',
        manualDateMax: '2026-06-30',
        setStatus,
        refreshAfterSave,
        refreshAfterDelete: vi.fn().mockResolvedValue(undefined),
      }),
    )

    await act(async () => {
      await result.current.submitManualEntry({
        activeProjectId: 'p1',
        manualTaskId: '',
        manualDate: '2026-06-10',
        manualHours: '1',
        manualIsBillable: true,
        manualNotes: 'Worked on docs',
        onSuccess,
      })
    })

    expect(setStatus).toHaveBeenCalledWith('Select a task before logging time')
    expect(mocks.createTimeEntry).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(refreshAfterSave).not.toHaveBeenCalled()
  })

  it('rejects manual submit when hours are not positive', async () => {
    const setStatus = vi.fn()
    const refreshAfterSave = vi.fn().mockResolvedValue(undefined)
    const onSuccess = vi.fn()

    const { result } = renderHook(() =>
      useTimeTrackingMutations({
        editingEntryId: null,
        manualDateMin: '2026-06-01',
        manualDateMax: '2026-06-30',
        setStatus,
        refreshAfterSave,
        refreshAfterDelete: vi.fn().mockResolvedValue(undefined),
      }),
    )

    await act(async () => {
      await result.current.submitManualEntry({
        activeProjectId: 'p1',
        manualTaskId: 't2',
        manualDate: '2026-06-10',
        manualHours: '0',
        manualIsBillable: false,
        manualNotes: 'Worked on docs',
        onSuccess,
      })
    })

    expect(setStatus).toHaveBeenCalledWith('Hours must be greater than 0')
    expect(mocks.createTimeEntry).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(refreshAfterSave).not.toHaveBeenCalled()
  })

  it('creates manual entry and refreshes after a valid submit', async () => {
    const setStatus = vi.fn()
    const refreshAfterSave = vi.fn().mockResolvedValue(undefined)
    const onSuccess = vi.fn()

    const { result } = renderHook(() =>
      useTimeTrackingMutations({
        editingEntryId: null,
        manualDateMin: '2026-06-01',
        manualDateMax: '2026-06-30',
        setStatus,
        refreshAfterSave,
        refreshAfterDelete: vi.fn().mockResolvedValue(undefined),
      }),
    )

    await act(async () => {
      await result.current.submitManualEntry({
        activeProjectId: 'p1',
        manualTaskId: 't2',
        manualDate: '2026-06-10',
        manualHours: '1.5',
        manualIsBillable: false,
        manualNotes: 'Worked on docs',
        onSuccess,
      })
    })

    expect(mocks.createTimeEntry).toHaveBeenCalledWith({
      projectId: 'p1',
      taskId: 't2',
      entryDate: '2026-06-10',
      hoursSpent: 1.5,
      isBillable: false,
      notes: 'Worked on docs',
    })
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(refreshAfterSave).toHaveBeenCalledTimes(1)
    expect(setStatus).toHaveBeenCalledWith('Time entry created')
  })

  it('surfaces save errors and skips refresh when create fails', async () => {
    mocks.createTimeEntry.mockRejectedValue(new Error('db unavailable'))
    const setStatus = vi.fn()
    const refreshAfterSave = vi.fn().mockResolvedValue(undefined)
    const onSuccess = vi.fn()

    const { result } = renderHook(() =>
      useTimeTrackingMutations({
        editingEntryId: null,
        manualDateMin: undefined,
        manualDateMax: undefined,
        setStatus,
        refreshAfterSave,
        refreshAfterDelete: vi.fn().mockResolvedValue(undefined),
      }),
    )

    await act(async () => {
      await result.current.submitManualEntry({
        activeProjectId: 'p1',
        manualTaskId: 't1',
        manualDate: '2026-06-10',
        manualHours: '2',
        manualIsBillable: true,
        manualNotes: 'Worked on API',
        onSuccess,
      })
    })

    expect(setStatus).toHaveBeenCalledWith('Time entry save error: db unavailable')
    expect(onSuccess).not.toHaveBeenCalled()
    expect(refreshAfterSave).not.toHaveBeenCalled()
  })
})