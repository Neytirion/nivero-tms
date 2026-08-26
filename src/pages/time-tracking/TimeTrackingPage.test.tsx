import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { TimeTrackingPage } from './TimeTrackingPage'

describe('TimeTrackingPage', () => {
  it('renders the rebuilt module placeholder', () => {
    render(
      <MemoryRouter>
        <TimeTrackingPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Time Tracking v2')).toBeInTheDocument()
    expect(
      screen.getByText('This module is being rebuilt from scratch. Legacy functionality has been intentionally removed.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Planned next: redesigned logs, cleaner weekly overview, and a simplified manual entry flow.'),
    ).toBeInTheDocument()
  })
})
