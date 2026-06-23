import { useState } from 'react'
import { normalizeProjectRole, type ProjectRoleName } from '../../shared/utils/permissions'
import { getMyProjectMemberships } from '../../lib/pm'
import { supabase } from '../../lib/supabase'

interface UseWorkspaceAuthReturn {
  currentUserId: string | null
  setCurrentUserId: (value: string | null) => void
  membershipRoleByProjectId: Record<string, ProjectRoleName>
  setMembershipRoleByProjectId: (value: Record<string, ProjectRoleName>) => void
  loadAuth: () => Promise<void>
  error: string | null
}

export function useWorkspaceAuth(): UseWorkspaceAuthReturn {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [membershipRoleByProjectId, setMembershipRoleByProjectId] = useState<Record<string, ProjectRoleName>>({})
  const [error, setError] = useState<string | null>(null)

  const loadAuth = async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) {
        throw authError
      }

      setCurrentUserId(authData.user?.id ?? null)

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
      setMembershipRoleByProjectId({})
    }
  }

  return {
    currentUserId,
    setCurrentUserId,
    membershipRoleByProjectId,
    setMembershipRoleByProjectId,
    loadAuth,
    error,
  }
}
