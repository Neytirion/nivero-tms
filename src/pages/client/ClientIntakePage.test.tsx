import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ClientIntakePage } from './ClientIntakePage'
import { submitClientIntake } from '../../lib/pm/client-intake'

vi.mock('../../lib/pm/client-intake', () => ({
  submitClientIntake: vi.fn(),
}))

const mockSubmitClientIntake = vi.mocked(submitClientIntake)

function renderPage(path = '/client/11111111-1111-4111-8111-111111111111') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/client/:token" element={<ClientIntakePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ClientIntakePage', () => {
  beforeEach(() => {
    mockSubmitClientIntake.mockReset()
  })

  it('keeps send button disabled until required fields are valid', () => {
    renderPage()

    const sendButton = screen.getByRole('button', { name: /send request/i })
    expect(sendButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: 'Fi' },
    })
    fireEvent.change(screen.getByLabelText(/details/i), {
      target: { value: 'Too short' },
    })

    expect(sendButton).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: 'Fix checkout on mobile' },
    })
    fireEvent.change(screen.getByLabelText(/details/i), {
      target: { value: 'Checkout button overlaps the footer on iPhone SE.' },
    })

    expect(sendButton).toBeEnabled()
  })

  it('submits trimmed payload and shows success status', async () => {
    mockSubmitClientIntake.mockResolvedValue({ success: true, taskId: 'task-42' })

    renderPage()

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: '  Client Jane  ' },
    })
    fireEvent.change(screen.getByLabelText(/your email/i), {
      target: { value: '  jane@example.com  ' },
    })
    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: '  Improve dashboard loading  ' },
    })
    fireEvent.change(screen.getByLabelText(/details/i), {
      target: { value: '  The dashboard takes 10+ seconds to load after login.  ' },
    })

    fireEvent.click(screen.getByRole('button', { name: /send request/i }))

    await waitFor(() => {
      expect(mockSubmitClientIntake).toHaveBeenCalledWith({
        token: '11111111-1111-4111-8111-111111111111',
        clientName: 'Client Jane',
        clientEmail: 'jane@example.com',
        title: 'Improve dashboard loading',
        message: 'The dashboard takes 10+ seconds to load after login.',
        attachments: [],
      })
    })

    expect(screen.getByText(/thanks\. your request has been sent to the project team\./i)).toBeInTheDocument()
  })

  it('shows server error when submit fails', async () => {
    mockSubmitClientIntake.mockRejectedValue(new Error('Project link is invalid or expired'))

    renderPage()

    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: 'Fix profile image crop' },
    })
    fireEvent.change(screen.getByLabelText(/details/i), {
      target: { value: 'Profile image gets cut off when saving in Safari browser.' },
    })

    fireEvent.click(screen.getByRole('button', { name: /send request/i }))

    await waitFor(() => {
      expect(screen.getByText(/project link is invalid or expired/i)).toBeInTheDocument()
    })
  })
})
