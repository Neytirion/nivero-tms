import { useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ProjectDetailsSection } from '../../features/projects/components'
import type { DetailsTab } from '../../features/projects/components'
import { ConfirmDialog } from '../../shared/components'
import { useProjectsPageController } from './useProjectsPageController'

const detailsTabs: DetailsTab[] = ['overview', 'collaboration', 'tasks', 'estimates', 'team', 'settings']

function parseTab(value: string | null): DetailsTab | null {
  if (!value) {
    return null
  }

  return detailsTabs.includes(value as DetailsTab) ? (value as DetailsTab) : null
}

export function ProjectDetailsPage() {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const {
    status,
    isLoading,
    tasks,
    projects,
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
    teamMemberNames,
    projectManagerName,
    incompleteTaskCount,
    activeTab,
    setActiveTab,
    memberEmail,
    setMemberEmail,
    setMemberRole,
    pendingRoleByUserId,
    updatePendingRole,
    isCompleteConfirmOpen,
    setIsCompleteConfirmOpen,
    isSaveSettingsConfirmOpen,
    setIsSaveSettingsConfirmOpen,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    currentSettingsDraft,
    updateSettingsDraft,
    inviteMemberHandler,
    completeProjectHandler,
    saveProjectSettings,
    deleteSelectedProjectHandler,
    updateMemberRoleHandler,
    selectProject,
  } = useProjectsPageController()

  useEffect(() => {
    if (!projectId) {
      navigate('/app/projects', { replace: true })
      return
    }

    // If project was deleted or doesn't exist in the projects list, redirect to projects page
    const projectExists = projects.some((p) => p.id === projectId)
    if (!projectExists) {
      navigate('/app/projects', { replace: true })
      return
    }

    if (selectedProjectId === projectId) {
      return
    }

    void selectProject(projectId)
    // selectProject reference is intentionally omitted to avoid rerun loops from unstable function identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, projectId, selectedProjectId, projects])

  useEffect(() => {
    const requestedTab = parseTab(searchParams.get('tab'))

    if (requestedTab && requestedTab !== activeTab) {
      setActiveTab(requestedTab)
    }
  }, [activeTab, searchParams, setActiveTab])

  const canEditSelectedProject = selectedProject ? canManageProject(selectedProject.id) : false

  return (
    <div className="space-y-5">
      <section className="page-section bg-[linear-gradient(120deg,rgba(14,116,144,0.08),rgba(2,132,199,0.03))]">
        <div className="flex flex-wrap items-start gap-3">
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => navigate('/app/projects')}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Back to projects
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Projects</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Project Details</h2>
            <p className="mt-2 text-sm text-slate-600">Review project health, tasks, estimates, collaboration, team access, and settings.</p>
          </div>
        </div>
        <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{status}</p>
      </section>

      <ProjectDetailsSection
        selectedProject={selectedProject}
        selectedProjectId={selectedProjectId}
        myRoleInSelectedProject={myRoleInSelectedProject}
        isLoading={isLoading}
        canManageProject={canManageProject}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab)
          setSearchParams(tab === 'overview' ? {} : { tab })
        }}
        settingsName={currentSettingsDraft.name}
        onSettingsNameChange={(value) => updateSettingsDraft({ name: value })}
        settingsDescription={currentSettingsDraft.description}
        onSettingsDescriptionChange={(value) => updateSettingsDraft({ description: value })}
        settingsCustomerName={currentSettingsDraft.customerName}
        onSettingsCustomerNameChange={(value) => updateSettingsDraft({ customerName: value })}
        settingsStartDate={currentSettingsDraft.startDate}
        onSettingsStartDateChange={(value) => updateSettingsDraft({ startDate: value })}
        settingsDeadline={currentSettingsDraft.deadline}
        onSettingsDeadlineChange={(value) => updateSettingsDraft({ deadline: value })}
        settingsBudgetAmount={currentSettingsDraft.budgetAmount}
        onSettingsBudgetAmountChange={(value) => updateSettingsDraft({ budgetAmount: value })}
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
        onPendingRoleChange={updatePendingRole}
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
    </div>
  )
}
