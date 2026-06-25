import { useEffect } from 'react'
import { useWorkspace } from '../../features/dashboard/workspace-context.tsx'
import { useProjectForm } from '../../features/projects/hooks/useProjectForm.ts'
import { useProjectsPageFilters } from './useProjectsPageFilters'
import { useProjectsMemberForm } from './useProjectsMemberForm'
import { useProjectsSettingsForm } from './useProjectsSettingsForm'
import { useProjectsModals } from './useProjectsModals'
import { useProjectsActions, type UseProjectsActionsInput } from './useProjectsActions'
import { useProjectsDerivedState } from './useProjectsDerivedState'

/**
 * Compose projects page hooks into a cohesive controller
 *
 * Refactored from monolithic 294-line hook into:
 * - useProjectsPageFilters: search, tab selection, filtered projects
 * - useProjectsMemberForm: member invite form state, role assignment
 * - useProjectsSettingsForm: project metadata editing form state
 * - useProjectsModals: dialog open/close states
 * - useProjectsActions: all async handlers and user actions
 *
 * Benefits:
 * - Each hook has single responsibility
 * - Easier to test, reuse, and maintain
 * - Clearer data flow and concerns separation
 * - Main controller now coordinates composition
 */
export function useProjectsPageController() {
  const {
    projectName,
    setProjectName,
    projectCustomer,
    setProjectCustomer,
    projectStartDate,
    setProjectStartDate,
    projectEndDate,
    setProjectEndDate,
    canSubmit,
    reset,
  } = useProjectForm()

  const {
    status,
    setStatus,
    isLoading,
    projects,
    tasks,
    projectMembers,
    selectedProjectId,
    currentUserId,
    getProjectRole,
    canManageProject,
    canDeleteProject,
    canInviteToProject,
    loadDashboardPreview,
    selectProject,
    addProject,
    editProject,
    removeProject,
    inviteMemberToSelectedProjectByEmail,
    changeSelectedProjectMemberRole,
    completeSelectedProject,
  } = useWorkspace()

  // Filters: search and tab selection
  const {
    searchValue,
    activeTab,
    setSearchValue,
    applySearch,
    setActiveTab,
    filteredProjects,
  } = useProjectsPageFilters(projects)

  // Derived state from workspace - needed early for settings form
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null

  // Member management: invite form and role assignment
  const {
    memberEmail,
    memberRole,
    pendingRoleByUserId,
    effectiveMemberRole,
    setMemberEmail,
    setMemberRole,
    setPendingRoleByUserId,
    updatePendingRole,
    resetMemberForm,
  } = useProjectsMemberForm(
    selectedProjectId ? canDeleteProject(selectedProjectId) : false, // canAssignAdminRole approximation
    selectedProjectId ? canManageProject(selectedProjectId) : false, // canAssignManagerRole approximation
  )

  // Settings form: project metadata editing
  const {
    currentSettingsDraft,
    updateSettingsDraft,
  } = useProjectsSettingsForm(selectedProject ?? null)

  // Modals: dialog states
  const {
    isCreateModalOpen,
    isCompleteConfirmOpen,
    isSaveSettingsConfirmOpen,
    isDeleteConfirmOpen,
    setIsCreateModalOpen,
    setIsCompleteConfirmOpen,
    setIsSaveSettingsConfirmOpen,
    setIsDeleteConfirmOpen,
  } = useProjectsModals()

  // Actions: all async handlers
  const actionsInput: UseProjectsActionsInput = {
    selectedProjectId,
    selectedProject: selectedProject ?? null,
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
    loadDashboardPreview,
    onCreateModalClose: () => setIsCreateModalOpen(false),
    onCompleteConfirmClose: () => setIsCompleteConfirmOpen(false),
    onSaveSettingsConfirmClose: () => setIsSaveSettingsConfirmOpen(false),
    onDeleteConfirmClose: () => setIsDeleteConfirmOpen(false),
  }

  const {
    createProjectHandler,
    createProjectFromAiDraftHandler,
    inviteMemberHandler: inviteMemberHandlerRaw,
    completeProjectHandler,
    saveProjectSettings,
    deleteSelectedProjectHandler,
    updateMemberRoleHandler: updateMemberRoleHandlerRaw,
  } = useProjectsActions(actionsInput)

  const {
    myRoleInSelectedProject,
    canEditSelectedProject,
    canDeleteSelectedProject,
    canInviteToSelectedProject,
    canManageMemberRoles,
    canAssignAdminRole,
    canAssignManagerRole,
    totalProjects,
    activeProjects,
    completedProjects,
    riskProjects,
    teamMemberNames,
    projectManagerName,
    incompleteTaskCount,
  } = useProjectsDerivedState({
    selectedProject,
    projects,
    tasks,
    projectMembers,
    currentUserId,
    getProjectRole,
    canManageProject,
    canDeleteProject,
    canInviteToProject,
  })

  // Sync selected project when URL changes
  useEffect(() => {
    if (!selectedProjectId) {
      return
    }

    void selectProject(selectedProjectId)
    // Intentionally track selected project only to refresh members/tasks snapshot on page entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId])

  // Wrapper handlers with form reset
  const inviteMemberHandler = async () => {
    await inviteMemberHandlerRaw(memberEmail, effectiveMemberRole)
    resetMemberForm()
  }

  const updateMemberRoleHandler = async (userId: string, fallbackRole: string) => {
    await updateMemberRoleHandlerRaw(userId, fallbackRole, pendingRoleByUserId)
  }

  return {
    // Data from workspace
    status,
    isLoading,
    projects,
    tasks,
    projectMembers,
    selectedProject,
    selectedProjectId,

    // Permissions & derived states
    myRoleInSelectedProject,
    canManageProject,
    canEditSelectedProject,
    canDeleteSelectedProject,
    canManageMemberRoles,
    canInviteToSelectedProject,
    canAssignAdminRole,
    canAssignManagerRole,

    // Statistics
    totalProjects,
    activeProjects,
    completedProjects,
    riskProjects,
    teamMemberNames,
    projectManagerName,
    incompleteTaskCount,

    // Filters
    searchValue,
    setSearchValue,
    applySearch,
    filteredProjects,
    activeTab,
    setActiveTab,

    // Member form
    memberEmail,
    setMemberEmail,
    memberRole,
    setMemberRole,
    effectiveMemberRole,
    pendingRoleByUserId,
    setPendingRoleByUserId,
    updatePendingRole,

    // Settings form
    currentSettingsDraft,
    updateSettingsDraft,

    // Modals
    isCompleteConfirmOpen,
    setIsCompleteConfirmOpen,
    isSaveSettingsConfirmOpen,
    setIsSaveSettingsConfirmOpen,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    isCreateModalOpen,
    setIsCreateModalOpen,

    // Project form (from useProjectForm)
    projectName,
    setProjectName,
    projectCustomer,
    setProjectCustomer,
    projectStartDate,
    setProjectStartDate,
    projectEndDate,
    setProjectEndDate,
    canSubmit,
    reset,

    // Actions
    createProjectHandler,
    createProjectFromAiDraftHandler,
    inviteMemberHandler,
    completeProjectHandler,
    saveProjectSettings,
    deleteSelectedProjectHandler,
    updateMemberRoleHandler,
    loadDashboardPreview,
    selectProject,
  }
}
