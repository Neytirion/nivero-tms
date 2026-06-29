import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { ProjectsPage } from './ProjectsPage'
import { useWorkspace } from '../../features/dashboard/workspace-context.tsx'
import { useProjectForm } from '../../features/projects/hooks/useProjectForm.ts'
import { createProjectPreview, createWorkspaceState } from '../test-helpers.ts'

vi.mock('../../features/dashboard/workspace-context.tsx', () => ({
  useWorkspace: vi.fn(),
}))

vi.mock('../../features/projects/hooks/useProjectForm.ts', () => ({
  useProjectForm: vi.fn(),
}))

vi.mock('../../features/projects/components', () => ({
  ProjectsSummaryCards: () => <div>summary-cards</div>,
  ProjectsTable: (props: {
    onSelectProject: (projectId: string) => void
  }) => (
    <div>
      <button type="button" onClick={() => props.onSelectProject('p1')}>
        Open project
      </button>
    </div>
  ),
  CreateProjectModal: () => null,
  CreateProjectWithAiModal: () => null,
}))

const mockUseWorkspace = vi.mocked(useWorkspace)
const mockUseProjectForm = vi.mocked(useProjectForm)

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

function renderProjectsPage(initialPath = '/app/projects') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/app/projects"
          element={
            <>
              <ProjectsPage />
              <LocationProbe />
            </>
          }
        />
        <Route path="/app/projects/:projectId" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

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

  it('does not auto-reload selected project on list page load', () => {
    const workspace = createWorkspaceState({
      selectedProjectId: 'p1',
      projects: [createProjectPreview({ id: 'p1', name: 'Apollo' })],
    })
    mockUseWorkspace.mockReturnValue(workspace)

    renderProjectsPage()

    expect(workspace.selectProject).not.toHaveBeenCalled()
  })

  it('navigates to project details when row is selected', async () => {
    const workspace = createWorkspaceState({
      selectedProjectId: 'p1',
      projects: [createProjectPreview({ id: 'p1', name: 'Apollo' })],
    })
    mockUseWorkspace.mockReturnValue(workspace)

    renderProjectsPage()

    fireEvent.click(screen.getByText('Open project'))

    await waitFor(() => {
      expect(screen.getByTestId('location').textContent).toBe('/app/projects/p1')
    })
  })
})
