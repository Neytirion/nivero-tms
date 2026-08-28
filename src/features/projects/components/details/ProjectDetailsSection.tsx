import type { ProjectPreview, TaskPreview } from '../../../../lib/pm'
import type { ProjectRoleName } from '../../../../shared/utils/permissions'
import { useEffect, useState } from 'react'
import { ProjectDetailsSectionBody } from './ProjectDetailsSectionBody'
import type { UserProfilePreview } from '../../../../shared/components'

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
  // onTabChange and onNavigateToTasks handled by ProjectDetailsPage sidebar
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
  projectManagerName,
  currentUserProfile,
  canInviteToSelectedProject,
  memberEmail,
  onMemberEmailChange,
  canAssignAdminRole,
  canAssignManagerRole,
  onInviteMember,
  onQuickInviteMember,
  projectMembers,
  pendingRoleByUserId,
  onPendingRoleChange,
  selectedProjectOwnerId,
  onSaveRole,
  onRemoveMember,
  workspaceProjects,
  onOpenDeleteConfirm,
  onOpenCompleteConfirm,
  onOpenSaveSettingsConfirm,
}: ProjectDetailsSectionProps) {
  const [isTabLoading, setIsTabLoading] = useState(false)
  const selectedProjectStableId = selectedProject?.id ?? null

  useEffect(() => {
    if (!selectedProjectStableId) {
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
  }, [activeTab, selectedProjectStableId])

  return (
    <section className="page-section">
      {!selectedProject ? (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
          No project selected
        </p>
      ) : (
        <ProjectDetailsSectionBody
          selectedProject={selectedProject}
          selectedProjectId={selectedProjectId}
          myRoleInSelectedProject={myRoleInSelectedProject}
          isLoading={isLoading || isTabLoading}
          canManageProject={canManageProject}
          activeTab={activeTab}
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
          canManageMemberRoles={canManageMemberRoles}
          tasks={tasks}
          incompleteTaskCount={incompleteTaskCount}
          teamMemberNames={teamMemberNames}
          projectMembers={projectMembers}
          currentUserProfile={currentUserProfile}
          projectManagerName={projectManagerName}
          canInviteToSelectedProject={canInviteToSelectedProject}
          memberEmail={memberEmail}
          onMemberEmailChange={onMemberEmailChange}
          canAssignAdminRole={canAssignAdminRole}
          canAssignManagerRole={canAssignManagerRole}
          onInviteMember={onInviteMember}
          onQuickInviteMember={onQuickInviteMember}
          pendingRoleByUserId={pendingRoleByUserId}
          onPendingRoleChange={onPendingRoleChange}
          selectedProjectOwnerId={selectedProjectOwnerId}
          onSaveRole={onSaveRole}
          onRemoveMember={onRemoveMember}
          workspaceProjects={workspaceProjects}
          onOpenDeleteConfirm={onOpenDeleteConfirm}
          onOpenCompleteConfirm={onOpenCompleteConfirm}
          onOpenSaveSettingsConfirm={onOpenSaveSettingsConfirm}
        />
      )}
    </section>
  )
}
