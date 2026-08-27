import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReportsPage } from './ReportsPage'

describe('ReportsPage', () => {
  it('renders page title and description', () => {
    render(<ReportsPage />)

    expect(screen.getByText('Time Tracking Reports')).toBeInTheDocument()
    expect(screen.getByText(/Analyze logged time across members, projects, and clients/)).toBeInTheDocument()
  })

  it('renders the page layout with filters and table', () => {
    render(<ReportsPage />)

    expect(screen.getByText('Filters')).toBeInTheDocument()
  })
})
