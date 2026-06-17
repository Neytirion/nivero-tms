import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useProjectForm } from './useProjectForm'

describe('useProjectForm', () => {
  it('requires name and both dates to submit', () => {
    const { result } = renderHook(() => useProjectForm())

    act(() => {
      result.current.setProjectName('Apollo')
    })
    expect(result.current.canSubmit).toBe(false)

    act(() => {
      result.current.setProjectStartDate('2026-06-01')
      result.current.setProjectEndDate('2026-06-30')
    })
    expect(result.current.canSubmit).toBe(true)
  })

  it('reset clears all form values', () => {
    const { result } = renderHook(() => useProjectForm())

    act(() => {
      result.current.setProjectName('Apollo')
      result.current.setProjectCustomer('ACME')
      result.current.setProjectStartDate('2026-06-01')
      result.current.setProjectEndDate('2026-06-30')
      result.current.reset()
    })

    expect(result.current.projectName).toBe('')
    expect(result.current.projectCustomer).toBe('')
    expect(result.current.projectStartDate).toBe('')
    expect(result.current.projectEndDate).toBe('')
    expect(result.current.canSubmit).toBe(false)
  })
})
