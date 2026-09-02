import { useCallback, useLayoutEffect, useRef } from 'react'
import {
  getProjectMemberUnfinishedTasksCount,
  getProjectMembers,
  inviteProjectMemberByEmail,
  removeProjectMember,
  updateProjectMemberRole,
  type ProjectMemberListItem,
} from '../../../lib/pm'
import { formatProjectInviteNotification, notifySlackPilot } from '../../../lib/slack-notifications'
import { supabase } from '../../../lib/supabase'

type SetStatus = (value: string | ((prev: string) => string)) => void
type SetIsLoading = (value: boolean | ((prev: boolean) => boolean)) => void
type SetProjectMembers = (value: ProjectMemberListItem[] | ((prev: ProjectMemberListItem[]) => ProjectMemberListItem[])) => void

interface MemberActionsDeps {
  selectedProjectId: string | null
  currentUserId: string | null
  projectMembers: ProjectMemberListItem[]
  setStatus: SetStatus
  setIsLoading: SetIsLoading
  setProjectMembers: SetProjectMembers
  ensureProjectEditable: (projectId: string | null | undefined, action: string) => boolean
  canInviteToProject: (projectId: string) => boolean
  canUpdateProjectMemberRoles: (projectId: string) => boolean
  canRemoveProjectMembers: (projectId: string) => boolean
  /** Reload tasks + members and refresh project metrics — called after member removal */
  reloadTasksAndMembers: (projectId: string) => Promise<void>
}

/**
 * Hook that exposes memoized member management actions.
 * Uses a ref to always read the latest deps without re-creating callbacks.
 */
export function useMemberActions(deps: MemberActionsDeps) {
  const depsRef = useRef(deps)
  useLayoutEffect(() => {
    depsRef.current = deps
  })

  const inviteMemberToSelectedProjectByEmail = useCallback(
    async (email: string, role = 'member', options?: { suppressGlobalLoading?: boolean }) => {
      const { selectedProjectId, ensureProjectEditable, canInviteToProject, setStatus, setIsLoading, setProjectMembers } =
        depsRef.current

      if (!selectedProjectId) {
        setStatus('Select a project before inviting members')
        return
      }
      if (!ensureProjectEditable(selectedProjectId, 'invite members')) return
      if (!canInviteToProject(selectedProjectId)) {
        setStatus('Permission denied: only project members can invite users')
        return
      }

      const shouldUseGlobalLoading = !options?.suppressGlobalLoading

      if (shouldUseGlobalLoading) {
        setIsLoading(true)
      }

      try {
        await inviteProjectMemberByEmail({ projectId: selectedProjectId, email, role })
        const nextMembers = await getProjectMembers(selectedProjectId)
        setProjectMembers(nextMembers)
        const { data: authData } = await supabase.auth.getUser()
        notifySlackPilot({
          recipientEmail: email,
          actorEmail: authData.user?.email,
          text: formatProjectInviteNotification(selectedProjectId),
        })
        setStatus('Member invited to project by email')
      } catch (error) {
        if (error instanceof Error) {
          const msg = error.message.toLowerCase()
          setStatus(msg.includes('user with this email was not found')
            ? 'User with this email does not exist'
            : `Invite member error: ${error.message}`)
        } else {
          setStatus('Unknown error')
        }
      } finally {
        if (shouldUseGlobalLoading) {
          setIsLoading(false)
        }
      }
    },
    [],
  )

  const changeSelectedProjectMemberRole = useCallback(
    async (userId: string, role: string, options?: { suppressGlobalLoading?: boolean }) => {
      const {
        selectedProjectId,
        currentUserId,
        projectMembers,
        ensureProjectEditable,
        canUpdateProjectMemberRoles,
        setStatus,
        setIsLoading,
        setProjectMembers,
      } = depsRef.current

      if (!selectedProjectId) {
        setStatus('Select a project before changing member roles')
        return
      }

      const normalizedNextRole = role.trim().toLowerCase()
      const isSelfRoleUpdate = Boolean(currentUserId) && userId === currentUserId
      const selfMember = projectMembers.find((m) => m.user_id === userId)
      const isSelfCurrentlyAdmin = (selfMember?.role ?? '').toLowerCase() === 'admin'
      const otherAdminsCount = projectMembers.filter(
        (m) => m.user_id !== userId && (m.role ?? '').toLowerCase() === 'admin',
      ).length

      if (isSelfRoleUpdate && isSelfCurrentlyAdmin && normalizedNextRole !== 'admin' && otherAdminsCount === 0) {
        setStatus('You cannot change your role: add another admin first')
        return
      }

      if (!ensureProjectEditable(selectedProjectId, 'change member roles')) return
      if (!canUpdateProjectMemberRoles(selectedProjectId)) {
        setStatus('Permission denied: only owner can change roles')
        return
      }

      const shouldUseGlobalLoading = !options?.suppressGlobalLoading

      if (shouldUseGlobalLoading) {
        setIsLoading(true)
      }

      try {
        await updateProjectMemberRole({ projectId: selectedProjectId, userId, role })
        const nextMembers = await getProjectMembers(selectedProjectId)
        setProjectMembers(nextMembers)
        setStatus('Member role updated')
      } catch (error) {
        setStatus(error instanceof Error ? `Update role error: ${error.message}` : 'Unknown error')
      } finally {
        if (shouldUseGlobalLoading) {
          setIsLoading(false)
        }
      }
    },
    [],
  )

  const getSelectedProjectMemberUnfinishedTasksCount = useCallback(
    async (userId: string) => {
      const { selectedProjectId } = depsRef.current
      if (!selectedProjectId) return 0
      return getProjectMemberUnfinishedTasksCount(selectedProjectId, userId)
    },
    [],
  )

  const removeSelectedProjectMember = useCallback(
    async (userId: string, unassignUnfinishedTasks: boolean, options?: { suppressGlobalLoading?: boolean }) => {
      const {
        selectedProjectId,
        ensureProjectEditable,
        canRemoveProjectMembers,
        setStatus,
        setIsLoading,
        reloadTasksAndMembers,
      } = depsRef.current

      if (!selectedProjectId) {
        setStatus('Select a project before removing members')
        return
      }
      if (!ensureProjectEditable(selectedProjectId, 'remove members')) return
      if (!canRemoveProjectMembers(selectedProjectId)) {
        setStatus('Permission denied: only owner or admin can remove members')
        return
      }

      const shouldUseGlobalLoading = !options?.suppressGlobalLoading

      if (shouldUseGlobalLoading) {
        setIsLoading(true)
      }

      try {
        await removeProjectMember({ projectId: selectedProjectId, userId, unassignUnfinishedTasks })
        await reloadTasksAndMembers(selectedProjectId)
        setStatus('Member removed from project')
      } catch (error) {
        setStatus(error instanceof Error ? `Remove member error: ${error.message}` : 'Unknown error')
      } finally {
        if (shouldUseGlobalLoading) {
          setIsLoading(false)
        }
      }
    },
    [],
  )

  return {
    inviteMemberToSelectedProjectByEmail,
    changeSelectedProjectMemberRole,
    getSelectedProjectMemberUnfinishedTasksCount,
    removeSelectedProjectMember,
  }
}
