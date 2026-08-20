import type { ProjectDisplayRolePreview, ProjectMemberListItem } from '../../../../../lib/pm'
import type { UserProfilePreview } from '../../../../../shared/components'

export interface QuickAddCandidate {
  email: string
  fullName: string | null
  avatarUrl: string | null
  sourceProjectNames: string[]
}

export interface RoleOption {
  value: string
  label: string
}

export interface DisplayRolesCardState {
  customDisplayRoles: ProjectDisplayRolePreview[]
  displayRoleOptions: string[]
  isDisplayRolesLoading: boolean
  isCreatingDisplayRole: boolean
  isDeletingDisplayRoleById: Record<string, boolean>
  newDisplayRole: string
}

export interface ProjectMembersCardState {
  roleOptions: RoleOption[]
  savingRoleByUserId: Record<string, boolean>
  removingMemberByUserId: Record<string, boolean>
  isSavingDisplayRoleByUserId: Record<string, boolean>
}

export interface MemberProfileResolver {
  (member: ProjectMemberListItem): UserProfilePreview
}
