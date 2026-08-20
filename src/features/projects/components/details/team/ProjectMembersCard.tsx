import type { ProjectMemberListItem } from '../../../../../lib/pm'
import type { UserProfilePreview } from '../../../../../shared/components'
import type { RoleOption } from './types'

interface ProjectMembersCardProps {
  selectedProjectId: string | null
  projectMembers: ProjectMemberListItem[]
  selectedProjectOwnerId: string | null | undefined
  canManageMemberRoles: boolean
  currentUserProfile: UserProfilePreview | null
  pendingRoleByUserId: Record<string, string>
  savingRoleByUserId: Record<string, boolean>
  removingMemberByUserId: Record<string, boolean>
  isSavingDisplayRoleByUserId: Record<string, boolean>
  roleOptions: RoleOption[]
  displayRoleOptions: string[]
  getMemberDisplayRole: (member: ProjectMemberListItem) => string | null
  canEditMemberDisplayRole: (member: ProjectMemberListItem) => boolean
  onOpenMemberProfile: (member: ProjectMemberListItem) => void
  onMemberDisplayRoleChange: (member: ProjectMemberListItem, roleName: string) => void
  onRoleSelectChange: (member: ProjectMemberListItem, nextRole: string) => Promise<void>
  onRemoveMember?: (userId: string) => Promise<void>
}

export function ProjectMembersCard({
  selectedProjectId,
  projectMembers,
  selectedProjectOwnerId,
  canManageMemberRoles,
  currentUserProfile,
  pendingRoleByUserId,
  savingRoleByUserId,
  removingMemberByUserId,
  isSavingDisplayRoleByUserId,
  roleOptions,
  displayRoleOptions,
  getMemberDisplayRole,
  canEditMemberDisplayRole,
  onOpenMemberProfile,
  onMemberDisplayRoleChange,
  onRoleSelectChange,
  onRemoveMember,
}: ProjectMembersCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 xl:order-1">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">Project members</h4>
        {selectedProjectId ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {projectMembers.length} total
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-slate-500">Role updates are applied immediately after selection.</p>

      <div className="mt-3 space-y-2">
        {!selectedProjectId ? <p className="text-xs text-slate-500">No project selected</p> : null}
        {selectedProjectId && projectMembers.length === 0 ? (
          <p className="text-xs text-slate-500">No visible members yet</p>
        ) : null}
        {projectMembers.map((member) => (
          <div
            key={member.member_id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
          >
            <div className="min-w-0 flex items-center gap-2.5">
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={member.full_name ?? member.email ?? 'User avatar'}
                  className="h-8 w-8 shrink-0 rounded-full border border-slate-200 object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700">
                  {(member.full_name ?? member.email ?? '?').slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenMemberProfile(member)}
                    className="min-w-0 flex-1 truncate text-left text-sm font-medium text-slate-800 underline-offset-2 hover:text-cyan-700 hover:underline"
                  >
                    {member.full_name ?? member.email ?? 'Unknown user'}
                  </button>
                  {(() => {
                    const displayRole = getMemberDisplayRole(member)
                    return (
                      <span
                        className={`inline-flex h-5 shrink-0 items-center gap-1.5 text-xs font-medium text-slate-600 ${displayRole ? '' : 'invisible'}`}
                      >
                        <span className="h-2 w-2 rounded-full bg-cyan-500" aria-hidden="true" />
                        <span className="truncate">{displayRole ?? 'Role'}</span>
                      </span>
                    )
                  })()}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{member.email ?? 'No email'}</p>
              </div>
            </div>
            {canManageMemberRoles && member.user_id ? (
              <div className="flex items-center gap-2">
                {member.user_id === selectedProjectOwnerId ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                    Owner
                  </span>
                ) : null}
                <select
                  value={getMemberDisplayRole(member) ?? ''}
                  onChange={(event) => {
                    onMemberDisplayRoleChange(member, event.target.value)
                  }}
                  disabled={!canEditMemberDisplayRole(member) || isSavingDisplayRoleByUserId[member.user_id]}
                  className="rounded-md border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-medium text-cyan-900 outline-none focus:border-cyan-500"
                  aria-label={`Display role for ${member.full_name ?? member.email ?? 'member'}`}
                >
                  <option value="">No display role</option>
                  {displayRoleOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <select
                  value={pendingRoleByUserId[member.user_id] ?? member.role ?? 'member'}
                  onChange={(event) => {
                    void onRoleSelectChange(member, event.target.value)
                  }}
                  disabled={
                    savingRoleByUserId[member.user_id] ||
                    member.user_id === selectedProjectOwnerId
                  }
                  className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-800 outline-none focus:border-cyan-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                  aria-label={`Role for ${member.full_name ?? member.email ?? 'member'}`}
                  title={member.user_id === selectedProjectOwnerId ? 'Project owner role cannot be changed' : undefined}
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <span className="w-14 text-center text-[11px] font-medium text-slate-500">
                  {savingRoleByUserId[member.user_id] ? 'Saving...' : 'Synced'}
                </span>
                {onRemoveMember &&
                  member.user_id !== selectedProjectOwnerId &&
                  member.user_id !== currentUserProfile?.userId && (
                  <button
                    type="button"
                    onClick={() => void onRemoveMember(member.user_id as string)}
                    disabled={removingMemberByUserId[member.user_id]}
                    className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    title="Remove member (tasks will be reassigned to project owner)"
                  >
                    {removingMemberByUserId[member.user_id] ? 'Removing...' : 'Remove'}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {canEditMemberDisplayRole(member) ? (
                  <select
                    value={getMemberDisplayRole(member) ?? ''}
                    onChange={(event) => {
                      onMemberDisplayRoleChange(member, event.target.value)
                    }}
                    disabled={Boolean(member.user_id) && isSavingDisplayRoleByUserId[member.user_id]}
                    className="rounded-md border border-cyan-200 bg-cyan-50 px-2.5 py-1.5 text-xs font-medium text-cyan-900 outline-none focus:border-cyan-500"
                    aria-label={`Display role for ${member.full_name ?? member.email ?? 'member'}`}
                  >
                    <option value="">No display role</option>
                    {displayRoleOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : null}
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                  {member.role ?? 'member'}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
