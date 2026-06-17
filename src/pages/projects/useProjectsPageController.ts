import { useEffect } from 'react'
import { useWorkspace } from '../../features/dashboard/workspace-context.tsx'
import { useProjectForm } from '../../features/projects/hooks/useProjectForm.ts'
import { deriveRisk } from '../../features/projects/utils/project-metrics.ts'
import { hasProjectPermission } from '../../shared/utils/permissions'
import type { DetailsTab } from '../../features/projects/components'
import { useProjectsPageFilters } from './useProjectsPageFilters'
import { useProjectsMemberForm } from './useProjectsMemberForm'
import { useProjectsSettingsForm } from './useProjectsSettingsForm'
import { useProjectsModals } from './useProjectsModals'
import { useProjectsActions, type UseProjectsActionsInput } from './useProjectsActions'

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
    settingsDraft,
    currentSettingsDraft,
    setSettingsDraft,
    updateSettingsDraft,
    resetSettingsDraft,
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

  // Derived state from workspace and permissions
  const myRoleInSelectedProject = selectedProject ? getProjectRole(selectedProject.id) : null
  const canEditSelectedProject = selectedProject ? canManageProject(selectedProject.id) : false
  const canDeleteSelectedProject = selectedProject ? canDeleteProject(selectedProject.id) : false
  const canInviteToSelectedProject = selectedProject
    ? canInviteToProject(selectedProject.id)
    : false
  const canManageMemberRoles = hasProjectPermission(myRoleInSelectedProject, 'member.role.update')
  const canAssignAdminRole =
    selectedProject?.owner_id != null && selectedProject.owner_id === currentUserId
  const canAssignManagerRole = myRoleInSelectedProject === 'owner' || myRoleInSelectedProject === 'admin'

  const totalProjects = projects.length
  const activeProjects = projects.filter(
    (project) => (project.status ?? '').toLowerCase() !== 'completed',
  ).length
  const completedProjects = projects.filter(
    (project) => (project.status ?? '').toLowerCase() === 'completed',
  ).length
  const riskProjects = projects.filter((project) => deriveRisk(project) === 'Red').length
  const teamMemberNames = projectMembers.map((member) => member.full_name ?? member.email ?? 'Unknown')
  const teamMemberNameByUserId = projectMembers.reduce<Record<string, string>>((acc, member) => {
    if (member.user_id) {
      acc[member.user_id] = member.full_name ?? member.email ?? member.user_id
    }
    return acc
  }, {})
  const projectManagerName = selectedProject?.project_manager_id
    ? teamMemberNameByUserId[selectedProject.project_manager_id] ?? 'Assigned'
    : 'Not set'
  const incompleteTaskCount = tasks.filter(
    (task) =>
      (task.status ?? '').toLowerCase() !== 'done' &&
      (task.status ?? '').toLowerCase() !== 'completed',
  ).length

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
