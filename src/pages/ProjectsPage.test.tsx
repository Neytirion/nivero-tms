import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectsPage } from './ProjectsPage'
import { useWorkspace } from '../features/dashboard/workspace-context.tsx'
import { useProjectForm } from '../features/projects/hooks/useProjectForm.ts'
import { createProjectPreview, createWorkspaceState } from './test-helpers.ts'

vi.mock('../features/dashboard/workspace-context.tsx', () => ({
  useWorkspace: vi.fn(),
}))

vi.mock('../features/projects/hooks/useProjectForm.ts', () => ({
  useProjectForm: vi.fn(),
}))

vi.mock('../features/projects/components', () => ({
  ProjectsSummaryCards: () => <div>summary-cards</div>,
  ProjectsTable: () => <div>projects-table</div>,
  CreateProjectModal: () => null,
  CreateProjectWithAiModal: () => null,
  ProjectDetailsSection: (props: {
    onInviteMember: () => void
    onMemberEmailChange: (value: string) => void
  }) => (
    <div>
      <button type="button" onClick={() => props.onMemberEmailChange('member@example.com')}>
        Set member email
      </button>
      <button type="button" onClick={props.onInviteMember}>
        Invite member
      </button>
    </div>
  ),
}))

const mockUseWorkspace = vi.mocked(useWorkspace)
const mockUseProjectForm = vi.mocked(useProjectForm)

function mockProjectForm() {
  mockUseProjectForm.mockReturnValue({
    projectName: '',
    setProjectName: vi.fn(),
    projectCustomer: '',
    setProjectCustomer: vi.fn(),
    projectStartDate: '',
    setProjectStartDate: vi.fn(),
    projectEndDate: '',
    setProjectEndDate: vi.fn(),
    canSubmit: false,
    reset: vi.fn(),
  })
}

describe('ProjectsPage', () => {
  beforeEach(() => {
    mockProjectForm()
  })

  it('refreshes selected project snapshot on page load', async () => {
    const workspace = createWorkspaceState({
      selectedProjectId: 'p1',
      projects: [createProjectPreview({ id: 'p1', name: 'Apollo' })],
    })
    mockUseWorkspace.mockReturnValue(workspace)

    render(<ProjectsPage />)

    await waitFor(() => {
      expect(workspace.selectProject).toHaveBeenCalledWith('p1')
    })
  })

  it('requires selected project before inviting members', () => {
    const workspace = createWorkspaceState({
      selectedProjectId: null,
    })
    mockUseWorkspace.mockReturnValue(workspace)

    render(<ProjectsPage />)

    fireEvent.click(screen.getByText('Invite member'))

    expect(workspace.setStatus).toHaveBeenCalledWith('Select a project before inviting members')
  })

  it('invites selected member email with current role', async () => {
    const workspace = createWorkspaceState({
      selectedProjectId: 'p1',
      projects: [createProjectPreview({ id: 'p1', name: 'Apollo' })],
      canInviteToProject: vi.fn(() => true),
      getProjectRole: vi.fn(() => 'owner' as const),
      currentUserId: 'owner-1',
    })
    mockUseWorkspace.mockReturnValue(workspace)

    render(<ProjectsPage />)

    fireEvent.click(screen.getByText('Set member email'))
    fireEvent.click(screen.getByText('Invite member'))

    await waitFor(() => {
      expect(workspace.inviteMemberToSelectedProjectByEmail).toHaveBeenCalledWith('member@example.com', 'member')
    })
  })
})
