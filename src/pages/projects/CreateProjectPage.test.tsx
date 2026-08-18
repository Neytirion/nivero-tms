import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { CreateProjectPage } from './CreateProjectPage'
import { useWorkspace } from '../../features/dashboard/workspace-context'
import { createProjectPreview, createWorkspaceState } from '../test-helpers'
import { inviteProjectMemberByEmail } from '../../lib/pm/members'

vi.mock('../../features/dashboard/workspace-context', () => ({
  useWorkspace: vi.fn(),
}))

vi.mock('../../features/projects/ai', () => ({
  AiProjectGeneratorModal: ({ variant }: { variant?: 'modal' | 'inline' }) => (
    <div data-testid="ai-generator" data-variant={variant ?? 'modal'}>
      AI Generator Mock
    </div>
  ),
}))

vi.mock('../../lib/pm/members', () => ({
  inviteProjectMemberByEmail: vi.fn(async () => undefined),
}))

const mockUseWorkspace = vi.mocked(useWorkspace)
const mockInviteProjectMemberByEmail = vi.mocked(inviteProjectMemberByEmail)

function buildWorkspace() {
  return createWorkspaceState({
    projects: [
      createProjectPreview({ id: 'p1', customer_name: 'ACME' }),
      createProjectPreview({ id: 'p2', customer_name: 'Beta Corp' }),
      createProjectPreview({ id: 'p3', customer_name: 'ACME' }),
    ],
    addProject: vi.fn(async () => null),
  })
}

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/app/projects/create']}>
      <Routes>
        <Route
          path="/app/projects/create"
          element={
            <>
              <CreateProjectPage />
              <LocationProbe />
            </>
          }
        />
        <Route path="/app/projects" element={<LocationProbe />} />
        <Route path="/app/projects/:projectId" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

function goToManualWizard() {
  fireEvent.click(screen.getByRole('button', { name: /manual entry/i }))
}

function completeWizardUntilReview() {
  fireEvent.click(screen.getByRole('button', { name: /next/i }))
  fireEvent.click(screen.getByRole('button', { name: /next/i }))
  fireEvent.click(screen.getByRole('button', { name: /next/i }))
}

describe('CreateProjectPage', () => {
  beforeEach(() => {
    mockUseWorkspace.mockReset()
    mockInviteProjectMemberByEmail.mockReset()
  })

  it('submits manual project with optional description', async () => {
    const workspace = buildWorkspace()
    mockUseWorkspace.mockReturnValue(workspace)

    renderPage()

    goToManualWizard()

    fireEvent.change(screen.getByLabelText(/project name/i), { target: { value: '  Apollo  ' } })
    fireEvent.change(screen.getByLabelText(/company name/i), { target: { value: '  ACME  ' } })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-07-10' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2026-07-20' } })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: '  Important scope  ' } })
    completeWizardUntilReview()

    fireEvent.click(screen.getByRole('button', { name: /create project/i }))

    await waitFor(() => {
      expect(workspace.addProject).toHaveBeenCalledWith({
        name: 'Apollo',
        description: 'Important scope',
        customerName: 'ACME',
        budgetAmount: undefined,
        startDate: '2026-07-10',
        endDate: '2026-07-20',
        useEstimates: false,
      })
    })
  })

  it('renders deduplicated customer suggestions', () => {
    const workspace = buildWorkspace()
    mockUseWorkspace.mockReturnValue(workspace)

    renderPage()

    goToManualWizard()

    const options = Array.from(document.querySelectorAll('#company-suggestions option')).map((option) =>
      option.getAttribute('value'),
    )

    expect(options).toEqual(['ACME', 'Beta Corp'])
  })

  it('renders inline AI generator in AI tab', () => {
    const workspace = buildWorkspace()
    mockUseWorkspace.mockReturnValue(workspace)

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /ai generator/i }))

    expect(screen.getByTestId('ai-generator')).toHaveAttribute('data-variant', 'inline')
  })

  it('skips self invitation during wizard project creation', async () => {
    const addProject = vi.fn(async () => 'project-42')
    const setStatus = vi.fn()
    const workspace = createWorkspaceState({
      projects: [],
      addProject,
      setStatus,
      currentUserProfile: {
        userId: 'user-1',
        email: 'me@example.com',
        fullName: 'Me',
        avatarUrl: null,
        role: null,
        joinedAt: null,
      },
    })
    mockUseWorkspace.mockReturnValue(workspace)

    renderPage()
    goToManualWizard()

    fireEvent.change(screen.getByLabelText(/project name/i), { target: { value: 'Project Alpha' } })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-08-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2026-08-10' } })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    fireEvent.change(screen.getByPlaceholderText('member@example.com'), { target: { value: 'ME@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /create project/i }))

    await waitFor(() => {
      expect(addProject).toHaveBeenCalled()
      expect(mockInviteProjectMemberByEmail).not.toHaveBeenCalled()
      expect(setStatus).toHaveBeenCalledWith('Project created. Your own email was skipped from invitations')
    })
  })
})
