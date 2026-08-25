import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectDetailsPage } from './ProjectDetailsPage'
import { useProjectsPageController } from '../../features/projects/hooks/useProjectsPageController'

let mockProjectId: string | undefined = 'p1'
let mockSearchParams = new URLSearchParams()
const mockSetSearchParams = vi.fn()
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ projectId: mockProjectId }),
    useSearchParams: () => [mockSearchParams, mockSetSearchParams] as const,
  }
})

vi.mock('../../features/projects/components', () => ({
  ProjectDetailsSection: (props: {
    activeTab: string
    onTabChange: (tab: 'overview' | 'collaboration' | 'tasks' | 'estimates' | 'team' | 'settings') => void
    onNavigateToTasks?: () => void
    onTaskClick?: (taskId: string) => void
    onOpenDeleteConfirm?: () => void
  }) => (
    <div>
      <div data-testid="project-details-section">mounted</div>
      <div data-testid="section-active-tab">{props.activeTab}</div>
      <button type="button" onClick={() => props.onTabChange('team')}>section-tab-team</button>
      <button type="button" onClick={() => props.onNavigateToTasks?.()}>section-goto-tasks</button>
      <button type="button" onClick={() => props.onTaskClick?.('t1')}>section-open-task</button>
      <button type="button" onClick={() => props.onOpenDeleteConfirm?.()}>section-open-delete</button>
    </div>
  ),
}))

vi.mock('../../shared/components', () => ({
  ConfirmDialog: ({
    isOpen,
    title,
    onCancel,
    onConfirm,
  }: {
    isOpen: boolean
    title: string
    onCancel: () => void
    onConfirm: () => void
  }) => (
    isOpen ? (
      <div>
        <span>{title}</span>
        <button type="button" onClick={onCancel}>{`cancel-${title}`}</button>
        <button type="button" onClick={onConfirm}>{`confirm-${title}`}</button>
      </div>
    ) : null
  ),
}))

vi.mock('../../features/projects/hooks/useProjectsPageController', () => ({
  useProjectsPageController: vi.fn(),
}))

const mockUseProjectsPageController = vi.mocked(useProjectsPageController)

function buildController(overrides: Record<string, unknown> = {}) {
  return {
    isLoading: false,
    tasks: [],
    projectMembers: [],
    selectedProject: {
      id: 'p1',
      name: 'Apollo',
      status: 'active',
      owner_id: 'u-owner',
    },
    selectedProjectId: 'p1',
    currentUserProfile: null,
    myRoleInSelectedProject: 'manager',
    canManageProject: vi.fn(() => true),
    canDeleteSelectedProject: true,
    canManageMemberRoles: true,
    canInviteToSelectedProject: true,
    canAssignAdminRole: true,
    canAssignManagerRole: true,
    effectiveMemberRole: 'member',
    teamMemberNames: [],
    projectManagerName: 'Manager',
    incompleteTaskCount: 0,
    activeTab: 'overview',
    setActiveTab: vi.fn(),
    memberEmail: '',
    setMemberEmail: vi.fn(),
    setMemberRole: vi.fn(),
    pendingRoleByUserId: {},
    updatePendingRole: vi.fn(),
    isCompleteConfirmOpen: false,
    setIsCompleteConfirmOpen: vi.fn(),
    isSaveSettingsConfirmOpen: false,
    setIsSaveSettingsConfirmOpen: vi.fn(),
    isDeleteConfirmOpen: false,
    setIsDeleteConfirmOpen: vi.fn(),
    currentSettingsDraft: {
      name: 'Apollo',
      description: '',
      customerName: '',
      startDate: '',
      deadline: '',
      budgetAmount: '',
      useEstimates: false,
    },
    updateSettingsDraft: vi.fn(),
    inviteMemberHandler: vi.fn(async () => undefined),
    completeProjectHandler: vi.fn(async () => undefined),
    saveProjectSettings: vi.fn(async () => undefined),
    saveUseEstimatesSetting: vi.fn(async () => true),
    deleteSelectedProjectHandler: vi.fn(async () => undefined),
    updateMemberRoleHandler: vi.fn(async () => undefined),
    selectProject: vi.fn(async () => undefined),
    ...overrides,
  }
}

describe('ProjectDetailsPage', () => {
  beforeEach(() => {
    mockProjectId = 'p1'
    mockSearchParams = new URLSearchParams()
    mockNavigate.mockReset()
    mockSetSearchParams.mockReset()
  })

  it('selects project from route and syncs tab from query', async () => {
    const controller = buildController({
      selectedProjectId: 'different-project',
      activeTab: 'overview',
      setActiveTab: vi.fn(),
    })
    mockSearchParams = new URLSearchParams('tab=team')
    mockUseProjectsPageController.mockReturnValue(controller as never)

    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(controller.selectProject).toHaveBeenCalledWith('p1')
      expect(controller.setActiveTab).toHaveBeenCalledWith('team')
    })
  })

  it('handles sidebar and section navigation callbacks', async () => {
    const controller = buildController()
    mockUseProjectsPageController.mockReturnValue(controller as never)

    render(<ProjectDetailsPage />)

    fireEvent.click(screen.getByRole('button', { name: /Tasks/ }))
    expect(mockNavigate).toHaveBeenCalledWith('/app/tasks?projectId=p1')

    fireEvent.click(screen.getByRole('button', { name: /Team/ }))
    expect(controller.setActiveTab).toHaveBeenCalledWith('team')
    expect(mockSetSearchParams).toHaveBeenCalledWith({ tab: 'team' })

    fireEvent.click(screen.getByRole('button', { name: /Overview/ }))
    expect(mockSetSearchParams).toHaveBeenCalledWith({})

    fireEvent.click(screen.getByRole('button', { name: '← Projects' }))
    expect(mockNavigate).toHaveBeenCalledWith('/app/projects')

    fireEvent.click(screen.getByRole('button', { name: 'section-tab-team' }))
    expect(controller.setActiveTab).toHaveBeenCalledWith('team')

    fireEvent.click(screen.getByRole('button', { name: 'section-goto-tasks' }))
    expect(mockNavigate).toHaveBeenCalledWith('/app/tasks?projectId=p1')

    fireEvent.click(screen.getByRole('button', { name: 'section-open-task' }))
    expect(mockNavigate).toHaveBeenCalledWith('/app/tasks/t1', {
      state: { backTo: '/app/projects/p1?tab=tasks' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'section-open-delete' }))
    expect(controller.setIsDeleteConfirmOpen).toHaveBeenCalledWith(true)
  })

  it('redirects to projects list when route has no project id', async () => {
    mockProjectId = undefined
    const controller = buildController()
    mockUseProjectsPageController.mockReturnValue(controller as never)

    render(<ProjectDetailsPage />)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/app/projects', { replace: true })
    })
  })

  it('navigates to projects list after successful delete confirmation', async () => {
    const controller = buildController({
      isDeleteConfirmOpen: true,
      deleteSelectedProjectHandler: vi.fn(async () => true),
    })
    mockUseProjectsPageController.mockReturnValue(controller as never)

    render(<ProjectDetailsPage />)

    fireEvent.click(screen.getByRole('button', { name: 'confirm-Delete project' }))

    await waitFor(() => {
      expect(controller.deleteSelectedProjectHandler).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/app/projects')
    })
  })
})
