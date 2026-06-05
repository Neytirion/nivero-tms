import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useTaskForm } from './useTaskForm'

describe('useTaskForm', () => {
  it('requires title, estimate hours, and work package before submit', () => {
    const { result } = renderHook(() => useTaskForm())

    act(() => {
      result.current.setTaskTitle('Build login page')
      result.current.setTaskEstimateHours('6')
    })

    expect(result.current.canSubmit).toBe(false)

    act(() => {
      result.current.setTaskWorkPackageId('wp-1')
    })

    expect(result.current.canSubmit).toBe(true)
  })

  it('rejects invalid estimate values', () => {
    const { result } = renderHook(() => useTaskForm())

    act(() => {
      result.current.setTaskTitle('Build login page')
      result.current.setTaskWorkPackageId('wp-1')
      result.current.setTaskEstimateHours('-2')
    })

    expect(result.current.canSubmit).toBe(false)
  })

  it('reset clears fields back to defaults', () => {
    const { result } = renderHook(() => useTaskForm())

    act(() => {
      result.current.setTaskTitle('Build login page')
      result.current.setTaskDescription('Create auth form')
      result.current.setTaskPriority('high')
      result.current.setTaskEstimateHours('8')
      result.current.setTaskWorkPackageId('wp-1')
      result.current.setTaskAssigneeId('user-1')
      result.current.setTaskBlockedByTaskId('task-1')
      result.current.setTaskDueDate('2026-06-10')
      result.current.reset()
    })

    expect(result.current.taskTitle).toBe('')
    expect(result.current.taskDescription).toBe('')
    expect(result.current.taskPriority).toBe('medium')
    expect(result.current.taskEstimateHours).toBe('')
    expect(result.current.taskWorkPackageId).toBe('')
    expect(result.current.taskAssigneeId).toBe('')
    expect(result.current.taskBlockedByTaskId).toBe('')
    expect(result.current.taskDueDate).toBe('')
    expect(result.current.canSubmit).toBe(false)
  })
})