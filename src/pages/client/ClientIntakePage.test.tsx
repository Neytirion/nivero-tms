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

  it('shows required field errors on submit when title/details are empty', async () => {
    renderPage()

    const sendButton = screen.getByRole('button', { name: /send request/i })
    expect(sendButton).toBeEnabled()

    fireEvent.click(sendButton)

    await waitFor(() => {
      expect(screen.getByText(/task title is required/i)).toBeInTheDocument()
      expect(screen.getByText(/details is required/i)).toBeInTheDocument()
    })

    expect(mockSubmitClientIntake).not.toHaveBeenCalled()
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

  it('supports non-image file attachments in submission payload', async () => {
    mockSubmitClientIntake.mockResolvedValue({ success: true, taskId: 'task-43' })

    renderPage()

    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: 'Share logs with team' },
    })
    fireEvent.change(screen.getByLabelText(/details/i), {
      target: { value: 'Please review attached logs and screenshot for root cause analysis.' },
    })

    const fileInput = screen.getByLabelText(/attachments/i)
    const imageFile = new File(['image-bytes'], 'bug.png', { type: 'image/png' })
    const textFile = new File(['log content'], 'debug.log', { type: 'text/plain' })
    fireEvent.change(fileInput, {
      target: {
        files: [imageFile, textFile],
      },
    })

    fireEvent.click(screen.getByRole('button', { name: /send request/i }))

    await waitFor(() => {
      expect(mockSubmitClientIntake).toHaveBeenCalled()
    })

    const payload = mockSubmitClientIntake.mock.calls[0]?.[0]
    expect(payload?.attachments).toHaveLength(2)
    expect(payload?.attachments?.[0].name).toBe('bug.png')
    expect(payload?.attachments?.[1].name).toBe('debug.log')
    expect(payload?.attachments?.[1].mimeType).toBe('text/plain')
  })

  it('uses 1000-character limit for details field', () => {
    renderPage()

    const detailsField = screen.getByLabelText(/details/i)
    expect(detailsField).toHaveAttribute('maxLength', '1000')
  })

  it('uses 50-character limit for name, email, and task title fields', () => {
    renderPage()

    expect(screen.getByLabelText(/your name/i)).toHaveAttribute('maxLength', '50')
    expect(screen.getByLabelText(/your email/i)).toHaveAttribute('maxLength', '50')
    expect(screen.getByLabelText(/task title/i)).toHaveAttribute('maxLength', '50')
  })

  it('disables submit for invalid optional email format', () => {
    renderPage()

    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: 'Fix checkout on mobile' },
    })
    fireEvent.change(screen.getByLabelText(/details/i), {
      target: { value: 'Checkout button overlaps the footer on iPhone SE.' },
    })
    fireEvent.change(screen.getByLabelText(/your email/i), {
      target: { value: 'not-an-email' },
    })

    expect(screen.getByRole('button', { name: /send request/i })).toBeDisabled()
  })

  it('appends files across multiple attachment selections instead of replacing them', async () => {
    mockSubmitClientIntake.mockResolvedValue({ success: true, taskId: 'task-44' })

    renderPage()

    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: 'Collect diagnostic package' },
    })
    fireEvent.change(screen.getByLabelText(/details/i), {
      target: { value: 'Please check attached screenshot and logs for this issue.' },
    })

    const fileInput = screen.getByLabelText(/attachments/i)
    const firstFile = new File(['img'], 'screen.png', { type: 'image/png' })
    const secondFile = new File(['txt'], 'app.log', { type: 'text/plain' })

    fireEvent.change(fileInput, {
      target: {
        files: [firstFile],
      },
    })

    fireEvent.change(fileInput, {
      target: {
        files: [secondFile],
      },
    })

    fireEvent.click(screen.getByRole('button', { name: /send request/i }))

    await waitFor(() => {
      expect(mockSubmitClientIntake).toHaveBeenCalled()
    })

    const payload = mockSubmitClientIntake.mock.calls[0]?.[0]
    expect(payload?.attachments).toHaveLength(2)
    expect(payload?.attachments?.map((item: { name: string }) => item.name)).toEqual(['screen.png', 'app.log'])
  })

  it('shows an error when more than 10 files are attached', () => {
    renderPage()

    const fileInput = screen.getByLabelText(/attachments/i)
    const files = Array.from({ length: 11 }, (_, index) => new File(['x'], `f-${index + 1}.txt`, { type: 'text/plain' }))

    fireEvent.change(fileInput, {
      target: {
        files,
      },
    })

    expect(screen.getByText(/you can upload up to 10 files/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send request/i })).toBeDisabled()
  })

  it('removes an accidentally attached file when clicking the remove button', async () => {
    mockSubmitClientIntake.mockResolvedValue({ success: true, taskId: 'task-45' })

    renderPage()

    fireEvent.change(screen.getByLabelText(/task title/i), {
      target: { value: 'Validate attachment cleanup flow' },
    })
    fireEvent.change(screen.getByLabelText(/details/i), {
      target: { value: 'Removing one file should keep only the remaining file in payload.' },
    })

    const fileInput = screen.getByLabelText(/attachments/i)
    const firstFile = new File(['img'], 'screen.png', { type: 'image/png' })
    const secondFile = new File(['txt'], 'trace.log', { type: 'text/plain' })

    fireEvent.change(fileInput, {
      target: {
        files: [firstFile, secondFile],
      },
    })

    fireEvent.click(screen.getByRole('button', { name: /remove screen\.png/i }))

    fireEvent.click(screen.getByRole('button', { name: /send request/i }))

    await waitFor(() => {
      expect(mockSubmitClientIntake).toHaveBeenCalled()
    })

    const payload = mockSubmitClientIntake.mock.calls[0]?.[0]
    expect(payload?.attachments).toHaveLength(1)
    expect(payload?.attachments?.[0].name).toBe('trace.log')
  })
})
