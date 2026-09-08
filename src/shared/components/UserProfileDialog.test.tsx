import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { UserProfileDialog } from './UserProfileDialog'

describe('UserProfileDialog', () => {
  it('shows display name fallback, about me, and hides user id', () => {
    render(
      <UserProfileDialog
        isOpen
        profile={{
          displayName: 'Johnny',
          fullName: 'John Doe',
          email: 'john@example.com',
          role: 'member',
          aboutMe: 'Product builder and tea fan',
          joinedAt: '2026-06-24T10:00:00.000Z',
        }}
        onClose={() => undefined}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Johnny' })).toBeInTheDocument()
    expect(screen.queryByText('Display name')).not.toBeInTheDocument()
    expect(screen.getByText('Product builder and tea fan')).toBeInTheDocument()
    expect(screen.queryByText('User ID')).not.toBeInTheDocument()
    expect(screen.queryByText('Role')).not.toBeInTheDocument()
    expect(screen.queryByText('Joined')).not.toBeInTheDocument()
    expect(screen.queryByText('Member profile')).not.toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('hides about me when it is empty', () => {
    render(
      <UserProfileDialog
        isOpen
        profile={{
          fullName: 'John Doe',
          email: 'john@example.com',
          role: 'member',
          joinedAt: '2026-06-24T10:00:00.000Z',
        }}
        onClose={() => undefined}
      />,
    )

    expect(screen.queryByText('About me')).not.toBeInTheDocument()
    expect(screen.queryByText('Product builder and tea fan')).not.toBeInTheDocument()
  })
})