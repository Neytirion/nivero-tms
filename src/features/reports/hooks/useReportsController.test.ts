import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useReportsController } from './useReportsController'

describe('useReportsController', () => {
  it('initializes with default filter values', () => {
    const { result } = renderHook(() => useReportsController())

    expect(result.current.filters).toBeDefined()
    expect(result.current.filters.billableFilter).toBe('all')
    expect(result.current.filters.selectedMemberIds).toEqual([])
    expect(result.current.filters.selectedProjectIds).toEqual([])
    expect(result.current.filters.selectedClientNames).toEqual([])
  })

  it('provides methods to update filters', () => {
    const { result } = renderHook(() => useReportsController())

    expect(typeof result.current.handleUpdateFilter).toBe('function')
    expect(typeof result.current.handleResetFilters).toBe('function')
  })

  it('returns arrays for unique members, projects, and clients', () => {
    const { result } = renderHook(() => useReportsController())

    expect(Array.isArray(result.current.uniqueMembers)).toBe(true)
    expect(Array.isArray(result.current.projects)).toBe(true)
    expect(Array.isArray(result.current.uniqueClients)).toBe(true)
  })

  it('provides filtered time entries array', () => {
    const { result } = renderHook(() => useReportsController())

    expect(Array.isArray(result.current.timeEntries)).toBe(true)
  })

  it('provides projects list array', () => {
    const { result } = renderHook(() => useReportsController())

    expect(Array.isArray(result.current.projects)).toBe(true)
  })

  it('has loading state flags', () => {
    const { result } = renderHook(() => useReportsController())

    expect(typeof result.current.isLoading).toBe('boolean')
    expect(typeof result.current.isFilterLoading).toBe('boolean')
  })
})
