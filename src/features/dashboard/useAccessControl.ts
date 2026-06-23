import { useMemo } from 'react'
import { type ProjectRoleName } from '../../shared/utils/permissions'
import { createAccessControl } from './access-control'
import type { ProjectPreview } from '../../lib/pm'

interface UseAccessControlConfig {
  projects: ProjectPreview[]
  currentUserId: string | null
  membershipRoleByProjectId: Record<string, ProjectRoleName>
}

export function useAccessControl(config: UseAccessControlConfig) {
  return useMemo(() => {
    return createAccessControl({
      projects: config.projects,
      currentUserId: config.currentUserId,
      membershipRoleByProjectId: config.membershipRoleByProjectId,
    })
  }, [config.projects, config.currentUserId, config.membershipRoleByProjectId])
}
