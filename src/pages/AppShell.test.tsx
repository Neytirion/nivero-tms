import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppShell } from './AppShell'

const mockUseWorkspace = vi.fn()

vi.mock('../features/workspace/workspace-context.tsx', () => ({
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

  it('shows the current project without Resources navigation', () => {
    mockUseWorkspace.mockReturnValue({
      projects: [{ id: 'p1', name: 'Project One' }],
      selectedProjectId: 'p1',
      selectProject: vi.fn(),
      isLoading: false,
      getProjectRole: () => 'member',
    })

    render(
      <MemoryRouter>
        <AppShell user={user} />
      </MemoryRouter>,
    )

    expect(screen.queryByText(/Resources/)).toBeNull()
    expect(screen.getByText('Project One')).toBeTruthy()
  })

  it('shows primary navigation actions for manager role', () => {
    mockUseWorkspace.mockReturnValue({
      projects: [{ id: 'p1', name: 'Project One' }],
      selectedProjectId: 'p1',
      selectProject: vi.fn(),
      isLoading: false,
      getProjectRole: () => 'manager',
    })

    render(
      <MemoryRouter>
        <AppShell user={user} />
      </MemoryRouter>,
    )

    expect(screen.queryByText(/Resources/)).toBeNull()
    expect(screen.getByText('Nivero PM Tool')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Open mentions' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Open profile' })).toBeTruthy()
    // ✅ Current project name shown read-only (no interactive selector)
    expect(screen.getByText('Project One')).toBeTruthy()
  })

  it('shows display name instead of full name when configured', () => {
    mockUseWorkspace.mockReturnValue({
      projects: [],
      selectedProjectId: '',
      isLoading: false,
      getProjectRole: () => null,
    })

    render(
      <MemoryRouter>
        <AppShell
          user={{
            email: 'user@nivero.dev',
            user_metadata: {
              full_name: 'Nivero User',
              display_name: 'Johnny',
              avatar_url: '',
            },
          } as never}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Johnny')).toBeTruthy()
    expect(screen.queryByText('Nivero User')).toBeNull()
  })

  describe('navigation behavior', () => {
    it('shows current project name in sidebar', async () => {
      const selectProject = vi.fn()
      mockUseWorkspace.mockReturnValue({
        projects: [
          { id: 'p1', name: 'Project One' },
          { id: 'p2', name: 'Project Two' },
        ],
        selectedProjectId: 'p1',
        selectProject,
        isLoading: false,
        getProjectRole: () => 'manager',
      })

      render(
        <MemoryRouter>
          <AppShell user={user} />
        </MemoryRouter>,
      )

      // ✅ Check BEHAVIOR: Current project name is displayed
      expect(screen.getByText('Project One')).toBeTruthy()
    })

    it('displays selected project name in sidebar', async () => {
      mockUseWorkspace.mockReturnValue({
        projects: [
          { id: 'p1', name: 'Alpha Project' },
          { id: 'p2', name: 'Beta Project' },
          { id: 'p3', name: 'Gamma Project' },
        ],
        selectedProjectId: 'p1',
        selectProject: vi.fn(),
        isLoading: false,
        getProjectRole: () => 'manager',
      })

      render(
        <MemoryRouter>
          <AppShell user={user} />
        </MemoryRouter>,
      )

      // ✅ Check BEHAVIOR: Selected project name shown in sidebar
      expect(screen.getByText('Alpha Project')).toBeTruthy()
      // Non-selected projects are not shown in sidebar
      expect(screen.queryByText('Beta Project')).toBeNull()
      expect(screen.queryByText('Gamma Project')).toBeNull()
    })

  })
})

