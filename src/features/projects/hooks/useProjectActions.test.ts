import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProjectActions } from './useProjectActions'

const mocks = vi.hoisted(() => ({
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  completeProject: vi.fn(),
  getProjectTasks: vi.fn(),
}))

vi.mock('../../../lib/pm', () => mocks)

function deps(overrides: Record<string, unknown> = {}) {
  return {
    projects: [{ id: 'p1', name: 'Apollo' }, { id: 'p2', name: 'Beacon' }],
    selectedProjectId: 'p1',
    setStatus: vi.fn(),
    setIsLoading: vi.fn(),
    setProjects: vi.fn(),
    setSelectedProjectId: vi.fn(),
    ensureProjectEditable: vi.fn(() => true),
    canManageProject: vi.fn(() => true),
    canDeleteProject: vi.fn(() => true),
    isProjectCompleted: vi.fn(() => false),
    ...overrides,
  }
}

describe('useProjectActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createProject.mockResolvedValue({ id: 'p3', name: 'Created' })
    mocks.updateProject.mockResolvedValue({ id: 'p1', name: 'Renamed' })
    mocks.deleteProject.mockResolvedValue(undefined)
    mocks.completeProject.mockResolvedValue({ id: 'p1', name: 'Apollo', status: 'completed' })
    mocks.getProjectTasks.mockResolvedValue([])
  })

  it('normalizes editable project fields before updating', async () => {
    const input = deps()
    const { result } = renderHook(() => useProjectActions(input as never))

    await act(() => result.current.editProject('p1', {
      name: '  Renamed  ', customerName: 'Acme', budgetAmount: '1250', useEstimates: true,
    }))

    expect(mocks.updateProject).toHaveBeenCalledWith('p1', expect.objectContaining({
      name: 'Renamed', customer_name: 'Acme', budget_amount: 1250, use_estimates: true,
    }))
    expect(input.setIsLoading).toHaveBeenNthCalledWith(1, true)
    expect(input.setIsLoading).toHaveBeenLastCalledWith(false)
  })

  it('blocks edit without permission or a valid name', async () => {
    const denied = deps({ canManageProject: vi.fn(() => false) })
    const deniedHook = renderHook(() => useProjectActions(denied as never))
    await act(() => deniedHook.result.current.editProject('p1', { name: 'Apollo' }))

    const unnamed = deps()
    const unnamedHook = renderHook(() => useProjectActions(unnamed as never))
    await act(() => unnamedHook.result.current.editProject('p1', { name: '  ' }))

    expect(mocks.updateProject).not.toHaveBeenCalled()
    expect(denied.setStatus).toHaveBeenCalledWith(expect.stringContaining('Permission denied'))
    expect(unnamed.setStatus).toHaveBeenCalledWith('Project name is required')
  })

  it('does not complete a project with unfinished tasks', async () => {
    mocks.getProjectTasks.mockResolvedValue([{ id: 't1', status: 'todo' }, { id: 't2', status: 'done' }])
    const input = deps()
    const { result } = renderHook(() => useProjectActions(input as never))

    await act(() => result.current.completeSelectedProject())

    expect(mocks.completeProject).not.toHaveBeenCalled()
    expect(input.setStatus).toHaveBeenCalledWith('Cannot complete project: 1 unfinished task(s) remain')
    expect(input.setIsLoading).toHaveBeenLastCalledWith(false)
  })

  it('completes a project only after reloading and validating all tasks', async () => {
    mocks.getProjectTasks.mockResolvedValue([{ id: 't1', status: 'closed' }, { id: 't2', status: 'completed' }])
    const input = deps()
    const { result } = renderHook(() => useProjectActions(input as never))

    await act(() => result.current.completeSelectedProject())

    expect(mocks.getProjectTasks).toHaveBeenCalledWith('p1')
    expect(mocks.completeProject).toHaveBeenCalledWith('p1')
    expect(input.setProjects).toHaveBeenCalledWith(expect.any(Function))
  })

  it('selects the next available project after deleting the current one', async () => {
    const input = deps()
    const { result } = renderHook(() => useProjectActions(input as never))

    await act(() => result.current.removeProject('p1'))

    expect(mocks.deleteProject).toHaveBeenCalledWith('p1')
    expect(input.setProjects).toHaveBeenCalledWith([{ id: 'p2', name: 'Beacon' }])
    expect(input.setSelectedProjectId).toHaveBeenCalledWith('p2')
  })
})