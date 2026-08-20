import { useState } from 'react'
import type { ProjectMemberListItem, ProjectPreview } from '../../../../lib/pm'
import { UserProfileDialog, type UserProfilePreview } from '../../../../shared/components'
import { DisplayRolesCard } from './team/DisplayRolesCard'
import { ProjectMembersCard } from './team/ProjectMembersCard'
import { TeamInviteAndQuickAddCard } from './team/TeamInviteAndQuickAddCard'
import { useTeamAccessController } from './team/useTeamAccessController'

interface TeamAccessSectionProps {
  isEmbedded?: boolean
  canInviteToSelectedProject: boolean
  memberEmail: string
  onMemberEmailChange: (value: string) => void
  canAssignAdminRole: boolean
  canAssignManagerRole?: boolean
  onInviteMember: () => void | Promise<void>
  onQuickInviteMember?: (email: string) => Promise<void>
  isLoading: boolean
  selectedProjectId: string | null
  workspaceProjects?: ProjectPreview[]
  projectMembers: ProjectMemberListItem[]
  currentUserProfile: UserProfilePreview | null
  canManageMemberRoles?: boolean
  pendingRoleByUserId: Record<string, string>
  onPendingRoleChange: (userId: string, role: string) => void
  selectedProjectOwnerId: string | null | undefined
  onSaveRole: (userId: string, fallbackRole: string, explicitRole?: string) => Promise<boolean> | boolean
  onGetMemberUnfinishedTaskCount?: (userId: string) => Promise<number>
  onRemoveMember?: (userId: string, unassignUnfinishedTasks: boolean) => void | Promise<void>
}

export function TeamAccessSection({
  isEmbedded = false,
  canInviteToSelectedProject,
  memberEmail,
  onMemberEmailChange,
  canAssignAdminRole,
  canAssignManagerRole,
  onInviteMember,
  onQuickInviteMember,
  isLoading,
  selectedProjectId,
  workspaceProjects = [],
  projectMembers,
  currentUserProfile,
  canManageMemberRoles = false,
  pendingRoleByUserId,
  onPendingRoleChange,
  selectedProjectOwnerId,
  onSaveRole,
  onRemoveMember,
}: TeamAccessSectionProps) {
  const [selectedProfile, setSelectedProfile] = useState<UserProfilePreview | null>(null)

  const {
    defaultDisplayRoles,
    roleOptions,
    displayRoleOptions,
    savingRoleByUserId,
    removingMemberByUserId,
    isQuickAddLoading,
    isQuickInviteLoadingByEmail,
    customDisplayRoles,
    newDisplayRole,
    isDisplayRolesLoading,
    isCreatingDisplayRole,
    isDeletingDisplayRoleById,
    isSavingDisplayRoleByUserId,
    visibleQuickAddCandidates,
    setNewDisplayRole,
    canEditMemberDisplayRole,
    getMemberDisplayRole,
    handleRoleSelectChange,
    handleQuickInvite,
    handleAddDisplayRole,
    handleRemoveCustomDisplayRole,
    handleMemberDisplayRoleChange,
    handleRemoveMember,
  } = useTeamAccessController({
    canAssignAdminRole,
    canAssignManagerRole,
    canManageMemberRoles,
    selectedProjectId,
    selectedProjectOwnerId,
    workspaceProjects,
    projectMembers,
    currentUserProfile,
    onQuickInviteMember,
    onPendingRoleChange,
    onSaveRole,
    onRemoveMember,
  })

  const resolveProfile = (member: ProjectMemberListItem) => {
    if (member.user_id && currentUserProfile?.userId === member.user_id) {
      return {
        ...currentUserProfile,
        userId: member.user_id,
        avatarUrl: currentUserProfile.avatarUrl ?? member.avatar_url,
        email: currentUserProfile.email || member.email,
        role: member.role,
        joinedAt: member.joined_at ?? currentUserProfile.joinedAt,
      }
    }

    return {
      userId: member.user_id,
      fullName: member.full_name,
      email: member.email,
      avatarUrl: member.avatar_url,
      role: member.role,
      joinedAt: member.joined_at,
    }
  }

  return (
    <section className={isEmbedded ? 'rounded-2xl border border-slate-200 bg-slate-50 p-3.5' : 'page-section bg-slate-50/70'}>
      <h3 className="section-title">Team</h3>
      <p className="section-subtitle">Invite members by email. A project must be selected first.</p>

      <div className="mt-3 grid items-start gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="space-y-3 xl:order-2">
          <TeamInviteAndQuickAddCard
            canInviteToSelectedProject={canInviteToSelectedProject}
            memberEmail={memberEmail}
            onMemberEmailChange={onMemberEmailChange}
            onInviteMember={onInviteMember}
            isLoading={isLoading}
            selectedProjectId={selectedProjectId}
            showQuickAdd={Boolean(onQuickInviteMember)}
            isQuickAddLoading={isQuickAddLoading}
            visibleQuickAddCandidates={visibleQuickAddCandidates}
            isQuickInviteLoadingByEmail={isQuickInviteLoadingByEmail}
            onQuickInvite={handleQuickInvite}
            onOpenQuickCandidateProfile={(profile) => setSelectedProfile(profile)}
          />

          <DisplayRolesCard
            canManageMemberRoles={canManageMemberRoles}
            selectedProjectId={selectedProjectId}
            newDisplayRole={newDisplayRole}
            onNewDisplayRoleChange={setNewDisplayRole}
            onAddDisplayRole={handleAddDisplayRole}
            isCreatingDisplayRole={isCreatingDisplayRole}
            isDisplayRolesLoading={isDisplayRolesLoading}
            displayRoleOptions={displayRoleOptions}
            customDisplayRoles={customDisplayRoles}
            isDeletingDisplayRoleById={isDeletingDisplayRoleById}
            onRemoveCustomDisplayRole={handleRemoveCustomDisplayRole}
            defaultDisplayRoles={defaultDisplayRoles}
          />
        </div>

        <ProjectMembersCard
          selectedProjectId={selectedProjectId}
          projectMembers={projectMembers}
          selectedProjectOwnerId={selectedProjectOwnerId}
          canManageMemberRoles={canManageMemberRoles}
          currentUserProfile={currentUserProfile}
          pendingRoleByUserId={pendingRoleByUserId}
          savingRoleByUserId={savingRoleByUserId}
          removingMemberByUserId={removingMemberByUserId}
          isSavingDisplayRoleByUserId={isSavingDisplayRoleByUserId}
          roleOptions={roleOptions}
          displayRoleOptions={displayRoleOptions}
          getMemberDisplayRole={getMemberDisplayRole}
          canEditMemberDisplayRole={canEditMemberDisplayRole}
          onOpenMemberProfile={(member) => setSelectedProfile(resolveProfile(member))}
          onMemberDisplayRoleChange={handleMemberDisplayRoleChange}
          onRoleSelectChange={handleRoleSelectChange}
          onRemoveMember={onRemoveMember ? handleRemoveMember : undefined}
        />
      </div>

      <UserProfileDialog
        isOpen={Boolean(selectedProfile)}
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
      />
    </section>
  )
}
