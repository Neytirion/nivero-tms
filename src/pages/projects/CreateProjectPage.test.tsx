import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { CreateProjectPage } from './CreateProjectPage'
import { useWorkspace } from '../../features/dashboard/workspace-context'
import { createProjectPreview, createWorkspaceState } from '../test-helpers'

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

const mockUseWorkspace = vi.mocked(useWorkspace)

function buildWorkspace() {
  return createWorkspaceState({
    projects: [
      createProjectPreview({ id: 'p1', customer_name: 'ACME' }),
      createProjectPreview({ id: 'p2', customer_name: 'Beta Corp' }),
      createProjectPreview({ id: 'p3', customer_name: 'ACME' }),
    ],
    addProject: vi.fn(async () => undefined),
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
      </Routes>
    </MemoryRouter>,
  )
}

describe('CreateProjectPage', () => {
  beforeEach(() => {
    mockUseWorkspace.mockReset()
  })

  it('submits manual project with optional description', async () => {
    const workspace = buildWorkspace()
    mockUseWorkspace.mockReturnValue(workspace)

    renderPage()

    fireEvent.change(screen.getByLabelText(/project name/i), { target: { value: '  Apollo  ' } })
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: '  Important scope  ' } })
    fireEvent.change(screen.getByLabelText(/customer/i), { target: { value: '  ACME  ' } })
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-07-10' } })
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2026-07-20' } })

    fireEvent.click(screen.getByRole('button', { name: /create project/i }))

    await waitFor(() => {
      expect(workspace.addProject).toHaveBeenCalledWith({
        name: 'Apollo',
        description: 'Important scope',
        customerName: 'ACME',
        startDate: '2026-07-10',
        endDate: '2026-07-20',
      })
    })
  })

  it('renders deduplicated customer suggestions', () => {
    const workspace = buildWorkspace()
    mockUseWorkspace.mockReturnValue(workspace)

    renderPage()

    const options = Array.from(document.querySelectorAll('#project-customer-suggestions option')).map((option) =>
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
})
