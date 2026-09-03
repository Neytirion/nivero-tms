import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TimeTrackingPage } from './TimeTrackingPage'

const { mockUseTimeEntriesViewer } = vi.hoisted(() => ({
  mockUseTimeEntriesViewer: vi.fn(),
}))

vi.mock('../../features/time-tracking/hooks/useTimeEntriesViewer', () => ({
  useTimeEntriesViewer: mockUseTimeEntriesViewer,
}))

beforeEach(() => {
  mockUseTimeEntriesViewer.mockReturnValue({
    entries: [],
    projects: [],
    taskLabelById: {},
    isLoading: false,
    filters: {
      dateFrom: '2026-08-24',
      dateTo: '2026-08-31',
      selectedProjectIds: [],
      billableFilter: 'all' as const,
    },
    entriesByDate: [],
    totalHours: 0,
    editingEntryId: null,
    deletingEntryId: null,
    error: null,
    handleUpdateFilter: vi.fn(),
    handleResetFilters: vi.fn(),
    setEditingEntryId: vi.fn(),
    setDeletingEntryId: vi.fn(),
    handleUpdate: vi.fn(),
    handleDelete: vi.fn(),
    refreshEntries: vi.fn(),
  })
})

describe('TimeTrackingPage', () => {
  it('renders time logs page with filters', () => {
    render(
      <MemoryRouter>
        <TimeTrackingPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Time Logs')).toBeInTheDocument()
    expect(screen.getByText(/View and manage your logged time/)).toBeInTheDocument()
    expect(screen.getByText('Filters')).toBeInTheDocument()
  })

  it('displays empty state when no entries', () => {
    render(
      <MemoryRouter>
        <TimeTrackingPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('No time entries found for the selected filters.')).toBeInTheDocument()
  })

  it('formats grouped day heading as year, month, day, weekday and ISO date', () => {
    mockUseTimeEntriesViewer.mockReturnValue({
      entries: [],
      projects: [],
      taskLabelById: {},
      isLoading: false,
      filters: {
        dateFrom: '2026-09-01',
        dateTo: '2026-09-01',
        selectedProjectIds: [],
        billableFilter: 'all' as const,
      },
      entriesByDate: [{ date: '2026-09-01', entries: [] }],
      totalHours: 0,
      editingEntryId: null,
      deletingEntryId: null,
      error: null,
      handleUpdateFilter: vi.fn(),
      handleResetFilters: vi.fn(),
      setEditingEntryId: vi.fn(),
      setDeletingEntryId: vi.fn(),
      handleUpdate: vi.fn(),
      handleDelete: vi.fn(),
      refreshEntries: vi.fn(),
    })

    render(
      <MemoryRouter>
        <TimeTrackingPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('2026, September 1, Tuesday.')).toBeInTheDocument()
    expect(screen.getByText('2026-09-01')).toBeInTheDocument()
  })
})
