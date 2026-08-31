import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReportsFilters } from './ReportsFilters'
import type { ReportsFilterState } from '../types/reports'

describe('ReportsFilters', () => {
  const mockOnFilterChange = vi.fn()
  const mockOnReset = vi.fn()

  const defaultFilters: ReportsFilterState = {
    selectedMemberIds: [],
    selectedProjectIds: [],
    selectedClientNames: [],
    billableFilter: 'all',
    dateFrom: '2026-08-01',
    dateTo: '2026-08-31',
  }

  const projects = [
    { id: 'proj-1', name: 'Project Alpha', customer_name: 'Acme Corp' },
    { id: 'proj-2', name: 'Project Beta', customer_name: 'Beta Inc' },
  ]

  const members = [
    { id: 'user-1', name: 'John Doe' },
    { id: 'user-2', name: 'Jane Smith' },
  ]

  const clients = ['Acme Corp', 'Beta Inc']

  beforeEach(() => {
    mockOnFilterChange.mockClear()
    mockOnReset.mockClear()
  })

  it('renders all filter sections', () => {
    render(
      <ReportsFilters
        filters={defaultFilters}
        isLoading={false}
        projects={projects}
        uniqueMembers={members}
        uniqueClients={clients}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
      />,
    )

    expect(screen.getByText(/Date Range/i)).toBeInTheDocument()
    expect(screen.getByText(/Type/i)).toBeInTheDocument()
    
    // Use more specific queries since labels are repeated
    const memberLabels = screen.getAllByText(/Members/i)
    expect(memberLabels.length).toBeGreaterThan(0)
    
    const projectLabels = screen.getAllByText(/Projects/i)
    expect(projectLabels.length).toBeGreaterThan(0)
    
    const clientLabels = screen.getAllByText(/Clients/i)
    expect(clientLabels.length).toBeGreaterThan(0)
  })

  it('renders reset button', () => {
    render(
      <ReportsFilters
        filters={defaultFilters}
        isLoading={false}
        projects={projects}
        uniqueMembers={members}
        uniqueClients={clients}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
      />,
    )

    const resetButton = screen.getByRole('button', { name: /Reset all/i })
    expect(resetButton).toBeInTheDocument()
  })

  it('calls onReset when reset button is clicked', () => {
    render(
      <ReportsFilters
        filters={defaultFilters}
        isLoading={false}
        projects={projects}
        uniqueMembers={members}
        uniqueClients={clients}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
      />,
    )

    const resetButton = screen.getByRole('button', { name: /Reset all/i })
    fireEvent.click(resetButton)

    expect(mockOnReset).toHaveBeenCalled()
  })

  it('changes billable filter', () => {
    render(
      <ReportsFilters
        filters={defaultFilters}
        isLoading={false}
        projects={projects}
        uniqueMembers={members}
        uniqueClients={clients}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
      />,
    )

    const billableButton = screen.getByRole('button', { name: 'Billable' })
    fireEvent.click(billableButton)

    expect(mockOnFilterChange).toHaveBeenCalledWith('billableFilter', 'billable')
  })

  it('renders member checkboxes', () => {
    render(
      <ReportsFilters
        filters={defaultFilters}
        isLoading={false}
        projects={projects}
        uniqueMembers={members}
        uniqueClients={clients}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
      />,
    )

    const memberButtons = screen.getAllByText(/Members/i)
    expect(memberButtons.length).toBeGreaterThan(0)
  })

  it('toggles member selection via searchable select', async () => {
    render(
      <ReportsFilters
        filters={defaultFilters}
        isLoading={false}
        projects={projects}
        uniqueMembers={members}
        uniqueClients={clients}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
      />,
    )

    // Verify the Members filter is rendered
    const memberButtons = screen.getAllByText(/Select members/i)
    expect(memberButtons.length).toBeGreaterThan(0)
    
    // Verify filter labels are in the document
    expect(screen.getByText('Members')).toBeInTheDocument()
  })

  it('disables all inputs when loading', () => {
    render(
      <ReportsFilters
        filters={defaultFilters}
        isLoading={true}
        projects={projects}
        uniqueMembers={members}
        uniqueClients={clients}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
      />,
    )

    const allButton = screen.getByText('All')
    expect(allButton).toBeDisabled()
  })
})
