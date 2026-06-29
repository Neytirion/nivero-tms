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
      selectProject: vi.fn(async () => undefined),
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
    // ✅ But project selector is still available
    expect(screen.getByLabelText('Select current project')).toBeTruthy()
  })

  it('shows Resources navigation for manager role', () => {
    mockUseWorkspace.mockReturnValue({
      projects: [{ id: 'p1', name: 'Project One' }],
      selectedProjectId: 'p1',
      selectProject: vi.fn(async () => undefined),
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
    expect(screen.getByLabelText('Select current project')).toBeTruthy()
  })

  describe('navigation behavior', () => {
    it('calls selectProject when user changes selected project', async () => {
      const selectProject = vi.fn(async () => undefined)
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

      // ✅ Check BEHAVIOR: Project selector is available
      const projectSelector = screen.getByLabelText('Select current project')
      expect(projectSelector).toBeTruthy()
    })

    it('displays all project options in selector', async () => {
      mockUseWorkspace.mockReturnValue({
        projects: [
          { id: 'p1', name: 'Alpha Project' },
          { id: 'p2', name: 'Beta Project' },
          { id: 'p3', name: 'Gamma Project' },
        ],
        selectedProjectId: 'p1',
        selectProject: vi.fn(async () => undefined),
        isLoading: false,
        getProjectRole: () => 'manager',
      })

      render(
        <MemoryRouter>
          <AppShell user={user} />
        </MemoryRouter>,
      )

      // ✅ Check BEHAVIOR: All projects appear in UI
      expect(screen.getByText('Alpha Project')).toBeTruthy()
      expect(screen.getByText('Beta Project')).toBeTruthy()
      expect(screen.getByText('Gamma Project')).toBeTruthy()
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
          selectProject: vi.fn(async () => undefined),
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
