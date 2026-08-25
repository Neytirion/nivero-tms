import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { CreateProjectPage } from './CreateProjectPage'
import { useWorkspace } from '../../features/workspace/workspace-context'
import { createProjectPreview, createWorkspaceState } from '../test-helpers'
import { inviteProjectMemberByEmail } from '../../lib/pm/members'
import { getUserProfileByEmail } from '../../lib/pm/members'

vi.mock('../../features/workspace/workspace-context', () => ({
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
  getUserProfileByEmail: vi.fn(async (email: string) => ({
    user_id: 'u-invitee',
    full_name: 'Invitee User',
    email,
    avatar_url: null,
    joined_at: '2026-08-01T00:00:00.000Z',
    about_me: null,
  })),
}))

const mockUseWorkspace = vi.mocked(useWorkspace)
const mockInviteProjectMemberByEmail = vi.mocked(inviteProjectMemberByEmail)
const mockGetUserProfileByEmail = vi.mocked(getUserProfileByEmail)

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
    mockGetUserProfileByEmail.mockReset()
    mockGetUserProfileByEmail.mockResolvedValue({
      user_id: 'u-invitee',
      full_name: 'Invitee User',
      email: 'invitee@example.com',
      avatar_url: null,
      joined_at: '2026-08-01T00:00:00.000Z',
      about_me: null,
    })
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
        useEstimates: true,
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
    expect(screen.getByText('You cannot invite yourself to a project')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /create project/i }))

    await waitFor(() => {
      expect(addProject).toHaveBeenCalled()
      expect(mockInviteProjectMemberByEmail).not.toHaveBeenCalled()
    })
  })

  it('navigates to overview and reloads members after successful invitations', async () => {
    const addProject = vi.fn(async () => 'project-42')
    const workspace = createWorkspaceState({
      projects: [],
      addProject,
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

    fireEvent.change(screen.getByPlaceholderText('member@example.com'), { target: { value: 'john@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /invitee user/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /create project/i }))

    await waitFor(() => {
      expect(mockInviteProjectMemberByEmail).toHaveBeenCalledWith({
        projectId: 'project-42',
        email: 'john@example.com',
        role: 'member',
      })
      expect(workspace.selectProject).toHaveBeenCalledWith('project-42')
      expect(workspace.reloadProjectData).toHaveBeenCalledWith('project-42')
      expect(screen.getByTestId('location')).toHaveTextContent('/app/projects/project-42')
    })
  })

  it('shows immediate error for non-existent email in team step', async () => {
    const workspace = buildWorkspace()
    mockUseWorkspace.mockReturnValue(workspace)
    mockGetUserProfileByEmail.mockResolvedValueOnce(null)

    renderPage()
    goToManualWizard()

    fireEvent.change(screen.getByLabelText(/project name/i), { target: { value: 'Project Alpha' } })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-08-01' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2026-08-10' } })
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    fireEvent.change(screen.getByPlaceholderText('member@example.com'), { target: { value: 'ghost@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => {
      expect(screen.getByText('User with this email does not exist')).toBeInTheDocument()
    })
  })
})
