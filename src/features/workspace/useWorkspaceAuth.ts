import { useState } from 'react'
import { normalizeProjectRole, type ProjectRoleName } from '../../shared/utils/permissions'
import { getMyProjectMemberships } from '../../lib/pm'
import { supabase } from '../../lib/supabase'
import type { UserProfilePreview } from '../../shared/components'

interface UseWorkspaceAuthReturn {
  currentUserId: string | null
  currentUserProfile: UserProfilePreview | null
  setCurrentUserId: (value: string | null) => void
  membershipRoleByProjectId: Record<string, ProjectRoleName>
  setMembershipRoleByProjectId: (value: Record<string, ProjectRoleName>) => void
  loadAuth: () => Promise<void>
  error: string | null
}

export function useWorkspaceAuth(): UseWorkspaceAuthReturn {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfilePreview | null>(null)
  const [membershipRoleByProjectId, setMembershipRoleByProjectId] = useState<Record<string, ProjectRoleName>>({})
  const [error, setError] = useState<string | null>(null)

  const loadAuth = async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) {
        throw authError
      }

      const user = authData.user ?? null
      setCurrentUserId(user?.id ?? null)
      setCurrentUserProfile(
        user
          ? {
              userId: user.id,
              displayName: (user.user_metadata.display_name as string | undefined) ?? '',
              fullName: (user.user_metadata.full_name as string | undefined) ?? '',
              email: user.email ?? '',
              aboutMe: (user.user_metadata.bio as string | undefined) ?? '',
              joinedAt: user.created_at ?? null,
            }
          : null,
      )

      const memberships = await getMyProjectMemberships()
      setMembershipRoleByProjectId(
        memberships.reduce<Record<string, ProjectRoleName>>((acc: Record<string, ProjectRoleName>, membership) => {
          if (membership.project_id) {
            acc[membership.project_id] = normalizeProjectRole(membership.role)
          }
          return acc
        }, {}),
      )

      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      setCurrentUserId(null)
      setCurrentUserProfile(null)
      setMembershipRoleByProjectId({})
    }
  }

  return {
    currentUserId,
    currentUserProfile,
    setCurrentUserId,
    membershipRoleByProjectId,
    setMembershipRoleByProjectId,
    loadAuth,
    error,
  }
}
