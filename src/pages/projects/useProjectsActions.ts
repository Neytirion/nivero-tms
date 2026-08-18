import type { AiProjectDraft } from '../../lib/ai'
import { createProjectFromAiDraft } from '../../lib/ai/ai-mapper'
import type { ProjectPreview } from '../../lib/pm'

export interface UseProjectsActionsInput {
  selectedProjectId: string | null
  selectedProject: ProjectPreview | null
  currentUserId: string | null
  currentUserEmail: string | null
  projectName: string
  projectCustomer: string
  projectStartDate: string
  projectEndDate: string
  currentSettingsDraft: {
    projectId: string | null
    name: string
    description: string
    customerName: string
    startDate: string
    deadline: string
    budgetAmount: string
    useEstimates: boolean
  }
  setStatus: (status: string) => void
  canSubmit: boolean
  reset: () => void
  addProject: (input: {
    name: string
    description?: string
    customerName?: string
    budgetAmount?: number
    startDate?: string
    endDate?: string
    useEstimates?: boolean
  }) => Promise<string | null>
  editProject: (
    projectId: string,
    input: {
      name: string
      description: string
      customerName?: string
      startDate?: string
      deadlineAt?: string
      budgetAmount?: string
      useEstimates?: boolean
    },
  ) => Promise<boolean>
  removeProject: (projectId: string) => Promise<void>
  completeSelectedProject: () => Promise<void>
  inviteMemberToSelectedProjectByEmail: (email: string, role: string) => Promise<void>
  changeSelectedProjectMemberRole: (userId: string, role: string) => Promise<void>
  removeProjectMember: (projectId: string, userId: string) => Promise<void>
  loadDashboardPreview: () => Promise<void>
  onCreateModalClose: () => void
  onCompleteConfirmClose: () => void
  onSaveSettingsConfirmClose: () => void
  onDeleteConfirmClose: () => void
}

export interface UseProjectsActionsReturn {
  createProjectHandler: () => Promise<void>
  createProjectFromAiDraftHandler: (draft: AiProjectDraft) => Promise<void>
  inviteMemberHandler: (email: string, role: string) => Promise<void>
  completeProjectHandler: () => Promise<void>
  saveProjectSettings: () => Promise<void>
  saveUseEstimatesSetting: (nextValue: boolean) => Promise<boolean>
  deleteSelectedProjectHandler: () => Promise<boolean>
  updateMemberRoleHandler: (userId: string, fallbackRole: string, pendingRoles: Record<string, string>) => Promise<void>
  removeMemberHandler: (userId: string) => Promise<void>
}

/**
 * Handle all async operations and user actions for projects page
 */
export function useProjectsActions(input: UseProjectsActionsInput): UseProjectsActionsReturn {
  const {
    selectedProjectId,
    selectedProject,
    currentUserId,
    currentUserEmail,
    projectName,
    projectCustomer,
    projectStartDate,
    projectEndDate,
    currentSettingsDraft,
    setStatus,
    canSubmit,
    reset,
    addProject,
    editProject,
    removeProject,
    completeSelectedProject,
    inviteMemberToSelectedProjectByEmail,
    changeSelectedProjectMemberRole,
    removeProjectMember,
    loadDashboardPreview,
    onCreateModalClose,
    onCompleteConfirmClose,
    onSaveSettingsConfirmClose,
    onDeleteConfirmClose,
  } = input

  const createProjectHandler = async () => {
    if (!canSubmit) {
      return
    }

    try {
      await addProject({
        name: projectName.trim(),
        customerName: projectCustomer.trim() || undefined,
        startDate: projectStartDate || undefined,
        endDate: projectEndDate || undefined,
      })
      reset()
      onCreateModalClose()
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Project creation error: ${error.message}`
          : 'Project creation error',
      )
    }
  }

  const createProjectFromAiDraftHandler = async (draft: AiProjectDraft) => {
    try {
      setStatus('Creating project from AI draft (atomic operation)...')

      // The createProjectFromAiDraft now uses a single database transaction:
      // entire project (with estimate, work packages, and tasks) is created
      // or rolled back as a single unit, preventing partial data states.
      const result = await createProjectFromAiDraft(draft)

      setStatus(
        `✓ Project created: "${result.projectId.slice(0, 8)}..." with ${result.taskCount} tasks`,
      )
      reset()
      onCreateModalClose()

      // Refresh projects to show newly created one
      await loadDashboardPreview()
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create project from AI draft'
      setStatus(`✗ Error: ${errorMessage}`)
      console.error('Error creating project from AI draft:', error)
    }
  }

  const inviteMemberHandler = async (email: string, role: string) => {
    const trimmedEmail = email.trim().toLowerCase()

    if (!selectedProjectId) {
      setStatus('Select a project before inviting members')
      return
    }

    if (!trimmedEmail) {
      setStatus('Member email is required')
      return
    }

    // Prevent inviting yourself
    if (trimmedEmail === currentUserEmail?.toLowerCase()) {
      setStatus('You cannot invite yourself to a project')
      return
    }

    try {
      await inviteMemberToSelectedProjectByEmail(trimmedEmail, role)
      setStatus(`✓ Invited ${trimmedEmail} as ${role}`)
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Invite error: ${error.message}`
          : 'Failed to invite member',
      )
    }
  }

  const removeMemberHandler = async (userId: string) => {
    if (!selectedProjectId) {
      setStatus('Select a project before removing members')
      return
    }

    // Prevent removing yourself
    if (userId === currentUserId) {
      setStatus('You cannot remove yourself from the project')
      return
    }

    try {
      // Remove member with task unassignment to owner
      await removeProjectMember(selectedProjectId, userId)
      setStatus('Member removed from project and tasks reassigned to owner')
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Remove member error: ${error.message}`
          : 'Failed to remove member',
      )
    }
  }

  const completeProjectHandler = async () => {
    if (!selectedProject) {
      return
    }

    try {
      await completeSelectedProject()
      onCompleteConfirmClose()
      setStatus('Project marked as completed')
    } catch (error) {
      setStatus(
        error instanceof Error ? `Complete error: ${error.message}` : 'Failed to complete project',
      )
    }
  }

  const saveProjectSettings = async () => {
    if (!selectedProject) {
      return
    }

    if (
      currentSettingsDraft.startDate &&
      currentSettingsDraft.deadline &&
      currentSettingsDraft.deadline < currentSettingsDraft.startDate
    ) {
      setStatus('Planned end date cannot be earlier than start date')
      return
    }

    try {
      const wasSaved = await editProject(selectedProject.id, {
        name: currentSettingsDraft.name,
        description: currentSettingsDraft.description,
        customerName: currentSettingsDraft.customerName || undefined,
        startDate: currentSettingsDraft.startDate || undefined,
        deadlineAt: currentSettingsDraft.deadline || undefined,
        budgetAmount: currentSettingsDraft.budgetAmount || undefined,
        useEstimates: currentSettingsDraft.useEstimates,
      })

      if (wasSaved) {
        onSaveSettingsConfirmClose()
        setStatus('✓ Project settings saved')
      }
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Save error: ${error.message}`
          : 'Failed to save project settings',
      )
    }
  }

  const saveUseEstimatesSetting = async (nextValue: boolean) => {
    if (!selectedProject) {
      return false
    }

    try {
      const wasSaved = await editProject(selectedProject.id, {
        name: selectedProject.name,
        description: selectedProject.description ?? '',
        useEstimates: nextValue,
      })

      if (wasSaved) {
        setStatus(`✓ Estimate versioning ${nextValue ? 'enabled' : 'disabled'}`)
      }

      return wasSaved
    } catch (error) {
      setStatus(
        error instanceof Error
          ? `Estimate toggle error: ${error.message}`
          : 'Failed to update estimate versioning',
      )
      return false
    }
  }

  const deleteSelectedProjectHandler = async () => {
    if (!selectedProjectId) {
      return false
    }

    try {
      await removeProject(selectedProjectId)
      onDeleteConfirmClose()
      setStatus('✓ Project deleted')
      return true
    } catch (error) {
      setStatus(
        error instanceof Error ? `Delete error: ${error.message}` : 'Failed to delete project',
      )
      return false
    }
  }

  const updateMemberRoleHandler = async (
    userId: string,
    fallbackRole: string,
    pendingRoles: Record<string, string>,
  ) => {
    const nextRole = pendingRoles[userId] ?? fallbackRole

    try {
      await changeSelectedProjectMemberRole(userId, nextRole)
      setStatus(`✓ Member role updated to ${nextRole}`)
    } catch (error) {
      setStatus(
        error instanceof Error ? `Role update error: ${error.message}` : 'Failed to update role',
      )
    }
  }

  return {
    createProjectHandler,
    createProjectFromAiDraftHandler,
    inviteMemberHandler,
    completeProjectHandler,
    saveProjectSettings,
    saveUseEstimatesSetting,
    deleteSelectedProjectHandler,
    updateMemberRoleHandler,
    removeMemberHandler,
  }
}
