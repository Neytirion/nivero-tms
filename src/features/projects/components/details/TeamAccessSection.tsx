import type { ProjectMemberListItem } from '../../../../lib/pm'

interface TeamAccessSectionProps {
  isEmbedded?: boolean
  canInviteToSelectedProject: boolean
  memberEmail: string
  onMemberEmailChange: (value: string) => void
  memberRole: string
  onMemberRoleChange: (value: string) => void
  canAssignAdminRole: boolean
  canAssignManagerRole?: boolean
  onInviteMember: () => void | Promise<void>
  isLoading: boolean
  selectedProjectId: string | null
  projectMembers: ProjectMemberListItem[]
  canEditSelectedProject: boolean
  pendingRoleByUserId: Record<string, string>
  onPendingRoleChange: (userId: string, role: string) => void
  selectedProjectOwnerId: string | null | undefined
  onSaveRole: (userId: string, fallbackRole: string) => void | Promise<void>
  onGetMemberUnfinishedTaskCount?: (userId: string) => Promise<number>
  onRemoveMember?: (userId: string, unassignUnfinishedTasks: boolean) => void | Promise<void>
}

export function TeamAccessSection({
  isEmbedded = false,
  canInviteToSelectedProject,
  memberEmail,
  onMemberEmailChange,
  memberRole,
  onMemberRoleChange,
  canAssignAdminRole,
  canAssignManagerRole,
  onInviteMember,
  isLoading,
  selectedProjectId,
  projectMembers,
  canEditSelectedProject,
  pendingRoleByUserId,
  onPendingRoleChange,
  selectedProjectOwnerId,
  onSaveRole,
}: TeamAccessSectionProps) {
  return (
    <section className={isEmbedded ? 'rounded-xl border border-slate-200 bg-slate-50 p-3' : 'page-section bg-slate-50/70'}>
      <h3 className="section-title">Team Access</h3>
      <p className="section-subtitle">Invite members by email. A project must be selected first.</p>

      {!canInviteToSelectedProject ? (
        <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
          Only project members can invite users.
        </p>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
        <input
          type="email"
          value={memberEmail}
          onChange={(event) => onMemberEmailChange(event.target.value)}
          placeholder="Member email"
          disabled={!canInviteToSelectedProject}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        />
        <select
          value={memberRole}
          onChange={(event) => onMemberRoleChange(event.target.value)}
          disabled={!canInviteToSelectedProject}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        >
          <option value="member">member</option>
          {canAssignManagerRole ? <option value="manager">manager</option> : null}
          {canAssignAdminRole ? <option value="admin">admin</option> : null}
        </select>
        <button
          type="button"
          onClick={() => void onInviteMember()}
          disabled={isLoading || !selectedProjectId || !canInviteToSelectedProject}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add member
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
        <h4 className="text-sm font-semibold text-slate-900">Project members</h4>
        <p className="mt-1 text-xs text-slate-500">Showing users currently in selected project.</p>

        <div className="mt-3 space-y-2">
          {!selectedProjectId ? <p className="text-xs text-slate-500">No project selected</p> : null}
          {selectedProjectId && projectMembers.length === 0 ? (
            <p className="text-xs text-slate-500">No visible members yet</p>
          ) : null}
          {projectMembers.map((member) => (
            <div
              key={member.member_id}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-slate-800">{member.full_name ?? 'Unknown user'}</p>
                <p className="mt-0.5 text-xs text-slate-500">{member.email ?? 'No email'}</p>
              </div>
              {canEditSelectedProject && member.user_id ? (
                <div className="flex items-center gap-2">
                  <select
                    value={pendingRoleByUserId[member.user_id] ?? member.role ?? 'member'}
                    onChange={(event) => onPendingRoleChange(member.user_id as string, event.target.value)}
                    disabled={!canAssignAdminRole && member.user_id === selectedProjectOwnerId}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="member">member</option>
                    {canAssignManagerRole ? <option value="manager">manager</option> : null}
                    <option value="admin">admin</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => void onSaveRole(member.user_id as string, member.role ?? 'member')}
                    disabled={isLoading || (!canAssignAdminRole && member.user_id === selectedProjectOwnerId)}
                    className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Save role
                  </button>
                </div>
              ) : (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                  {member.role ?? 'member'}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
