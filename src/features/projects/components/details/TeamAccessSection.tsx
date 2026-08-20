import { useEffect, useMemo, useState } from 'react'
import {
  clearProjectMemberDisplayRole,
  createProjectDisplayRole,
  deleteProjectDisplayRole,
  getProjectDisplayRoles,
  getProjectMemberDisplayRoles,
  getProjectMembers,
  setProjectMemberDisplayRole,
  type ProjectDisplayRolePreview,
  type ProjectMemberListItem,
  type ProjectPreview,
} from '../../../../lib/pm'
import { UserProfileDialog, type UserProfilePreview } from '../../../../shared/components'

const DEFAULT_DISPLAY_ROLES = ['Design', 'Frontend', 'Backend', 'QA', 'DevOps', 'Product', 'Analytics']

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
  const [savingRoleByUserId, setSavingRoleByUserId] = useState<Record<string, boolean>>({})
  const [removingMemberByUserId, setRemovingMemberByUserId] = useState<Record<string, boolean>>({})
  const [isQuickAddLoading, setIsQuickAddLoading] = useState(false)
  const [isQuickInviteLoadingByEmail, setIsQuickInviteLoadingByEmail] = useState<Record<string, boolean>>({})
  const [customDisplayRoles, setCustomDisplayRoles] = useState<ProjectDisplayRolePreview[]>([])
  const [newDisplayRole, setNewDisplayRole] = useState('')
  const [memberDisplayRoleByUserId, setMemberDisplayRoleByUserId] = useState<Record<string, string>>({})
  const [isDisplayRolesLoading, setIsDisplayRolesLoading] = useState(false)
  const [isCreatingDisplayRole, setIsCreatingDisplayRole] = useState(false)
  const [isDeletingDisplayRoleById, setIsDeletingDisplayRoleById] = useState<Record<string, boolean>>({})
  const [isSavingDisplayRoleByUserId, setIsSavingDisplayRoleByUserId] = useState<Record<string, boolean>>({})
  const [quickAddCandidates, setQuickAddCandidates] = useState<Array<{
    email: string
    fullName: string | null
    avatarUrl: string | null
    sourceProjectNames: string[]
  }>>([])

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

  const roleOptions = useMemo(
    () => [
      { value: 'member', label: 'Member' },
      ...(canAssignManagerRole ? [{ value: 'manager', label: 'Manager' }] : []),
      ...(canAssignAdminRole ? [{ value: 'admin', label: 'Admin' }] : []),
    ],
    [canAssignAdminRole, canAssignManagerRole],
  )

  const displayRoleOptions = useMemo(() => {
    const unique = new Set<string>()
    for (const item of DEFAULT_DISPLAY_ROLES) {
      const normalized = item.trim()
      if (!normalized) {
        continue
      }
      unique.add(normalized)
    }

    for (const role of customDisplayRoles) {
      const normalized = role.name.trim()
      if (!normalized) {
        continue
      }
      unique.add(normalized)
    }

    return Array.from(unique)
  }, [customDisplayRoles])

  const existingMemberKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const member of projectMembers) {
      if (member.user_id) {
        keys.add(`user:${member.user_id}`)
      }
      if (member.email) {
        keys.add(`email:${member.email.toLowerCase()}`)
      }
    }
    return keys
  }, [projectMembers])

  const visibleQuickAddCandidates = useMemo(() => {
    if (!selectedProjectId || !onQuickInviteMember) {
      return []
    }

    const sourceProjects = workspaceProjects.filter((project) => project.id !== selectedProjectId)
    if (sourceProjects.length === 0) {
      return []
    }

    return quickAddCandidates
  }, [onQuickInviteMember, quickAddCandidates, selectedProjectId, workspaceProjects])

  useEffect(() => {
    if (!selectedProjectId || !onQuickInviteMember) {
      return
    }

    const sourceProjects = workspaceProjects.filter((project) => project.id !== selectedProjectId)

    if (sourceProjects.length === 0) {
      // Keep cached candidates in state; render logic hides them when no source projects.
      return
    }

    let isMounted = true

    const loadQuickAddCandidates = async () => {
      setIsQuickAddLoading(true)

      try {
        const projectMembersByProject = await Promise.allSettled(
          sourceProjects.map(async (project) => ({
            projectName: project.name,
            members: await getProjectMembers(project.id),
          })),
        )

        if (!isMounted) {
          return
        }

        const candidatesByEmail = new Map<string, {
          email: string
          fullName: string | null
          avatarUrl: string | null
          sourceProjectNames: Set<string>
        }>()

        for (const result of projectMembersByProject) {
          if (result.status !== 'fulfilled') {
            continue
          }

          for (const member of result.value.members) {
            const normalizedEmail = member.email?.trim().toLowerCase()
            if (!normalizedEmail) {
              continue
            }

            const userKey = member.user_id ? `user:${member.user_id}` : null
            const emailKey = `email:${normalizedEmail}`

            if ((userKey && existingMemberKeys.has(userKey)) || existingMemberKeys.has(emailKey)) {
              continue
            }

            const existingCandidate = candidatesByEmail.get(normalizedEmail)
            if (!existingCandidate) {
              candidatesByEmail.set(normalizedEmail, {
                email: normalizedEmail,
                fullName: member.full_name,
                avatarUrl: member.avatar_url ?? null,
                sourceProjectNames: new Set([result.value.projectName]),
              })
              continue
            }

            if (!existingCandidate.fullName && member.full_name) {
              existingCandidate.fullName = member.full_name
            }

            if (!existingCandidate.avatarUrl && member.avatar_url) {
              existingCandidate.avatarUrl = member.avatar_url
            }

            existingCandidate.sourceProjectNames.add(result.value.projectName)
          }
        }

        const nextCandidates = Array.from(candidatesByEmail.values())
          .map((candidate) => ({
            email: candidate.email,
            fullName: candidate.fullName,
            avatarUrl: candidate.avatarUrl,
            sourceProjectNames: Array.from(candidate.sourceProjectNames),
          }))
          .sort((a, b) => {
            const left = (a.fullName ?? a.email).toLowerCase()
            const right = (b.fullName ?? b.email).toLowerCase()
            return left.localeCompare(right)
          })

        setQuickAddCandidates(nextCandidates)
      } finally {
        if (isMounted) {
          setIsQuickAddLoading(false)
        }
      }
    }

    void loadQuickAddCandidates()

    return () => {
      isMounted = false
    }
  }, [existingMemberKeys, onQuickInviteMember, selectedProjectId, workspaceProjects])

  useEffect(() => {
    if (!selectedProjectId) {
      return
    }

    let isMounted = true

    const loadDisplayRoles = async () => {
      setIsDisplayRolesLoading(true)

      try {
        const [roles, assignments] = await Promise.all([
          getProjectDisplayRoles(selectedProjectId),
          getProjectMemberDisplayRoles(selectedProjectId),
        ])

        if (!isMounted) {
          return
        }

        setCustomDisplayRoles(roles)
        setMemberDisplayRoleByUserId(
          assignments.reduce<Record<string, string>>((acc, item) => {
            acc[item.user_id] = item.display_role
            return acc
          }, {}),
        )
      } catch (error) {
        console.error('Failed to load display roles:', error)

        if (isMounted) {
          setCustomDisplayRoles([])
          setMemberDisplayRoleByUserId({})
        }
      } finally {
        if (isMounted) {
          setIsDisplayRolesLoading(false)
        }
      }
    }

    void loadDisplayRoles()

    return () => {
      isMounted = false
    }
  }, [selectedProjectId])

  const handleRoleSelectChange = async (member: ProjectMemberListItem, nextRole: string) => {
    if (!member.user_id) {
      return
    }

    if (member.user_id === selectedProjectOwnerId) {
      return
    }

    const userId = member.user_id
    const fallbackRole = member.role ?? 'member'

    onPendingRoleChange(userId, nextRole)

    if (nextRole === fallbackRole) {
      return
    }

    setSavingRoleByUserId((prev) => ({ ...prev, [userId]: true }))

    try {
      const wasSaved = await onSaveRole(userId, fallbackRole, nextRole)
      if (wasSaved === false) {
        onPendingRoleChange(userId, fallbackRole)
      }
    } finally {
      setSavingRoleByUserId((prev) => ({ ...prev, [userId]: false }))
    }
  }

  const handleQuickInvite = async (email: string) => {
    if (!onQuickInviteMember) {
      return
    }

    setIsQuickInviteLoadingByEmail((prev) => ({ ...prev, [email]: true }))

    try {
      await onQuickInviteMember(email)
    } finally {
      setIsQuickInviteLoadingByEmail((prev) => ({ ...prev, [email]: false }))
    }
  }

  const handleAddDisplayRole = () => {
    if (!selectedProjectId || !canManageMemberRoles) {
      return
    }

    const normalized = newDisplayRole.trim()
    if (!normalized) {
      return
    }

    const alreadyExists = displayRoleOptions.some((item) => item.toLowerCase() === normalized.toLowerCase())
    if (alreadyExists) {
      setNewDisplayRole('')
      return
    }

    const createRole = async () => {
      setIsCreatingDisplayRole(true)

      try {
        const createdRole = await createProjectDisplayRole({
          projectId: selectedProjectId,
          name: normalized,
        })

        setCustomDisplayRoles((prev) =>
          [...prev, createdRole].sort((a, b) => a.name.localeCompare(b.name)),
        )
        setNewDisplayRole('')
      } catch (error) {
        console.error('Failed to create display role:', error)
      } finally {
        setIsCreatingDisplayRole(false)
      }
    }

    void createRole()
  }

  const handleRemoveCustomDisplayRole = (role: ProjectDisplayRolePreview) => {
    if (!selectedProjectId || !canManageMemberRoles) {
      return
    }

    const removeRole = async () => {
      setIsDeletingDisplayRoleById((prev) => ({ ...prev, [role.id]: true }))

      try {
        await deleteProjectDisplayRole({
          projectId: selectedProjectId,
          roleId: role.id,
          roleName: role.name,
        })

        const normalized = role.name.trim().toLowerCase()
        setCustomDisplayRoles((prev) => prev.filter((item) => item.id !== role.id))
        setMemberDisplayRoleByUserId((prev) =>
          Object.fromEntries(
            Object.entries(prev).filter(([, value]) => value.trim().toLowerCase() !== normalized),
          ),
        )
      } catch (error) {
        console.error('Failed to delete display role:', error)
      } finally {
        setIsDeletingDisplayRoleById((prev) => ({ ...prev, [role.id]: false }))
      }
    }

    void removeRole()
  }

  const handleMemberDisplayRoleChange = (member: ProjectMemberListItem, roleName: string) => {
    if (!selectedProjectId || !member.user_id || !canEditMemberDisplayRole(member)) {
      return
    }

    const userId = member.user_id
    const previousRole = memberDisplayRoleByUserId[userId] ?? ''
    const normalized = roleName.trim()

    setMemberDisplayRoleByUserId((prev) => {
      if (!normalized) {
        const next = { ...prev }
        delete next[userId]
        return next
      }

      return {
        ...prev,
        [userId]: normalized,
      }
    })

    const persistRole = async () => {
      setIsSavingDisplayRoleByUserId((prev) => ({ ...prev, [userId]: true }))

      try {
        if (!normalized) {
          await clearProjectMemberDisplayRole(selectedProjectId, userId)
        } else {
          await setProjectMemberDisplayRole({
            projectId: selectedProjectId,
            userId,
            displayRole: normalized,
          })
        }
      } catch (error) {
        console.error('Failed to update member display role:', error)

        setMemberDisplayRoleByUserId((prev) => {
          if (!previousRole) {
            const next = { ...prev }
            delete next[userId]
            return next
          }

          return {
            ...prev,
            [userId]: previousRole,
          }
        })
      } finally {
        setIsSavingDisplayRoleByUserId((prev) => ({ ...prev, [userId]: false }))
      }
    }

    void persistRole()
  }

  const getMemberDisplayRole = (member: ProjectMemberListItem) => {
    if (!member.user_id) {
      return null
    }

    return memberDisplayRoleByUserId[member.user_id] ?? null
  }

  const canEditMemberDisplayRole = (member: ProjectMemberListItem) => {
    if (!member.user_id) {
      return false
    }

    return canManageMemberRoles || member.user_id === currentUserProfile?.userId
  }

  const handleRemoveMember = async (userId: string) => {
    if (!onRemoveMember) {
      return
    }

    setRemovingMemberByUserId((prev) => ({ ...prev, [userId]: true }))

    try {
      await onRemoveMember(userId, true)
    } finally {
      setRemovingMemberByUserId((prev) => ({ ...prev, [userId]: false }))
    }
  }

  return (
    <section className={isEmbedded ? 'rounded-2xl border border-slate-200 bg-slate-50 p-3.5' : 'page-section bg-slate-50/70'}>
      <h3 className="section-title">Team</h3>
      <p className="section-subtitle">Invite members by email. A project must be selected first.</p>

      <div className="mt-3 grid items-start gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="space-y-3 xl:order-2">
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

          {onQuickInviteMember ? (
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
                            setSelectedProfile({
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
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleQuickInvite(candidate.email)}
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

          <div className="rounded-xl border border-slate-200 bg-white p-2.5">
            <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Display roles</p>
            <p className="px-1 text-xs text-slate-500">
              Visual labels for team responsibilities. They do not affect access rights.
            </p>

            <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                type="text"
                value={newDisplayRole}
                onChange={(event) => setNewDisplayRole(event.target.value)}
                placeholder="e.g., UX Writer"
                disabled={!canManageMemberRoles || !selectedProjectId || isCreatingDisplayRole}
                className="min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-600"
              />
              <button
                type="button"
                onClick={handleAddDisplayRole}
                disabled={!canManageMemberRoles || !selectedProjectId || isCreatingDisplayRole}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                {isCreatingDisplayRole ? 'Adding...' : 'Add role'}
              </button>
            </div>

            {isDisplayRolesLoading ? (
              <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-500">
                Loading display roles...
              </p>
            ) : null}

            <div className="mt-2 flex flex-wrap gap-1.5">
              {displayRoleOptions.map((roleName) => {
                const isDefaultRole = DEFAULT_DISPLAY_ROLES.some(
                  (defaultRole) => defaultRole.toLowerCase() === roleName.toLowerCase(),
                )
                const customRole = customDisplayRoles.find(
                  (item) => item.name.trim().toLowerCase() === roleName.trim().toLowerCase(),
                )
                const isDeletingCustomRole = customRole ? Boolean(isDeletingDisplayRoleById[customRole.id]) : false

                return (
                  <span
                    key={roleName}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                  >
                    {roleName}
                    {!isDefaultRole ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (customRole) {
                            handleRemoveCustomDisplayRole(customRole)
                          }
                        }}
                        disabled={!canManageMemberRoles || isDeletingCustomRole}
                        className="rounded px-1 text-[10px] text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                        aria-label={`Remove display role ${roleName}`}
                        title="Remove custom role"
                      >
                        {isDeletingCustomRole ? '...' : 'x'}
                      </button>
                    ) : null}
                  </span>
                )
              })}
            </div>
          </div>
        </div>

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
                  <button
                    type="button"
                    onClick={() => setSelectedProfile(resolveProfile(member))}
                    className="text-left text-sm font-medium text-slate-800 underline-offset-2 hover:text-cyan-700 hover:underline"
                  >
                    {member.full_name ?? member.email ?? 'Unknown user'}
                  </button>
                  <p className="mt-0.5 text-xs text-slate-500">{member.email ?? 'No email'}</p>
                  {(() => {
                    const displayRole = getMemberDisplayRole(member)

                    if (!displayRole) {
                      return null
                    }

                    return (
                      <span className="mt-1 inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-800">
                        {displayRole}
                      </span>
                    )
                  })()}
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
                      handleMemberDisplayRoleChange(member, event.target.value)
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
                      void handleRoleSelectChange(member, event.target.value)
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
                      onClick={() => void handleRemoveMember(member.user_id as string)}
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
                        handleMemberDisplayRoleChange(member, event.target.value)
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
      </div>

      <UserProfileDialog
        isOpen={Boolean(selectedProfile)}
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
      />
    </section>
  )
}
