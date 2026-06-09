import {
  getProjectMemberUnfinishedTasksCount,
  getProjectMembers,
  getProjectTasks,
  inviteProjectMemberByEmail,
  removeProjectMember,
  type TaskPreview,
  updateProjectMemberRole,
  type ProjectMemberListItem,
} from '../../lib/pm'

type SetStatus = (value: string | ((prev: string) => string)) => void
type SetIsLoading = (value: boolean | ((prev: boolean) => boolean)) => void
type SetProjectMembers =
  (value: ProjectMemberListItem[] | ((prev: ProjectMemberListItem[]) => ProjectMemberListItem[])) => void
type SetTasks = (value: TaskPreview[] | ((prev: TaskPreview[]) => TaskPreview[])) => void

interface MemberActionsConfig {
  selectedProjectId: string | null
  currentUserId: string | null
  projectMembers: ProjectMemberListItem[]
  setStatus: SetStatus
  setIsLoading: SetIsLoading
  setProjectMembers: SetProjectMembers
  setTasks: SetTasks
  ensureProjectEditable: (projectId: string | null | undefined, action: string) => boolean
  canInviteToProject: (projectId: string) => boolean
  canUpdateProjectMemberRoles: (projectId: string) => boolean
  canRemoveProjectMembers: (projectId: string) => boolean
  applyProjectMetricsFromTasks: (projectId: string, projectTasks: TaskPreview[]) => void
  reloadProjectsOnly: () => Promise<unknown>
}

export function createMemberActions(config: MemberActionsConfig) {
  const inviteMemberToSelectedProjectByEmail = async (email: string, role = 'member') => {
    if (!config.selectedProjectId) {
      config.setStatus('Select a project before inviting members')
      return
    }

    if (!config.ensureProjectEditable(config.selectedProjectId, 'invite members')) {
      return
    }

    if (!config.canInviteToProject(config.selectedProjectId)) {
      config.setStatus('Permission denied: only project members can invite users')
      return
    }

    config.setIsLoading(true)

    try {
      await inviteProjectMemberByEmail({
        projectId: config.selectedProjectId,
        email,
        role,
      })
      const nextMembers = await getProjectMembers(config.selectedProjectId)
      config.setProjectMembers(nextMembers)
      config.setStatus('Member invited to project by email')
    } catch (error) {
      if (error instanceof Error) {
        const normalizedMessage = error.message.toLowerCase()
        if (normalizedMessage.includes('user with this email was not found')) {
          config.setStatus('User with this email does not exist')
        } else {
          config.setStatus(`Invite member error: ${error.message}`)
        }
      } else {
        config.setStatus('Unknown error')
      }
    }

    config.setIsLoading(false)
  }

  const changeSelectedProjectMemberRole = async (userId: string, role: string) => {
    if (!config.selectedProjectId) {
      config.setStatus('Select a project before changing member roles')
      return
    }

    const normalizedNextRole = role.trim().toLowerCase()
    const isSelfRoleUpdate = Boolean(config.currentUserId) && userId === config.currentUserId
    const selfMember = config.projectMembers.find((member) => member.user_id === userId)
    const isSelfCurrentlyAdmin = (selfMember?.role ?? '').toLowerCase() === 'admin'
    const otherAdminsCount = config.projectMembers.filter(
      (member) => member.user_id !== userId && (member.role ?? '').toLowerCase() === 'admin',
    ).length

    if (isSelfRoleUpdate && isSelfCurrentlyAdmin && normalizedNextRole !== 'admin' && otherAdminsCount === 0) {
      config.setStatus('You cannot change your role: add another admin first')
      return
    }

    if (!config.ensureProjectEditable(config.selectedProjectId, 'change member roles')) {
      return
    }

    if (!config.canUpdateProjectMemberRoles(config.selectedProjectId)) {
      config.setStatus('Permission denied: only owner or admin can change roles')
      return
    }

    config.setIsLoading(true)

    try {
      await updateProjectMemberRole({
        projectId: config.selectedProjectId,
        userId,
        role,
      })
      const nextMembers = await getProjectMembers(config.selectedProjectId)
      config.setProjectMembers(nextMembers)
      config.setStatus('Member role updated')
    } catch (error) {
      config.setStatus(error instanceof Error ? `Update role error: ${error.message}` : 'Unknown error')
    }

    config.setIsLoading(false)
  }

  const getSelectedProjectMemberUnfinishedTasksCount = async (userId: string) => {
    if (!config.selectedProjectId) {
      return 0
    }

    return getProjectMemberUnfinishedTasksCount(config.selectedProjectId, userId)
  }

  const removeSelectedProjectMember = async (userId: string, unassignUnfinishedTasks: boolean) => {
    if (!config.selectedProjectId) {
      config.setStatus('Select a project before removing members')
      return
    }

    if (!config.ensureProjectEditable(config.selectedProjectId, 'remove members')) {
      return
    }

    if (!config.canRemoveProjectMembers(config.selectedProjectId)) {
      config.setStatus('Permission denied: only owner or admin can remove members')
      return
    }

    config.setIsLoading(true)

    try {
      await removeProjectMember({
        projectId: config.selectedProjectId,
        userId,
        unassignUnfinishedTasks,
      })

      const [nextMembers, nextTasks] = await Promise.all([
        getProjectMembers(config.selectedProjectId),
        getProjectTasks(config.selectedProjectId),
      ])
      config.setProjectMembers(nextMembers)
      config.setTasks(nextTasks)
      config.applyProjectMetricsFromTasks(config.selectedProjectId, nextTasks)
      await config.reloadProjectsOnly()
      config.setStatus('Member removed from project')
    } catch (error) {
      config.setStatus(error instanceof Error ? `Remove member error: ${error.message}` : 'Unknown error')
    }

    config.setIsLoading(false)
  }

  return {
    inviteMemberToSelectedProjectByEmail,
    changeSelectedProjectMemberRole,
    getSelectedProjectMemberUnfinishedTasksCount,
    removeSelectedProjectMember,
  }
}
