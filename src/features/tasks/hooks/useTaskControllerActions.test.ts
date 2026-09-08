import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTaskControllerActions } from './useTaskControllerActions'

const mocks = vi.hoisted(() => ({ createTimeEntry: vi.fn() }))
vi.mock('../../../lib/pm', () => ({ createTimeEntry: mocks.createTimeEntry }))

function input(overrides: Record<string, unknown> = {}) {
  return {
    selectedProjectId: 'p1',
    useEstimates: true,
    hasEstimateVersion: true,
    canSubmit: true,
    taskEstimateHours: '4.5',
    taskDueDate: '2026-09-10',
    taskIsBillable: true,
    projectStartDate: '2026-09-01',
    projectEndDate: '2026-09-30',
    taskTitle: '  Build API  ',
    taskDescription: '  Description  ',
    taskPriority: 'high',
    taskWorkPackageId: 'wp1',
    canAssignAssignee: true,
    currentUserId: 'u1',
    taskAssigneeId: 'u2',
    taskBlockedByTaskId: '',
    reset: vi.fn(),
    addTask: vi.fn(async () => undefined),
    editTask: vi.fn(async () => undefined),
    setStatus: vi.fn(),
    setHasAttemptedSubmit: vi.fn(),
    logTimeTask: { id: 't1', title: 'Build API' },
    setLogTimeTask: vi.fn(),
    reloadCurrentTasks: vi.fn(async () => undefined),
    ...overrides,
  }
}

describe('useTaskControllerActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createTimeEntry.mockResolvedValue({})
  })

  it('normalizes task creation input and resets the form', async () => {
    const state = input()
    const actions = useTaskControllerActions(state as never)

    await expect(actions.createTaskHandler()).resolves.toBe(true)
    expect(state.addTask).toHaveBeenCalledWith({
      title: 'Build API',
      description: 'Description',
      status: 'backlog',
      priority: 'high',
      estimateHours: 4.5,
      workPackageId: 'wp1',
      assignedTo: 'u2',
      blockedByTaskId: undefined,
      dueDate: '2026-09-10',
      isBillable: true,
    })
    expect(state.reset).toHaveBeenCalled()
  })

  it.each([
    [{ selectedProjectId: null }, 'Select a project before creating tasks'],
    [{ canSubmit: false }, 'Task title is required'],
    [{ taskEstimateHours: '-1' }, 'Estimated hours must be a number greater than or equal to 0'],
    [{ taskDueDate: '2026-08-31' }, 'Due date must be within project dates'],
    [{ taskDueDate: '2026-10-01' }, 'Due date must be within project dates'],
  ])('rejects invalid creation state %#', async (override, message) => {
    const state = input(override)
    const actions = useTaskControllerActions(state as never)

    await expect(actions.createTaskHandler()).resolves.toBe(false)
    expect(state.addTask).not.toHaveBeenCalled()
    expect(state.setStatus).toHaveBeenCalledWith(message)
  })

  it('does not expose assignee selection to users without assignment permission', async () => {
    const state = input({ canAssignAssignee: false })
    const actions = useTaskControllerActions(state as never)

    await actions.createTaskHandler()
    expect(state.addTask).toHaveBeenCalledWith(expect.objectContaining({ assignedTo: undefined }))
  })

  it('validates due date edits before mutating the task', async () => {
    const state = input()
    const actions = useTaskControllerActions(state as never)

    await actions.updateTaskDueDateHandler('t1', '2026-10-01')
    expect(state.editTask).not.toHaveBeenCalled()

    await actions.updateTaskDueDateHandler('t1', '2026-09-15')
    expect(state.editTask).toHaveBeenCalledWith('t1', { dueDate: '2026-09-15' })
  })

  it('logs an exact time interval, reloads tasks, and closes the modal', async () => {
    const state = input()
    const actions = useTaskControllerActions(state as never)

    await actions.submitTaskLogTime('09:15', '10:45')

    expect(mocks.createTimeEntry).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 'p1', taskId: 't1', hoursSpent: 1.5, isBillable: true,
    }))
    expect(state.reloadCurrentTasks).toHaveBeenCalled()
    expect(state.setLogTimeTask).toHaveBeenCalledWith(null)
  })

  it('rejects incomplete or reversed time intervals', async () => {
    const state = input()
    const actions = useTaskControllerActions(state as never)

    await actions.submitTaskLogTime('', '10:00')
    await actions.submitTaskLogTime('10:00', '09:00')

    expect(mocks.createTimeEntry).not.toHaveBeenCalled()
    expect(state.setStatus).toHaveBeenCalledWith('Select both start and end time')
    expect(state.setStatus).toHaveBeenCalledWith('End time must be after start time')
  })
})