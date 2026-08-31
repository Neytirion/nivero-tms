import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TimeTrackingPage } from './TimeTrackingPage'

// Mock the hooks
vi.mock('../../features/time-tracking/hooks/useTimeEntriesViewer', () => ({
  useTimeEntriesViewer: () => ({
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
  }),
}))

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
})
