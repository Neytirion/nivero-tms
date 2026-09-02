import { useEffect, useMemo, useState } from 'react'
import { UserProfileDialog, type UserProfilePreview } from '../../../shared/components'
import { getProjectMembers, getUserProfileByEmail, type ProjectPreview } from '../../../lib/pm'
import type { TeamInvitation } from './types'

interface TeamStepProps {
  currentUserEmail: string | null
  workspaceProjects: ProjectPreview[]
  teamInvitations: TeamInvitation[]
  onTeamInvitationsChange: (invitations: TeamInvitation[]) => void
}

export function TeamStep({ currentUserEmail, workspaceProjects, teamInvitations, onTeamInvitationsChange }: TeamStepProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'member' | 'manager' | 'admin'>('member')
  const [emailError, setEmailError] = useState('')
  const [isCheckingEmail, setIsCheckingEmail] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<UserProfilePreview | null>(null)
  const [quickAddCandidates, setQuickAddCandidates] = useState<TeamInvitation[]>([])
  const [isQuickAddLoading, setIsQuickAddLoading] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadQuickAddCandidates = async () => {
      if (workspaceProjects.length === 0) {
        setQuickAddCandidates([])
        return
      }

      setIsQuickAddLoading(true)
      const memberResults = await Promise.allSettled(workspaceProjects.map((project) => getProjectMembers(project.id)))
      if (!isMounted) return

      const candidatesByEmail = new Map<string, TeamInvitation>()
      const ownEmail = currentUserEmail?.trim().toLowerCase()

      for (const result of memberResults) {
        if (result.status !== 'fulfilled') continue
        for (const member of result.value) {
          const candidateEmail = member.email?.trim().toLowerCase()
          if (!candidateEmail || candidateEmail === ownEmail || candidatesByEmail.has(candidateEmail)) continue
          candidatesByEmail.set(candidateEmail, {
            email: candidateEmail,
            role: 'member',
            profile: {
              userId: member.user_id ?? '',
              fullName: member.full_name,
              email: candidateEmail,
              avatarUrl: member.avatar_url ?? null,
              joinedAt: member.joined_at,
              aboutMe: null,
            },
          })
        }
      }

      setQuickAddCandidates(Array.from(candidatesByEmail.values()).sort((a, b) =>
        (a.profile?.fullName ?? a.email).localeCompare(b.profile?.fullName ?? b.email),
      ))
      setIsQuickAddLoading(false)
    }

    void loadQuickAddCandidates()
    return () => { isMounted = false }
  }, [currentUserEmail, workspaceProjects])

  const visibleQuickAddCandidates = useMemo(
    () => quickAddCandidates.filter((candidate) => !teamInvitations.some((invitation) => invitation.email === candidate.email)),
    [quickAddCandidates, teamInvitations],
  )

  const isValidEmail = (emailString: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(emailString)
  }

  const handleAddMember = async () => {
    const trimmedEmail = email.trim().toLowerCase()

    // Validation
    if (!trimmedEmail) {
      setEmailError('Email is required')
      return
    }

    if (!isValidEmail(trimmedEmail)) {
      setEmailError('Please enter a valid email address')
      return
    }

    if (currentUserEmail && trimmedEmail === currentUserEmail.trim().toLowerCase()) {
      setEmailError('You cannot invite yourself to a project')
      return
    }

    // Check for duplicates
    if (teamInvitations.some((inv) => inv.email === trimmedEmail)) {
      setEmailError('This email is already added')
      return
    }

    setIsCheckingEmail(true)

    try {
      const inviteeProfile = await getUserProfileByEmail(trimmedEmail)

      if (!inviteeProfile) {
        setEmailError('User with this email does not exist')
        return
      }

      // Add the invitation with profile preview data for avatar + profile dialog.
      onTeamInvitationsChange([
        ...teamInvitations,
        {
          email: trimmedEmail,
          role,
          profile: {
            userId: inviteeProfile.user_id,
            fullName: inviteeProfile.full_name,
            email: inviteeProfile.email ?? trimmedEmail,
            avatarUrl: inviteeProfile.avatar_url,
            joinedAt: inviteeProfile.joined_at,
            aboutMe: inviteeProfile.about_me,
          },
        },
      ])

      // Reset form
      setEmail('')
      setRole('member')
      setEmailError('')
    } catch (error) {
      setEmailError(error instanceof Error ? error.message : 'Failed to validate email')
    } finally {
      setIsCheckingEmail(false)
    }
  }

  const handleRemoveInvitation = (emailToRemove: string) => {
    onTeamInvitationsChange(teamInvitations.filter((inv) => inv.email !== emailToRemove))
  }

  const handleQuickAdd = (candidate: TeamInvitation) => {
    onTeamInvitationsChange([...teamInvitations, candidate])
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void handleAddMember()
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Project Team</h2>

      <div className="space-y-4">
        {/* Invitation Form */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900 mb-3">Invite team members by email</p>

          <div className="flex flex-col gap-3">
            <div className="flex gap-2 flex-wrap">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (emailError) setEmailError('')
                }}
                onKeyPress={handleKeyPress}
                placeholder="member@example.com"
                className="flex-1 min-w-[200px] rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              />

              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'member' | 'manager' | 'admin')}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              >
                <option value="member">Member</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>

              <button
                type="button"
                onClick={() => void handleAddMember()}
                disabled={isCheckingEmail}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                {isCheckingEmail ? 'Checking...' : 'Add'}
              </button>
            </div>

            {emailError && (
              <p className="text-sm text-red-600">{emailError}</p>
            )}
          </div>
        </div>

        {workspaceProjects.length > 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-900">Quick add from other projects</p>
              {isQuickAddLoading ? <span className="text-xs text-slate-500">Loading...</span> : null}
            </div>
            {!isQuickAddLoading && visibleQuickAddCandidates.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No available members from other projects.</p>
            ) : null}
            <div className="mt-3 max-h-60 space-y-2 overflow-y-auto">
              {visibleQuickAddCandidates.map((candidate) => (
                <div key={candidate.email} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="min-w-0 flex items-center gap-2.5">
                    {candidate.profile?.avatarUrl ? (
                      <img src={candidate.profile.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700">
                        {(candidate.profile?.fullName ?? candidate.email).slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{candidate.profile?.fullName ?? candidate.email}</p>
                      {candidate.profile?.fullName ? <p className="truncate text-xs text-slate-500">{candidate.email}</p> : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(candidate)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-lg font-semibold text-slate-700 transition hover:bg-slate-100"
                    aria-label={`Add ${candidate.profile?.fullName ?? candidate.email} as member`}
                    title="Add as member"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Invited Members List */}
        {teamInvitations.length > 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-900 mb-3">
              Invited members ({teamInvitations.length})
            </p>

            <div className="space-y-2">
              {teamInvitations.map((invitation) => (
                <div
                  key={invitation.email}
                  className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <div className="min-w-0 flex flex-1 items-center gap-2.5">
                    {invitation.profile?.avatarUrl ? (
                      <img
                        src={invitation.profile.avatarUrl}
                        alt={invitation.profile.fullName ?? invitation.profile.email}
                        className="h-8 w-8 shrink-0 rounded-full border border-slate-200 object-cover"
                      />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
                        {(invitation.profile?.fullName ?? invitation.email)
                          .split(' ')
                          .map((part) => part[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setSelectedProfile({
                        userId: invitation.profile?.userId,
                        fullName: invitation.profile?.fullName,
                        email: invitation.profile?.email ?? invitation.email,
                        avatarUrl: invitation.profile?.avatarUrl ?? null,
                        role: invitation.role,
                        joinedAt: invitation.profile?.joinedAt ?? null,
                        aboutMe: invitation.profile?.aboutMe ?? null,
                      })}
                      className="truncate text-left text-sm font-medium text-slate-900 underline-offset-2 hover:text-cyan-700 hover:underline"
                    >
                      {invitation.profile?.fullName ?? invitation.profile?.email ?? invitation.email}
                    </button>
                    <p className="text-xs text-slate-600 capitalize">{invitation.role}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveInvitation(invitation.email)}
                    className="ml-3 shrink-0 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

      </div>

      <UserProfileDialog
        isOpen={Boolean(selectedProfile)}
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
      />
    </div>
  )
}
