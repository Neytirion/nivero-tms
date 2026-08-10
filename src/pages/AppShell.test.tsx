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

    // ✅ Check BEHAVIOR: Resources menu is hidden for members
    expect(screen.queryByText('Resources')).toBeNull()
    // ✅ Current project name is displayed read-only
    expect(screen.getByText('Project One')).toBeTruthy()
  })

  it('shows Resources navigation for manager role', () => {
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

    expect(screen.getByText('Resources')).toBeTruthy()
    expect(screen.getByText('Nivero PM Tool')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Open profile' })).toBeTruthy()
    // ✅ Current project name shown read-only (no interactive selector)
    expect(screen.getByText('Project One')).toBeTruthy()
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

    it('hides Resources menu when not manager', () => {
      const roles = ['member', 'guest'] as const

      roles.forEach((role) => {
        const { unmount } = render(
          <MemoryRouter>
            <AppShell
              user={user}
            />
          </MemoryRouter>,
        )

        mockUseWorkspace.mockReturnValue({
          projects: [{ id: 'p1', name: 'Project One' }],
          selectedProjectId: 'p1',
          selectProject: vi.fn(),
          isLoading: false,
          getProjectRole: () => role,
        })

        unmount()

        // Re-render with different role
        render(
          <MemoryRouter>
            <AppShell user={user} />
          </MemoryRouter>,
        )

        // ✅ Check BEHAVIOR: Resources hidden for non-managers
        expect(screen.queryByText('Resources')).toBeNull()
      })
    })
  })
})

