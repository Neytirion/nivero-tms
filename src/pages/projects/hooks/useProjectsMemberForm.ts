import { useMemo, useState } from 'react'

export interface UseProjectsMemberFormReturn {
  memberEmail: string
  memberRole: string
  pendingRoleByUserId: Record<string, string>
  effectiveMemberRole: string
  setMemberEmail: (email: string) => void
  setMemberRole: (role: string) => void
  setPendingRoleByUserId: (roles: Record<string, string>) => void
  updatePendingRole: (userId: string, role: string) => void
  resetMemberForm: () => void
}

/**
 * Manage member invitation form state and role assignment
 */
export function useProjectsMemberForm(
  canAssignAdminRole: boolean,
  canAssignManagerRole: boolean,
): UseProjectsMemberFormReturn {
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState('member')
  const [pendingRoleByUserId, setPendingRoleByUserId] = useState<Record<string, string>>({})

  // Restrict role selection based on current user permissions
  const effectiveMemberRole = useMemo(() => {
    if (memberRole === 'admin' && !canAssignAdminRole) {
      return 'member'
    }

    if (memberRole === 'manager' && !canAssignManagerRole) {
      return 'member'
    }

    return memberRole
  }, [memberRole, canAssignAdminRole, canAssignManagerRole])

  const updatePendingRole = (userId: string, role: string) => {
    setPendingRoleByUserId((prev) => ({
      ...prev,
      [userId]: role,
    }))
  }

  const resetMemberForm = () => {
    setMemberEmail('')
    setMemberRole('member')
  }

  return {
    memberEmail,
    memberRole,
    pendingRoleByUserId,
    effectiveMemberRole,
    setMemberEmail,
    setMemberRole,
    setPendingRoleByUserId,
    updatePendingRole,
    resetMemberForm,
  }
}
