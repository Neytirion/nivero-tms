import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReportsTable } from './ReportsTable'
import type { TimeEntryReport } from '../types/reports'

describe('ReportsTable', () => {
  const mockEntries: TimeEntryReport[] = [
    {
      id: 'entry-1',
      userId: 'user-1',
      memberName: 'John Doe',
      projectId: 'proj-1',
      projectName: 'Project Alpha',
      clientName: 'Acme Corp',
      taskId: null,
      entryDate: '2026-08-27',
      minutesSpent: 120,
      isBillable: true,
      startedAt: null,
      endedAt: null,
      createdAt: '2026-08-27T10:00:00Z',
    },
    {
      id: 'entry-2',
      userId: 'user-2',
      memberName: 'Jane Smith',
      projectId: 'proj-2',
      projectName: 'Project Beta',
      clientName: 'Beta Inc',
      taskId: null,
      entryDate: '2026-08-26',
      minutesSpent: 90,
      isBillable: false,
      startedAt: null,
      endedAt: null,
      createdAt: '2026-08-26T14:00:00Z',
    },
  ]

  it('renders table with entries', () => {
    render(
      <ReportsTable
        entries={mockEntries}
        isLoading={false}
      />,
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(
      <ReportsTable
        entries={[]}
        isLoading={true}
      />,
    )

    expect(screen.getByText('Loading entries...')).toBeInTheDocument()
  })

  it('shows empty state when no entries', () => {
    render(
      <ReportsTable
        entries={[]}
        isLoading={false}
      />,
    )

    expect(screen.getByText('No entries found for the selected filters')).toBeInTheDocument()
  })

  it('displays project and client names', () => {
    render(
      <ReportsTable
        entries={mockEntries}
        isLoading={false}
      />,
    )

    expect(screen.getByText('Project Alpha')).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Project Beta')).toBeInTheDocument()
    expect(screen.getByText('Beta Inc')).toBeInTheDocument()
  })

  it('displays billable badge for billable entries', () => {
    render(
      <ReportsTable
        entries={[mockEntries[0]]}
        isLoading={false}
      />,
    )

    expect(screen.getByText('Billable')).toBeInTheDocument()
  })

  it('displays non-billable badge for non-billable entries', () => {
    render(
      <ReportsTable
        entries={[mockEntries[1]]}
        isLoading={false}
      />,
    )

    expect(screen.getByText('Non-billable')).toBeInTheDocument()
  })
})
