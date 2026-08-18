import type { ProjectMemberListItem } from '../../../lib/pm'

interface TeamStepProps {
  teamMemberIds: string[]
  projectMembers: ProjectMemberListItem[]
  onTeamMembersChange: (ids: string[]) => void
}

export function TeamStep({
  teamMemberIds,
  projectMembers,
  onTeamMembersChange,
}: TeamStepProps) {
  const handleToggleMember = (userId: string) => {
    const newIds = teamMemberIds.includes(userId)
      ? teamMemberIds.filter((id) => id !== userId)
      : [...teamMemberIds, userId]
    onTeamMembersChange(newIds)
  }

  const workspaceMembers = projectMembers.filter((m) => m.user_id)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Project Team</h2>

      <div className="space-y-4">
        {workspaceMembers.length === 0 ? (
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-900">
              No team members available in your workspace yet.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {workspaceMembers.map((member) => (
                <label
                  key={member.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={teamMemberIds.includes(member.user_id!)}
                    onChange={() => handleToggleMember(member.user_id!)}
                    className="rounded border-slate-300"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {member.full_name || member.email}
                    </p>
                    {member.full_name && (
                      <p className="text-xs text-slate-600 truncate">{member.email}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {teamMemberIds.length > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  ✓ {teamMemberIds.length} team member{teamMemberIds.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </>
        )}

        <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-sm text-amber-900">
            ℹ️ This field is optional. You can add team members after creating the project or skip this step.
          </p>
        </div>
      </div>
    </div>
  )
}
