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
    expect(screen.getByText(/Members/i)).toBeInTheDocument()
    expect(screen.getByText(/Projects/i)).toBeInTheDocument()
    expect(screen.getByText(/Clients/i)).toBeInTheDocument()
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

  it('displays active filter count', () => {
    const filtersWithActiveFilters: ReportsFilterState = {
      ...defaultFilters,
      selectedMemberIds: ['user-1'],
      selectedProjectIds: ['proj-1'],
    }

    render(
      <ReportsFilters
        filters={filtersWithActiveFilters}
        isLoading={false}
        projects={projects}
        uniqueMembers={members}
        uniqueClients={clients}
        onFilterChange={mockOnFilterChange}
        onReset={mockOnReset}
      />,
    )

    expect(screen.getByText('2')).toBeInTheDocument() // 2 active filters
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

    const typeSelect = screen.getByRole('combobox', { name: /Type/i })
    fireEvent.change(typeSelect, { target: { value: 'billable' } })

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

    expect(screen.getByLabelText('John Doe')).toBeInTheDocument()
    expect(screen.getByLabelText('Jane Smith')).toBeInTheDocument()
  })

  it('toggles member selection', () => {
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

    const checkbox = screen.getByLabelText('John Doe')
    fireEvent.click(checkbox)

    expect(mockOnFilterChange).toHaveBeenCalledWith('selectedMemberIds', ['user-1'])
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

    const typeSelect = screen.getByRole('combobox', { name: /Type/i })
    expect(typeSelect).toBeDisabled()
  })
})
