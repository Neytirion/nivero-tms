import { describe, expect, it } from 'vitest'
import { createAccessControl } from './access-control'
import { createProjectPreview, createTaskPreview } from '../../test/workspace-factory'

describe('dashboard/access-control', () => {
  it('resolves owner role from current user and owner id', () => {
    const project = createProjectPreview({ owner_id: 'user-1' })
    const access = createAccessControl({
      projects: [project],
      currentUserId: 'user-1',
      membershipRoleByProjectId: { 'project-1': 'member' },
    })

    expect(access.getProjectRole('project-1')).toBe('owner')
  })

  it('blocks management actions on completed projects', () => {
    const project = createProjectPreview({ status: 'completed' })
    const access = createAccessControl({
      projects: [project],
      currentUserId: 'manager-1',
      membershipRoleByProjectId: { 'project-1': 'manager' },
    })

    expect(access.isProjectCompleted('project-1')).toBe(true)
    expect(access.canManageProject('project-1')).toBe(false)
    expect(access.canAssignTasksInProject('project-1')).toBe(false)
    expect(access.canInviteToProject('project-1')).toBe(false)
  })

  it('allows only owner to delete completed projects', () => {
    const completedProject = createProjectPreview({ status: 'completed' })

    const ownerAccess = createAccessControl({
      projects: [completedProject],
      currentUserId: 'owner-1',
      membershipRoleByProjectId: {},
    })

    const managerAccess = createAccessControl({
      projects: [completedProject],
      currentUserId: 'manager-1',
      membershipRoleByProjectId: { 'project-1': 'manager' },
    })

    expect(ownerAccess.canDeleteProject('project-1')).toBe(true)
    expect(managerAccess.canDeleteProject('project-1')).toBe(false)
  })

  it('allows member to manage only own unassigned task', () => {
    const project = createProjectPreview({ owner_id: 'owner-1' })
    const access = createAccessControl({
      projects: [project],
      currentUserId: 'member-1',
      membershipRoleByProjectId: { 'project-1': 'member' },
    })

    const ownUnassigned = createTaskPreview({
      created_by: 'member-1',
      assigned_to: null,
      project_id: 'project-1',
    })
    const othersTask = createTaskPreview({
      created_by: 'user-2',
      assigned_to: 'user-2',
      project_id: 'project-1',
    })

    expect(access.canManageTask(ownUnassigned)).toBe(true)
    expect(access.canDeleteTask(ownUnassigned)).toBe(true)
    expect(access.canManageTask(othersTask)).toBe(false)
    expect(access.canDeleteTask(othersTask)).toBe(false)
  })

  it('allows only owner to update member roles', () => {
    const project = createProjectPreview({ owner_id: 'owner-1' })

    const ownerAccess = createAccessControl({
      projects: [project],
      currentUserId: 'owner-1',
      membershipRoleByProjectId: {},
    })
    const adminAccess = createAccessControl({
      projects: [project],
      currentUserId: 'admin-1',
      membershipRoleByProjectId: { 'project-1': 'admin' },
    })
    const managerAccess = createAccessControl({
      projects: [project],
      currentUserId: 'manager-1',
      membershipRoleByProjectId: { 'project-1': 'manager' },
    })

    expect(ownerAccess.canUpdateProjectMemberRoles('project-1')).toBe(true)
    expect(adminAccess.canUpdateProjectMemberRoles('project-1')).toBe(false)
    expect(managerAccess.canUpdateProjectMemberRoles('project-1')).toBe(false)
  })

  it('allows admin to remove members even without role-update permission', () => {
    const project = createProjectPreview({ owner_id: 'owner-1' })

    const adminAccess = createAccessControl({
      projects: [project],
      currentUserId: 'admin-1',
      membershipRoleByProjectId: { 'project-1': 'admin' },
    })

    expect(adminAccess.canRemoveProjectMembers('project-1')).toBe(true)
    expect(adminAccess.canUpdateProjectMemberRoles('project-1')).toBe(false)
  })
})
