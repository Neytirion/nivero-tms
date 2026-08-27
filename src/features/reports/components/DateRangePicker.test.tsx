import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DateRangePicker } from './DateRangePicker'

describe('DateRangePicker', () => {
  const mockOnDateChange = vi.fn()

  beforeEach(() => {
    mockOnDateChange.mockClear()
  })

  it('renders with initial date range', () => {
    render(
      <DateRangePicker
        dateFrom="2026-08-01"
        dateTo="2026-08-31"
        onDateChange={mockOnDateChange}
      />,
    )

    expect(screen.getByText(/Aug \d+, 2026.*Aug \d+, 2026/)).toBeInTheDocument()
  })

  it('opens calendar picker on button click', () => {
    render(
      <DateRangePicker
        dateFrom="2026-08-01"
        dateTo="2026-08-31"
        onDateChange={mockOnDateChange}
      />,
    )

    const button = screen.getByRole('button', { name: /Date Range/i })
    fireEvent.click(button)

    expect(screen.getByText('Quick Select')).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('applies preset filters', async () => {
    render(
      <DateRangePicker
        dateFrom="2026-08-01"
        dateTo="2026-08-31"
        onDateChange={mockOnDateChange}
      />,
    )

    const button = screen.getByRole('button', { name: /Date Range/i })
    fireEvent.click(button)

    const thisWeekButton = screen.getByRole('button', { name: 'This week' })
    fireEvent.click(thisWeekButton)

    expect(mockOnDateChange).toHaveBeenCalled()
    expect(mockOnDateChange.mock.calls[0][0]).toBeTruthy() // from date
    expect(mockOnDateChange.mock.calls[0][1]).toBeTruthy() // to date
  })

  it('shows instruction text during date selection', () => {
    render(
      <DateRangePicker
        dateFrom=""
        dateTo=""
        onDateChange={mockOnDateChange}
      />,
    )

    const button = screen.getByRole('button', { name: /Date Range/i })
    fireEvent.click(button)

    expect(screen.getByText('Click a date to start selecting')).toBeInTheDocument()
  })

  it('navigates between months', () => {
    render(
      <DateRangePicker
        dateFrom="2026-08-01"
        dateTo="2026-08-31"
        onDateChange={mockOnDateChange}
      />,
    )

    const button = screen.getByRole('button', { name: /Date Range/i })
    fireEvent.click(button)

    // Should show August and September initially
    expect(screen.getByText('August 2026')).toBeInTheDocument()
    expect(screen.getByText('September 2026')).toBeInTheDocument()

    // Click next month button
    const nextButton = screen.getAllByRole('button').find(b => 
      b.getAttribute('aria-label') === 'Next month'
    )
    fireEvent.click(nextButton!)

    // Should show September and October
    expect(screen.getByText('September 2026')).toBeInTheDocument()
    expect(screen.getByText('October 2026')).toBeInTheDocument()
  })

  it('closes picker on Done button', () => {
    render(
      <DateRangePicker
        dateFrom="2026-08-01"
        dateTo="2026-08-31"
        onDateChange={mockOnDateChange}
      />,
    )

    const button = screen.getByRole('button', { name: /Date Range/i })
    fireEvent.click(button)

    expect(screen.getByText('Quick Select')).toBeInTheDocument()

    const doneButton = screen.getByRole('button', { name: 'Done' })
    fireEvent.click(doneButton)

    expect(screen.queryByText('Quick Select')).not.toBeInTheDocument()
  })
})
