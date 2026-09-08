import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimeTrackingController } from './useTimeTrackingController'

const mocks = vi.hoisted(() => ({
  setActiveProjectId: vi.fn(), setEditingEntryId: vi.fn(), setWeekAnchorDate: vi.fn(), setEntryToDelete: vi.fn(), resetFilters: vi.fn(),
  resetManualForm: vi.fn(), beginEditEntry: vi.fn(), cancelEditEntry: vi.fn(),
  setTimerStartedAt: vi.fn(), setIsTimerSaving: vi.fn(), timerStartRaw: vi.fn(), cancelTimer: vi.fn(),
  submitManualRaw: vi.fn(), startTimerAndSave: vi.fn(),
}))

vi.mock('./useTimeTrackingFilters', () => ({
  useTimeTrackingFilters: () => ({
    activeProjectId: 'p1', editingEntryId: null, weekAnchorDate: '2026-09-09', entryToDelete: null,
    setActiveProjectId: mocks.setActiveProjectId, setEditingEntryId: mocks.setEditingEntryId,
    setWeekAnchorDate: mocks.setWeekAnchorDate, setEntryToDelete: mocks.setEntryToDelete, resetFilters: mocks.resetFilters,
  }),
}))

vi.mock('./useTimeTrackingManualForm', () => ({
  useTimeTrackingManualForm: () => ({
    manualTaskId: 't1', manualDate: '2026-09-10', manualHours: '2', manualStartTime: '09:00', manualEndTime: '11:00', manualIsBillable: true,
    setManualTaskId: vi.fn(), setManualDate: vi.fn(), setManualHours: vi.fn(), setManualStartTime: vi.fn(), setManualEndTime: vi.fn(), setManualIsBillable: vi.fn(),
    resetManualEntryForm: mocks.resetManualForm, beginEditEntry: mocks.beginEditEntry, cancelEditEntry: mocks.cancelEditEntry,
  }),
}))

vi.mock('./useTimeTrackingTimer', () => ({
  useTimeTrackingTimer: () => ({
    timerTaskId: 't1', timerStartedAt: '2026-09-10T09:00:00Z', timerElapsedSec: 3600, isTimerSaving: false, trackedTimerLabel: '01:00:00',
    setTimerTaskId: vi.fn(), setTimerStartedAt: mocks.setTimerStartedAt, setIsTimerSaving: mocks.setIsTimerSaving,
    startTimer: mocks.timerStartRaw, cancelTimer: mocks.cancelTimer,
  }),
}))

vi.mock('./useTimeTrackingActions', () => ({
  useTimeTrackingActions: () => ({
    entries: [
      { id: 'e1', user_id: 'u1', minutes_spent: 120, is_billable: true, entry_date: '2026-09-10' },
      { id: 'e2', user_id: 'u2', minutes_spent: 300, is_billable: true, entry_date: '2026-09-10' },
    ],
    isEntriesLoading: false, projectTasks: [], taskLabelById: {}, isTaskLabelsLoading: false,
    manualDateMin: '2026-09-01', manualDateMax: '2026-09-30', reloadCurrentWeek: vi.fn(),
    submitManualEntry: mocks.submitManualRaw, deleteEntryHandler: vi.fn(), startTimerAndSave: mocks.startTimerAndSave,
  }),
}))

describe('useTimeTrackingController', () => {
  const setStatus = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.submitManualRaw.mockImplementation(async ({ onSuccess }) => onSuccess())
    mocks.startTimerAndSave.mockImplementation(async ({ onSuccess }) => onSuccess())
  })

  it('builds a Monday-Sunday range and filters entries to the current user', () => {
    const { result } = renderHook(() => useTimeTrackingController({
      projects: [], selectedProjectId: 'p1', currentUserId: 'u1', setStatus, loadDashboardPreview: vi.fn(),
    }))

    expect(result.current.weekRange).toMatchObject({ startDate: '2026-09-07', endDate: '2026-09-13' })
    expect(result.current.visibleEntries.map((entry) => entry.id)).toEqual(['e1'])
    expect(result.current.weeklySummary.totalSeconds).toBe(7200)
  })

  it('resets the manual form and anchors its week after successful submit', async () => {
    const { result } = renderHook(() => useTimeTrackingController({
      projects: [], selectedProjectId: 'p1', currentUserId: 'u1', setStatus, loadDashboardPreview: vi.fn(),
    }))

    await act(() => result.current.submitManualEntry())

    expect(mocks.submitManualRaw).toHaveBeenCalledWith(expect.objectContaining({ activeProjectId: 'p1', manualTaskId: 't1', manualHours: '2' }))
    expect(mocks.resetManualForm).toHaveBeenCalled()
    expect(mocks.setWeekAnchorDate).toHaveBeenCalledWith('2026-09-10')
  })

  it('starts the composed timer when a project is active', () => {
    const { result } = renderHook(() => useTimeTrackingController({
      projects: [], selectedProjectId: 'p1', currentUserId: 'u1', setStatus, loadDashboardPreview: vi.fn(),
    }))

    act(() => result.current.startTimer())
    expect(mocks.timerStartRaw).toHaveBeenCalled()
  })

  it('saves and clears a running timer while always releasing saving state', async () => {
    const { result } = renderHook(() => useTimeTrackingController({
      projects: [], selectedProjectId: 'p1', currentUserId: 'u1', setStatus, loadDashboardPreview: vi.fn(),
    }))

    await act(() => result.current.stopAndSaveTimer())

    expect(mocks.setIsTimerSaving).toHaveBeenNthCalledWith(1, true)
    expect(mocks.startTimerAndSave).toHaveBeenCalledWith(expect.objectContaining({ activeProjectId: 'p1', timerTaskId: 't1', elapsedSec: 3600 }))
    expect(mocks.setTimerStartedAt).toHaveBeenCalledWith(null)
    expect(mocks.setIsTimerSaving).toHaveBeenLastCalledWith(false)
  })

  it('releases saving state when timer persistence fails', async () => {
    mocks.startTimerAndSave.mockRejectedValueOnce(new Error('network'))
    const { result } = renderHook(() => useTimeTrackingController({
      projects: [], selectedProjectId: 'p1', currentUserId: 'u1', setStatus, loadDashboardPreview: vi.fn(),
    }))

    await expect(act(() => result.current.stopAndSaveTimer())).rejects.toThrow('network')
    expect(mocks.setIsTimerSaving).toHaveBeenLastCalledWith(false)
  })
})