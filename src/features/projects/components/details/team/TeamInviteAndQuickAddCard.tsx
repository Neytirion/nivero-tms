import type { UserProfilePreview } from '../../../../../shared/components'
import type { QuickAddCandidate } from './types'

interface TeamInviteAndQuickAddCardProps {
  canInviteToSelectedProject: boolean
  memberEmail: string
  onMemberEmailChange: (value: string) => void
  onInviteMember: () => void | Promise<void>
  isLoading: boolean
  selectedProjectId: string | null
  showQuickAdd: boolean
  isQuickAddLoading: boolean
  visibleQuickAddCandidates: QuickAddCandidate[]
  isQuickInviteLoadingByEmail: Record<string, boolean>
  onQuickInvite: (email: string) => Promise<void>
  onOpenQuickCandidateProfile: (profile: UserProfilePreview) => void
}

export function TeamInviteAndQuickAddCard({
  canInviteToSelectedProject,
  memberEmail,
  onMemberEmailChange,
  onInviteMember,
  isLoading,
  selectedProjectId,
  showQuickAdd,
  isQuickAddLoading,
  visibleQuickAddCandidates,
  isQuickInviteLoadingByEmail,
  onQuickInvite,
  onOpenQuickCandidateProfile,
}: TeamInviteAndQuickAddCardProps) {
  return (
    <>
      {!canInviteToSelectedProject ? (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
          Only project members can invite users.
        </p>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-2.5">
        <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Invite by email</p>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            type="email"
            value={memberEmail}
            onChange={(event) => onMemberEmailChange(event.target.value)}
            placeholder="name@company.com"
            disabled={!canInviteToSelectedProject}
            className="min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          />
          <button
            type="button"
            onClick={() => void onInviteMember()}
            disabled={isLoading || !selectedProjectId || !canInviteToSelectedProject}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Invite
          </button>
        </div>
      </div>

      {showQuickAdd ? (
        <div className="rounded-xl border border-slate-200 bg-white p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Quick add from other projects</p>
            {isQuickAddLoading ? (
              <span className="text-[11px] font-medium text-slate-500">Updating...</span>
            ) : null}
          </div>

          <div className="mt-2 max-h-[28rem] min-h-[3.25rem] space-y-1 overflow-auto pr-1 xl:max-h-[34rem]">
            {!selectedProjectId ? (
              <p className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-500">Select a project first.</p>
            ) : null}

            {selectedProjectId && !isQuickAddLoading && visibleQuickAddCandidates.length === 0 ? (
              <p className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-500">No candidates from other projects.</p>
            ) : null}

            {visibleQuickAddCandidates.map((candidate) => (
              <div
                key={candidate.email}
                className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2"
              >
                <div className="min-w-0 flex items-center gap-2">
                  {candidate.avatarUrl ? (
                    <img
                      src={candidate.avatarUrl}
                      alt={candidate.fullName ?? candidate.email}
                      className="h-7 w-7 shrink-0 rounded-full border border-slate-200 object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700">
                      {(candidate.fullName ?? candidate.email).slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenQuickCandidateProfile({
                          fullName: candidate.fullName,
                          email: candidate.email,
                          avatarUrl: candidate.avatarUrl,
                          role: 'member',
                        })
                      }
                      className="truncate text-left text-xs font-medium text-slate-800 underline-offset-2 hover:text-cyan-700 hover:underline"
                      title="Open member profile"
                    >
                      {candidate.fullName ?? candidate.email}
                    </button>
                    {candidate.fullName ? (
                      <p className="truncate text-[11px] text-slate-500" title={candidate.email}>
                        {candidate.email}
                      </p>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void onQuickInvite(candidate.email)}
                  disabled={!canInviteToSelectedProject || isQuickInviteLoadingByEmail[candidate.email] || isLoading}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Invite as member"
                  aria-label={`Add ${candidate.fullName ?? candidate.email} as member`}
                >
                  {isQuickInviteLoadingByEmail[candidate.email] ? '…' : '+'}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  )
}
