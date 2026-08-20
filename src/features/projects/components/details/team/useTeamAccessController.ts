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
} from '../../../../../lib/pm'
import type { UserProfilePreview } from '../../../../../shared/components'
import type { QuickAddCandidate, RoleOption } from './types'

const DEFAULT_DISPLAY_ROLES = ['Design', 'Frontend', 'Backend', 'Fullstack', 'QA', 'Tester', 'DevOps', 'Product', 'Analytics']

interface UseTeamAccessControllerInput {
  canAssignAdminRole: boolean
  canAssignManagerRole?: boolean
  canManageMemberRoles: boolean
  selectedProjectId: string | null
  selectedProjectOwnerId: string | null | undefined
  workspaceProjects: ProjectPreview[]
  projectMembers: ProjectMemberListItem[]
  currentUserProfile: UserProfilePreview | null
  onQuickInviteMember?: (email: string) => Promise<void>
  onPendingRoleChange: (userId: string, role: string) => void
  onSaveRole: (userId: string, fallbackRole: string, explicitRole?: string) => Promise<boolean> | boolean
  onRemoveMember?: (userId: string, unassignUnfinishedTasks: boolean) => void | Promise<void>
}

export function useTeamAccessController({
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
}: UseTeamAccessControllerInput) {
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
  const [quickAddCandidates, setQuickAddCandidates] = useState<QuickAddCandidate[]>([])

  const roleOptions = useMemo<RoleOption[]>(
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

  const canEditMemberDisplayRole = (member: ProjectMemberListItem) => {
    if (!member.user_id) {
      return false
    }

    return canManageMemberRoles || member.user_id === currentUserProfile?.userId
  }

  const getMemberDisplayRole = (member: ProjectMemberListItem) => {
    if (!member.user_id) {
      return null
    }

    return memberDisplayRoleByUserId[member.user_id] ?? null
  }

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

  return {
    defaultDisplayRoles: DEFAULT_DISPLAY_ROLES,
    roleOptions,
    displayRoleOptions,
    savingRoleByUserId,
    removingMemberByUserId,
    isQuickAddLoading,
    isQuickInviteLoadingByEmail,
    customDisplayRoles,
    newDisplayRole,
    memberDisplayRoleByUserId,
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
  }
}
