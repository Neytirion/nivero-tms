import { ConfirmDialog } from '../shared/components'
import { CreateProjectWithAiModal, ProjectDetailsSection, ProjectsSummaryCards, ProjectsTable } from '../features/projects/components'
import { useProjectsPageController } from './projects/useProjectsPageController'

export function ProjectsPage() {
  const {
    status,
    isLoading,
    tasks,
    projectMembers,
    selectedProject,
    selectedProjectId,
    myRoleInSelectedProject,
    canManageProject,
    canDeleteSelectedProject,
    canManageMemberRoles,
    canInviteToSelectedProject,
    canAssignAdminRole,
    canAssignManagerRole,
    effectiveMemberRole,
    totalProjects,
    activeProjects,
    completedProjects,
    riskProjects,
    teamMemberNames,
    projectManagerName,
    incompleteTaskCount,
    searchValue,
    setSearchValue,
    filteredProjects,
    activeTab,
    setActiveTab,
    memberEmail,
    setMemberEmail,
    setMemberRole,
    pendingRoleByUserId,
    setPendingRoleByUserId,
    isCompleteConfirmOpen,
    setIsCompleteConfirmOpen,
    isSaveSettingsConfirmOpen,
    setIsSaveSettingsConfirmOpen,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    isCreateModalOpen,
    setIsCreateModalOpen,
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
    currentSettingsDraft,
    updateSettingsDraft,
    createProjectHandler,
    createProjectFromAiDraftHandler,
    inviteMemberHandler,
    completeProjectHandler,
    saveProjectSettings,
    deleteSelectedProjectHandler,
    updateMemberRoleHandler,
    loadDashboardPreview,
    selectProject,
  } = useProjectsPageController()

  const canEditSelectedProject = selectedProject ? canManageProject(selectedProject.id) : false

  return (
    <div className="space-y-5">
      <section className="page-section bg-[linear-gradient(120deg,rgba(14,116,144,0.08),rgba(2,132,199,0.03))]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Projects</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Project Portfolio</h2>
            <p className="mt-2 text-sm text-slate-600">Create, filter, and drill down into project health, tasks, estimates, and team access.</p>
          </div>
        </div>
        <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{status}</p>
      </section>

      <ProjectsSummaryCards
        totalProjects={totalProjects}
        activeProjects={activeProjects}
        completedProjects={completedProjects}
        riskProjects={riskProjects}
      />

      <ProjectsTable
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        isLoading={isLoading}
        onOpenCreateProject={() => setIsCreateModalOpen(true)}
        onRefresh={() => void loadDashboardPreview()}
        projects={filteredProjects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(projectId) => void selectProject(projectId)}
        onOpenProjectSettings={(projectId: string) => {
          setActiveTab('settings')
          return selectProject(projectId)
        }}
      />

      <ProjectDetailsSection
        selectedProject={selectedProject}
        selectedProjectId={selectedProjectId}
        myRoleInSelectedProject={myRoleInSelectedProject}
        isLoading={isLoading}
        canManageProject={canManageProject}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        settingsName={currentSettingsDraft.name}
        onSettingsNameChange={(value) => updateSettingsDraft({ name: value })}
        settingsDescription={currentSettingsDraft.description}
        onSettingsDescriptionChange={(value) => updateSettingsDraft({ description: value })}
        settingsStartDate={currentSettingsDraft.startDate}
        onSettingsStartDateChange={(value) => updateSettingsDraft({ startDate: value })}
        settingsDeadline={currentSettingsDraft.deadline}
        onSettingsDeadlineChange={(value) => updateSettingsDraft({ deadline: value })}
        canEditSelectedProject={canEditSelectedProject}
        canDeleteSelectedProject={canDeleteSelectedProject}
        canManageMemberRoles={canManageMemberRoles}
        tasks={tasks}
        incompleteTaskCount={incompleteTaskCount}
        teamMemberNames={teamMemberNames}
        projectManagerName={projectManagerName}
        canInviteToSelectedProject={canInviteToSelectedProject}
        memberEmail={memberEmail}
        onMemberEmailChange={setMemberEmail}
        memberRole={effectiveMemberRole}
        onMemberRoleChange={setMemberRole}
        canAssignAdminRole={canAssignAdminRole}
        canAssignManagerRole={canAssignManagerRole}
        onInviteMember={inviteMemberHandler}
        projectMembers={projectMembers}
        pendingRoleByUserId={pendingRoleByUserId}
        onPendingRoleChange={(userId, role) =>
          setPendingRoleByUserId((prev) => ({
            ...prev,
            [userId]: role,
          }))
        }
        selectedProjectOwnerId={selectedProject?.owner_id}
        onSaveRole={updateMemberRoleHandler}
        onOpenDeleteConfirm={() => setIsDeleteConfirmOpen(true)}
        onOpenCompleteConfirm={() => setIsCompleteConfirmOpen(true)}
        onOpenSaveSettingsConfirm={() => setIsSaveSettingsConfirmOpen(true)}
      />

      <ConfirmDialog
        isOpen={isCompleteConfirmOpen}
        title="Complete project"
        description={`Mark "${selectedProject?.name ?? ''}" as completed? You can keep viewing it in the list.`}
        confirmText="Complete project"
        tone="success"
        onCancel={() => setIsCompleteConfirmOpen(false)}
        onConfirm={completeProjectHandler}
      />

      <ConfirmDialog
        isOpen={isSaveSettingsConfirmOpen}
        title="Save project settings"
        description={`Save changes for "${selectedProject?.name ?? ''}"?`}
        confirmText="Save settings"
        tone="success"
        onCancel={() => setIsSaveSettingsConfirmOpen(false)}
        onConfirm={saveProjectSettings}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete project"
        description={`Delete "${selectedProject?.name ?? ''}"? This action cannot be undone.`}
        confirmText="Delete project"
        tone="danger"
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={deleteSelectedProjectHandler}
      />

      <CreateProjectWithAiModal
        isOpen={isCreateModalOpen}
        projectName={projectName}
        projectCustomer={projectCustomer}
        projectStartDate={projectStartDate}
        projectEndDate={projectEndDate}
        isLoading={isLoading}
        canSubmit={canSubmit}
        onProjectNameChange={setProjectName}
        onProjectCustomerChange={setProjectCustomer}
        onProjectStartDateChange={setProjectStartDate}
        onProjectEndDateChange={setProjectEndDate}
        onCreate={createProjectHandler}
        onCreateFromAiDraft={createProjectFromAiDraftHandler}
        onClose={() => {
          setIsCreateModalOpen(false)
          reset()
        }}
      />
    </div>
  )
}
