import type { ProjectPreview, TaskPreview } from '../../../../lib/pm'
import type { ProjectRoleName } from '../../../../shared/utils/permissions'
import { useEffect, useState } from 'react'
import { EstimatesTab } from '../estimates'
import { ProjectCollaborationTab } from './ProjectCollaborationTab'
import { TeamAccessSection } from './TeamAccessSection'
import { ProjectOverviewTab } from './tabs/ProjectOverviewTab'
import { ProjectSettingsTab } from './tabs/ProjectSettingsTab'

export type DetailsTab = 'overview' | 'tasks' | 'estimates' | 'collaboration' | 'team' | 'settings'

interface ProjectDetailsSectionProps {
  selectedProject: ProjectPreview | null
  selectedProjectId: string | null
  myRoleInSelectedProject?: ProjectRoleName | null
  isLoading: boolean
  canManageProject: (projectId: string) => boolean
  activeTab: DetailsTab
  onTabChange: (tab: DetailsTab) => void
  settingsName: string
  onSettingsNameChange: (value: string) => void
  settingsDescription: string
  onSettingsDescriptionChange: (value: string) => void
  settingsCustomerName: string
  onSettingsCustomerNameChange: (value: string) => void
  settingsStartDate: string
  onSettingsStartDateChange: (value: string) => void
  settingsDeadline: string
  onSettingsDeadlineChange: (value: string) => void
  settingsBudgetAmount: string
  onSettingsBudgetAmountChange: (value: string) => void
  settingsUseEstimates: boolean
  onSettingsUseEstimatesChange: (value: boolean) => void
  canEditSelectedProject: boolean
  canDeleteSelectedProject?: boolean
  canManageMemberRoles?: boolean
  tasks: TaskPreview[]
  incompleteTaskCount?: number
  teamMemberNames: string[]
  projectManagerName?: string
  canInviteToSelectedProject: boolean
  memberEmail: string
  onMemberEmailChange: (value: string) => void
  memberRole: string
  onMemberRoleChange: (value: string) => void
  canAssignAdminRole: boolean
  canAssignManagerRole?: boolean
  onInviteMember: () => void | Promise<void>
  projectMembers: import('../../../../lib/pm').ProjectMemberListItem[]
  pendingRoleByUserId: Record<string, string>
  onPendingRoleChange: (userId: string, role: string) => void
  selectedProjectOwnerId: string | null | undefined
  onSaveRole: (userId: string, fallbackRole: string) => void | Promise<void>
  onOpenDeleteConfirm?: () => void
  onOpenCompleteConfirm: () => void
  onOpenSaveSettingsConfirm: () => void
  onTaskClick?: (taskId: string) => void
  onNavigateToTasks?: () => void
}

export function ProjectDetailsSection({
  selectedProject,
  selectedProjectId,
  myRoleInSelectedProject,
  isLoading,
  canManageProject,
  activeTab,
  onTabChange,
  settingsName,
  onSettingsNameChange,
  settingsDescription,
  onSettingsDescriptionChange,
  settingsCustomerName,
  onSettingsCustomerNameChange,
  settingsStartDate,
  onSettingsStartDateChange,
  settingsDeadline,
  onSettingsDeadlineChange,
  settingsBudgetAmount,
  onSettingsBudgetAmountChange,
  settingsUseEstimates,
  onSettingsUseEstimatesChange,
  canEditSelectedProject,
  canDeleteSelectedProject,
  canManageMemberRoles,
  tasks,
  incompleteTaskCount,
  teamMemberNames,
  projectManagerName,
  canInviteToSelectedProject,
  memberEmail,
  onMemberEmailChange,
  memberRole,
  onMemberRoleChange,
  canAssignAdminRole,
  canAssignManagerRole,
  onInviteMember,
  projectMembers,
  pendingRoleByUserId,
  onPendingRoleChange,
  selectedProjectOwnerId,
  onSaveRole,
  onOpenDeleteConfirm,
  onOpenCompleteConfirm,
  onOpenSaveSettingsConfirm,
  onNavigateToTasks,
}: ProjectDetailsSectionProps) {
  const [isTabLoading, setIsTabLoading] = useState(false)

  useEffect(() => {
    if (!selectedProject) {
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsTabLoading(true)
    const timeoutId = window.setTimeout(() => {
      setIsTabLoading(false)
    }, 180)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeTab, selectedProject])

  return (
    <section className="page-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">
            {selectedProject ? selectedProject.name : 'Select a project'}
          </h3>
          {selectedProject ? (
            <p className="mt-0.5 text-sm text-slate-500">{selectedProject.status ?? 'active'}</p>
          ) : (
            <p className="mt-0.5 text-sm text-slate-500">Select a project from the table to open details</p>
          )}
          {myRoleInSelectedProject ? (
            <p className="mt-1 text-xs text-cyan-700">Your role: {myRoleInSelectedProject}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onOpenCompleteConfirm}
          disabled={
            isLoading ||
            !selectedProjectId ||
            !selectedProject ||
            (incompleteTaskCount ?? 0) > 0 ||
            (selectedProject.status ?? '').toLowerCase() === 'completed' ||
            !canManageProject(selectedProjectId)
          }
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Complete project
        </button>
      </div>

      {!selectedProject ? (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
          No project selected
        </p>
      ) : (
        <>
          {isTabLoading ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              Loading module...
            </div>
          ) : null}

          {!isTabLoading && activeTab === 'overview' ? (
            <ProjectOverviewTab
              selectedProject={selectedProject}
              tasks={tasks}
              projectManagerName={projectManagerName}
              teamMemberNames={teamMemberNames}
            />
          ) : null}

          {!isTabLoading && activeTab === 'team' ? (
            <div className="mt-4">
              <TeamAccessSection
                isEmbedded
                canInviteToSelectedProject={canInviteToSelectedProject}
                memberEmail={memberEmail}
                onMemberEmailChange={onMemberEmailChange}
                memberRole={memberRole}
                onMemberRoleChange={onMemberRoleChange}
                canAssignAdminRole={canAssignAdminRole}
                canAssignManagerRole={canAssignManagerRole}
                onInviteMember={onInviteMember}
                isLoading={isLoading}
                selectedProjectId={selectedProjectId}
                projectMembers={projectMembers}
                canManageMemberRoles={canManageMemberRoles}
                pendingRoleByUserId={pendingRoleByUserId}
                onPendingRoleChange={onPendingRoleChange}
                selectedProjectOwnerId={selectedProjectOwnerId}
                onSaveRole={onSaveRole}
              />
            </div>
          ) : null}

          {!isTabLoading && activeTab === 'settings' ? (
            <ProjectSettingsTab
              settingsName={settingsName}
              onSettingsNameChange={onSettingsNameChange}
              settingsDescription={settingsDescription}
              onSettingsDescriptionChange={onSettingsDescriptionChange}
              settingsCustomerName={settingsCustomerName}
              onSettingsCustomerNameChange={onSettingsCustomerNameChange}
              settingsStartDate={settingsStartDate}
              onSettingsStartDateChange={onSettingsStartDateChange}
              settingsDeadline={settingsDeadline}
              onSettingsDeadlineChange={onSettingsDeadlineChange}
              settingsBudgetAmount={settingsBudgetAmount}
              onSettingsBudgetAmountChange={onSettingsBudgetAmountChange}
              settingsUseEstimates={settingsUseEstimates}
              onSettingsUseEstimatesChange={onSettingsUseEstimatesChange}
              canEditSelectedProject={canEditSelectedProject}
              canDeleteSelectedProject={canDeleteSelectedProject}
              isLoading={isLoading}
              onOpenSaveSettingsConfirm={onOpenSaveSettingsConfirm}
              onOpenDeleteConfirm={onOpenDeleteConfirm}
            />
          ) : null}

          {!isTabLoading && activeTab === 'estimates' ? (
            <EstimatesTab projectId={selectedProject.id} canEdit={canEditSelectedProject} />
          ) : null}

          {!isTabLoading && activeTab === 'collaboration' ? (
            <ProjectCollaborationTab projectId={selectedProject.id} canEdit={canEditSelectedProject} />
          ) : null}

        </>
      )}
    </section>
  )
}
