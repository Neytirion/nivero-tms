import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppShell } from './AppShell'

const mockUseWorkspace = vi.fn()

vi.mock('../features/dashboard/workspace-context.tsx', () => ({
  WorkspaceProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useWorkspace: () => mockUseWorkspace(),
}))

describe('AppShell', () => {
  const user = {
    email: 'user@nivero.dev',
    user_metadata: {
      full_name: 'Nivero User',
      avatar_url: '',
    },
  } as never

  it('hides Resources navigation for member-only access', () => {
    mockUseWorkspace.mockReturnValue({
      projects: [{ id: 'p1' }],
      getProjectRole: () => 'member',
    })

    render(
      <MemoryRouter>
        <AppShell user={user} />
      </MemoryRouter>,
    )

    expect(screen.queryByText('Resources')).toBeNull()
  })

  it('shows Resources navigation for manager role', () => {
    mockUseWorkspace.mockReturnValue({
      projects: [{ id: 'p1' }],
      getProjectRole: () => 'manager',
    })

    render(
      <MemoryRouter>
        <AppShell user={user} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Resources')).toBeTruthy()
  })
})
