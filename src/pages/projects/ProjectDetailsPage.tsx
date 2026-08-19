import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ProjectDetailsSection } from '../../features/projects/components'
import type { DetailsTab } from '../../features/projects/components'
import { ConfirmDialog } from '../../shared/components'
import { useProjectsPageController } from './useProjectsPageController'

const detailsTabs: DetailsTab[] = ['overview', 'collaboration', 'tasks', 'estimates', 'team', 'settings']

const tabConfig: { key: DetailsTab | 'tasks'; label: string; icon: string }[] = [
  { key: 'overview',      label: 'Overview',      icon: '▦' },
  { key: 'collaboration', label: 'Collaboration',  icon: '◈' },
  { key: 'tasks',         label: 'Tasks',          icon: '✓' },
  { key: 'estimates',     label: 'Estimates',      icon: '≈' },
  { key: 'team',          label: 'Team',          icon: '◉' },
  { key: 'settings',      label: 'Settings',       icon: '⚙' },
]

function parseTab(value: string | null): DetailsTab | null {
  if (!value) return null
  return detailsTabs.includes(value as DetailsTab) ? (value as DetailsTab) : null
}

export function ProjectDetailsPage() {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isEstimateToggleConfirmOpen, setIsEstimateToggleConfirmOpen] = useState(false)
  const [pendingEstimateToggleValue, setPendingEstimateToggleValue] = useState<boolean | null>(null)

  const {
    isLoading,
    projects,
    tasks,
    projectMembers,
    selectedProject,
    selectedProjectId,
    currentUserProfile,
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
    inviteMemberByEmailAndRoleHandler,
    completeProjectHandler,
    saveProjectSettings,
    saveUseEstimatesSetting,
    deleteSelectedProjectHandler,
    updateMemberRoleHandler,
    removeMemberHandler,
    selectProject,
  } = useProjectsPageController()

  useEffect(() => {
    if (!projectId) {
      navigate('/app/projects', { replace: true })
      return
    }
    // Only select if not already selected
    if (selectedProjectId === projectId) return
    // selectProject will handle loading the project data
    void selectProject(projectId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, projectId, selectedProjectId])

  const activeTabRef = useRef(activeTab)
  useLayoutEffect(() => {
    activeTabRef.current = activeTab
  })

  useEffect(() => {
    const requestedTab = parseTab(searchParams.get('tab'))
    if (requestedTab && requestedTab !== activeTabRef.current) {
      setActiveTab(requestedTab)
    }
  }, [searchParams, setActiveTab])

  const canEditSelectedProject = selectedProject ? canManageProject(selectedProject.id) : false

  const requestEstimateToggle = (value: boolean) => {
    if (value === currentSettingsDraft.useEstimates) {
      return
    }

    setPendingEstimateToggleValue(value)
    setIsEstimateToggleConfirmOpen(true)
  }

  const confirmEstimateToggle = async () => {
    if (pendingEstimateToggleValue === null) {
      setIsEstimateToggleConfirmOpen(false)
      return
    }

    const nextValue = pendingEstimateToggleValue
    const wasSaved = await saveUseEstimatesSetting(nextValue)

    if (wasSaved) {
      updateSettingsDraft({ useEstimates: nextValue })
      setPendingEstimateToggleValue(null)
      setIsEstimateToggleConfirmOpen(false)
      return
    }

    setPendingEstimateToggleValue(null)
    setIsEstimateToggleConfirmOpen(false)
  }

  const cancelEstimateToggle = () => {
    setPendingEstimateToggleValue(null)
    setIsEstimateToggleConfirmOpen(false)
  }

  const handleDeleteProjectConfirm = async () => {
    const wasDeleted = await deleteSelectedProjectHandler()
    if (wasDeleted) {
      navigate('/app/projects')
    }
  }

  const handleTabClick = (key: string) => {
    if (key === 'tasks') {
      navigate(`/app/tasks?projectId=${selectedProjectId}`)
      return
    }
    const tab = key as DetailsTab
    setActiveTab(tab)
    setSearchParams(tab === 'overview' ? {} : { tab })
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => navigate('/app/projects')}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        ← Projects
      </button>

      <div className="px-1">
        <h1 className="text-xl font-bold text-slate-900">
          {selectedProject ? selectedProject.name : '—'}
        </h1>
        <div className="flex items-center gap-2">
          {selectedProject && (
            <span className="text-xs text-slate-400 capitalize">{selectedProject.status ?? 'active'}</span>
          )}
          {myRoleInSelectedProject && (
            <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-800">
              {myRoleInSelectedProject}
            </span>
          )}
        </div>
      </div>

      {/* Content + sidebar nav */}
      <div className="flex gap-4 items-start">
        {/* Content */}
        <div className="min-w-0 flex-1">
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
            settingsUseEstimates={currentSettingsDraft.useEstimates}
            onSettingsUseEstimatesChange={requestEstimateToggle}
            canEditSelectedProject={canEditSelectedProject}
            canDeleteSelectedProject={canDeleteSelectedProject}
            canManageMemberRoles={canManageMemberRoles}
            tasks={tasks}
            incompleteTaskCount={incompleteTaskCount}
            teamMemberNames={teamMemberNames}
            projectManagerName={projectManagerName}
            currentUserProfile={currentUserProfile}
            canInviteToSelectedProject={canInviteToSelectedProject}
            memberEmail={memberEmail}
            onMemberEmailChange={setMemberEmail}
            memberRole={effectiveMemberRole}
            onMemberRoleChange={setMemberRole}
            canAssignAdminRole={canAssignAdminRole}
            canAssignManagerRole={canAssignManagerRole}
            onInviteMember={inviteMemberHandler}
            onQuickInviteMember={inviteMemberByEmailAndRoleHandler}
            projectMembers={projectMembers}
            workspaceProjects={projects}
            pendingRoleByUserId={pendingRoleByUserId}
            onPendingRoleChange={updatePendingRole}
            selectedProjectOwnerId={selectedProject?.owner_id}
            onSaveRole={updateMemberRoleHandler}
            onRemoveMember={removeMemberHandler}
            onOpenDeleteConfirm={() => setIsDeleteConfirmOpen(true)}
            onOpenCompleteConfirm={() => setIsCompleteConfirmOpen(true)}
            onOpenSaveSettingsConfirm={() => setIsSaveSettingsConfirmOpen(true)}
            onNavigateToTasks={() => navigate(`/app/tasks?projectId=${projectId}`)}
            onTaskClick={(taskId) =>
              navigate(`/app/tasks/${taskId}`, {
                state: { backTo: `/app/projects/${projectId}?tab=tasks` },
              })
            }
          />
        </div>

        {/* Right sidebar nav */}
        <nav className="sticky top-4 w-44 shrink-0 rounded-xl border border-slate-200 bg-white py-2">
          <p className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Navigate</p>
          {tabConfig.map(({ key, label, icon }) => {
            const isActive = key !== 'tasks' && activeTab === key
            const isExternal = key === 'tasks'
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleTabClick(key)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-100 font-semibold text-slate-900'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <span className="w-4 shrink-0 text-center text-sm leading-none">{icon}</span>
                <span className="flex-1">{label}</span>
                {isExternal && (
                  <svg className="h-3 w-3 shrink-0 opacity-40" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M9 1h6v6l-2-2-4 4-1-1 4-4-3-3ZM3 3h4v2H5v6h6v-2h2v4H3V3Z" />
                  </svg>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      <ConfirmDialog
        isOpen={isEstimateToggleConfirmOpen}
        title={pendingEstimateToggleValue ? 'Enable estimate versioning' : 'Disable estimate versioning'}
        description={
          pendingEstimateToggleValue
            ? 'Enable estimate versioning for this project? Work packages and estimate versions will become available immediately.'
            : 'Disable estimate versioning for this project? Work package planning will be hidden, but existing task links will remain in history.'
        }
        confirmText={pendingEstimateToggleValue ? 'Enable' : 'Disable'}
        tone={pendingEstimateToggleValue ? 'success' : 'danger'}
        onCancel={cancelEstimateToggle}
        onConfirm={confirmEstimateToggle}
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
        onConfirm={handleDeleteProjectConfirm}
      />
    </div>
  )
}
