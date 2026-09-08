import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChangePasswordPage } from './ChangePasswordPage'

const mocks = vi.hoisted(() => ({
  setStatus: vi.fn(),
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('../../features/workspace/workspace-context', () => ({
  useWorkspace: () => ({ setStatus: mocks.setStatus }),
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      updateUser: mocks.updateUser,
    },
  },
}))

const user = {
  email: 'user@nivero.dev',
  user_metadata: {},
} as never

describe('ChangePasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.signInWithPassword.mockResolvedValue({ error: null })
    mocks.updateUser.mockResolvedValue({ error: null })
  })

  it('shows three password fields', () => {
    render(
      <MemoryRouter>
        <ChangePasswordPage user={user} />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText('Current password')).toBeTruthy()
    expect(screen.getByLabelText('New password')).toBeTruthy()
    expect(screen.getByLabelText('Confirm new password')).toBeTruthy()
  })

  it('shows and hides each password independently', () => {
    render(
      <MemoryRouter>
        <ChangePasswordPage user={user} />
      </MemoryRouter>,
    )

    const currentPassword = screen.getByLabelText('Current password')
    const newPassword = screen.getByLabelText('New password')
    const confirmPassword = screen.getByLabelText('Confirm new password')

    fireEvent.click(screen.getByRole('button', { name: 'Show current password' }))
    expect(currentPassword).toHaveAttribute('type', 'text')
    expect(newPassword).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Show new password' }))
    fireEvent.click(screen.getByRole('button', { name: 'Show password confirmation' }))
    expect(newPassword).toHaveAttribute('type', 'text')
    expect(confirmPassword).toHaveAttribute('type', 'text')

    fireEvent.click(screen.getByRole('button', { name: 'Hide current password' }))
    expect(currentPassword).toHaveAttribute('type', 'password')
  })

  it('verifies the current password, updates it, and returns to profile', async () => {
    render(
      <MemoryRouter initialEntries={['/app/profile/password']}>
        <Routes>
          <Route path="/app/profile/password" element={<ChangePasswordPage user={user} />} />
          <Route path="/app/profile" element={<p>Profile page</p>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'current-password' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'new-password' } })
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'new-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))

    await waitFor(() => {
      expect(mocks.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@nivero.dev',
        password: 'current-password',
      })
      expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'new-password' })
      expect(screen.getByText('Profile page')).toBeTruthy()
    })
  })
})
