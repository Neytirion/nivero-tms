import type { ProjectPreview, TaskPreview } from '../../../../lib/pm'
import type { ProjectRoleName } from '../../../../shared/utils/permissions'
import { EstimatesTab } from '../estimates'
import { ProjectCollaborationTab } from './ProjectCollaborationTab'
import { TeamAccessSection } from './TeamAccessSection'
import { ProjectOverviewTab } from './tabs/ProjectOverviewTab'
import { ProjectSettingsTab } from './tabs/ProjectSettingsTab'
import type { DetailsTab } from './ProjectDetailsSection'
import type { UserProfilePreview } from '../../../../shared/components'

interface ProjectDetailsSectionBodyProps {
  selectedProject: ProjectPreview
  selectedProjectId: string | null
  myRoleInSelectedProject?: ProjectRoleName | null
  isLoading: boolean
  canManageProject: (projectId: string) => boolean
  activeTab: DetailsTab
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
  projectMembers: import('../../../../lib/pm').ProjectMemberListItem[]
  currentUserProfile: UserProfilePreview | null
  projectManagerName?: string
  canInviteToSelectedProject: boolean
  memberEmail: string
  onMemberEmailChange: (value: string) => void
  memberRole: string
  onMemberRoleChange: (value: string) => void
  canAssignAdminRole: boolean
  canAssignManagerRole?: boolean
  onInviteMember: () => void | Promise<void>
  pendingRoleByUserId: Record<string, string>
  onPendingRoleChange: (userId: string, role: string) => void
  selectedProjectOwnerId: string | null | undefined
  onSaveRole: (userId: string, fallbackRole: string) => void | Promise<void>
  onRemoveMember?: (userId: string, unassignUnfinishedTasks: boolean) => void | Promise<void>
  onOpenDeleteConfirm?: () => void
  onOpenCompleteConfirm: () => void
  onOpenSaveSettingsConfirm: () => void
}

export function ProjectDetailsSectionBody({
  selectedProject,
  selectedProjectId,
  isLoading,
  canManageProject,
  activeTab,
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
  projectMembers,
  currentUserProfile,
  projectManagerName,
  canInviteToSelectedProject,
  memberEmail,
  onMemberEmailChange,
  memberRole,
  onMemberRoleChange,
  canAssignAdminRole,
  canAssignManagerRole,
  onInviteMember,
  pendingRoleByUserId,
  onPendingRoleChange,
  selectedProjectOwnerId,
  onSaveRole,
  onRemoveMember,
  onOpenDeleteConfirm,
  onOpenCompleteConfirm,
  onOpenSaveSettingsConfirm,
}: ProjectDetailsSectionBodyProps) {
  return (
    <>
      {isLoading ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
          Loading module...
        </div>
      ) : null}

      {activeTab === 'overview' ? (
        <ProjectOverviewTab
          selectedProject={selectedProject}
          tasks={tasks}
          projectManagerName={projectManagerName}
          teamMemberNames={teamMemberNames}
          projectMembers={projectMembers}
          currentUserProfile={currentUserProfile}
        />
      ) : null}

      {activeTab === 'team' ? (
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
            currentUserProfile={currentUserProfile}
            canManageMemberRoles={canManageMemberRoles}
            pendingRoleByUserId={pendingRoleByUserId}
            onPendingRoleChange={onPendingRoleChange}
            selectedProjectOwnerId={selectedProjectOwnerId}
            onSaveRole={onSaveRole}
            onRemoveMember={onRemoveMember}
          />
        </div>
      ) : null}

      {activeTab === 'settings' ? (
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
          canEditSelectedProject={canEditSelectedProject}
          canDeleteSelectedProject={canDeleteSelectedProject}
          canCompleteSelectedProject={selectedProjectId ? canManageProject(selectedProjectId) : false}
          incompleteTaskCount={incompleteTaskCount}
          isProjectCompleted={(selectedProject?.status ?? '').toLowerCase() === 'completed'}
          isLoading={isLoading}
          onOpenSaveSettingsConfirm={onOpenSaveSettingsConfirm}
          onOpenDeleteConfirm={onOpenDeleteConfirm}
          onOpenCompleteConfirm={onOpenCompleteConfirm}
        />
      ) : null}

      {activeTab === 'estimates' ? (
        <EstimatesTab
          projectId={selectedProject.id}
          canEdit={canEditSelectedProject}
          useEstimates={settingsUseEstimates}
          onUseEstimatesChange={onSettingsUseEstimatesChange}
        />
      ) : null}

      {activeTab === 'collaboration' ? (
        <ProjectCollaborationTab projectId={selectedProject.id} canEdit={canEditSelectedProject} />
      ) : null}
    </>
  )
}
