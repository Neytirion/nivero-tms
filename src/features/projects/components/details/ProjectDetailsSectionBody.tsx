import type { ProjectPreview, TaskPreview, EstimateWithPackages } from '../../../../lib/pm'
import type { ProjectRoleName } from '../../../../shared/utils/permissions'
import { useEffect, useState } from 'react'
import { getProjectEstimates } from '../../../../lib/pm'
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
  selectedProjectClientIntakeToken: string | null
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
  canAssignAdminRole: boolean
  canAssignManagerRole?: boolean
  onInviteMember: () => void | Promise<void>
  onQuickInviteMember?: (email: string) => Promise<void>
  pendingRoleByUserId: Record<string, string>
  onPendingRoleChange: (userId: string, role: string) => void
  selectedProjectOwnerId: string | null | undefined
  onSaveRole: (userId: string, fallbackRole: string, explicitRole?: string) => Promise<boolean> | boolean
  onRemoveMember?: (userId: string, unassignUnfinishedTasks: boolean) => void | Promise<void>
  workspaceProjects?: ProjectPreview[]
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
  selectedProjectClientIntakeToken,
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
  canAssignAdminRole,
  canAssignManagerRole,
  onInviteMember,
  onQuickInviteMember,
  pendingRoleByUserId,
  onPendingRoleChange,
  selectedProjectOwnerId,
  onSaveRole,
  onRemoveMember,
  workspaceProjects,
  onOpenDeleteConfirm,
  onOpenCompleteConfirm,
  onOpenSaveSettingsConfirm,
}: ProjectDetailsSectionBodyProps) {
  const [estimates, setEstimates] = useState<EstimateWithPackages[]>([])

  // Load estimates for budget display in overview
  useEffect(() => {
    if (!selectedProjectId) {
      setEstimates([])
      return
    }

    const loadEstimates = async () => {
      try {
        const data = await getProjectEstimates(selectedProjectId)
        setEstimates(data)
      } catch (error) {
        console.error('Failed to load estimates for overview:', error)
        setEstimates([])
      }
    }

    void loadEstimates()
  }, [selectedProjectId])
  return (
    <>
      {activeTab === 'overview' ? (
        <ProjectOverviewTab
          selectedProject={selectedProject}
          tasks={tasks}
          projectManagerName={projectManagerName}
          teamMemberNames={teamMemberNames}
          projectMembers={projectMembers}
          currentUserProfile={currentUserProfile}
          estimates={estimates}
        />
      ) : null}

      {activeTab === 'team' ? (
        <div className="mt-4">
          <TeamAccessSection
            isEmbedded
            canInviteToSelectedProject={canInviteToSelectedProject}
            memberEmail={memberEmail}
            onMemberEmailChange={onMemberEmailChange}
            canAssignAdminRole={canAssignAdminRole}
            canAssignManagerRole={canAssignManagerRole}
            onInviteMember={onInviteMember}
            onQuickInviteMember={onQuickInviteMember}
            isLoading={isLoading}
            selectedProjectId={selectedProjectId}
            workspaceProjects={workspaceProjects}
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
          selectedProjectClientIntakeToken={selectedProjectClientIntakeToken}
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
        />
      ) : null}

      {activeTab === 'collaboration' ? (
        <ProjectCollaborationTab projectId={selectedProject.id} canEdit={canEditSelectedProject} />
      ) : null}
    </>
  )
}
