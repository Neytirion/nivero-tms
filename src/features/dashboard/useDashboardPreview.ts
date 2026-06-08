import { useState } from 'react'
import {
  hasProjectPermission,
  normalizeProjectRole,
  resolveProjectRole,
  type ProjectRoleName,
} from '../../shared/utils/permissions'
import { isTaskClosedStatus } from '../../shared/utils/task-status.ts'
import { calculateProjectMetrics } from './project-metrics'
import {
  completeProject,
  createProject,
  createTask,
  deleteProject,
  deleteTask,
  getMyProjectMemberships,
  getMyProjects,
  getProjectMembers,
  getProjectMemberUnfinishedTasksCount,
  getProjectTasks,
  type ProjectMemberListItem,
  inviteProjectMemberByEmail,
  removeProjectMember,
  type ProjectPreview,
  type TaskPreview,
  updateProjectMemberRole,
  updateProject,
  updateTask,
} from '../../lib/pm'
import { supabase } from '../../lib/supabase'

export function useDashboardPreview() {
  const [status, setStatus] = useState('Click the button to load dashboard data')
  const [isLoading, setIsLoading] = useState(false)
  const [projects, setProjects] = useState<ProjectPreview[]>([])
  const [tasks, setTasks] = useState<TaskPreview[]>([])
  const [projectMembers, setProjectMembers] = useState<ProjectMemberListItem[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [membershipRoleByProjectId, setMembershipRoleByProjectId] = useState<Record<string, ProjectRoleName>>({})

  const isProjectCompleted = (projectId: string | null | undefined) => {
    if (!projectId) {
      return false
    }

    const project = projects.find((item) => item.id === projectId)
    return (project?.status ?? '').toLowerCase() === 'completed'
  }

  const ensureProjectEditable = (projectId: string | null | undefined, action: string) => {
    if (isProjectCompleted(projectId)) {
      setStatus(`Cannot ${action}: project is completed and read-only`)
      return false
    }

    return true
  }

  const getProjectRole = (projectId: string) => {
    const project = projects.find((item) => item.id === projectId)
    if (!project) {
      return null
    }

    return resolveProjectRole({
      currentUserId,
      ownerId: project.owner_id,
      membershipRole: membershipRoleByProjectId[projectId] ?? null,
    })
  }

  const canManageProject = (projectId: string) => {
    const role = getProjectRole(projectId)
    return hasProjectPermission(role, 'project.manage') && !isProjectCompleted(projectId)
  }

  const canDeleteProject = (projectId: string) => {
    const role = getProjectRole(projectId)

    if (isProjectCompleted(projectId)) {
      return role === 'owner'
    }

    return hasProjectPermission(role, 'project.delete')
  }

  const canAssignTasksInProject = (projectId: string) => {
    const role = getProjectRole(projectId)
    return !isProjectCompleted(projectId) && hasProjectPermission(role, 'task.assign')
  }

  const canInviteToProject = (projectId: string) => {
    const role = getProjectRole(projectId)
    return !isProjectCompleted(projectId) && hasProjectPermission(role, 'project.invite')
  }

  const canManageTask = (task: TaskPreview) => {
    if (!currentUserId) {
      return false
    }

    const isCreator = task.created_by === currentUserId
    const isAssignee = task.assigned_to === currentUserId
    const isUnassigned = !task.assigned_to
    const role = task.project_id ? getProjectRole(task.project_id) : null
    const isReadOnlyProject = isProjectCompleted(task.project_id)
    const canManageAnyTask = hasProjectPermission(role, 'task.manage.any')
    const canManageOwnTask =
      hasProjectPermission(role, 'task.manage.own') && (isAssignee || (isCreator && isUnassigned))

    return !isReadOnlyProject && (canManageAnyTask || canManageOwnTask)
  }

  const canDeleteTask = (task: TaskPreview) => {
    if (!currentUserId) {
      return false
    }

    const isCreator = task.created_by === currentUserId
    const isAssignee = task.assigned_to === currentUserId
    const isUnassigned = !task.assigned_to
    const role = task.project_id ? getProjectRole(task.project_id) : null
    const isReadOnlyProject = isProjectCompleted(task.project_id)
    const canDeleteAnyTask = hasProjectPermission(role, 'task.delete.any')
    const canDeleteOwnTask =
      hasProjectPermission(role, 'task.delete.own') && (isAssignee || (isCreator && isUnassigned))

    return !isReadOnlyProject && (canDeleteAnyTask || canDeleteOwnTask)
  }

  const applyProjectMetricsFromTasks = (projectId: string, projectTasks: TaskPreview[]) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== projectId) {
          return project
        }
        const metrics = calculateProjectMetrics(project, projectTasks)

        return {
          ...project,
          progress_percent: metrics.progressPercent,
          actual_hours: metrics.actualHours,
          risk_status: metrics.riskStatus,
        }
      }),
    )
  }

  const mergeProjectMetrics = (project: ProjectPreview, projectTasks: TaskPreview[]) => {
    const metrics = calculateProjectMetrics(project, projectTasks)

    return {
      ...project,
      progress_percent: metrics.progressPercent,
      actual_hours: metrics.actualHours,
      risk_status: metrics.riskStatus,
    }
  }

  const hydrateProjectsWithTaskMetrics = async (projectList: ProjectPreview[]) => {
    const projectsWithMetrics = await Promise.all(
      projectList.map(async (project) => {
        const projectTasks = await getProjectTasks(project.id)
        return mergeProjectMetrics(project, projectTasks)
      }),
    )

    return projectsWithMetrics
  }

  const loadTasksByProject = async (projectId: string) => {
    const [nextTasks, nextMembers] = await Promise.all([
      getProjectTasks(projectId),
      getProjectMembers(projectId),
    ])
    setTasks(nextTasks)
    setProjectMembers(nextMembers)
    setSelectedProjectId(projectId)
    applyProjectMetricsFromTasks(projectId, nextTasks)
    return nextTasks
  }

  const reloadProjectsOnly = async () => {
    const nextProjects = await getMyProjects()
    const nextProjectsWithMetrics = await hydrateProjectsWithTaskMetrics(nextProjects)
    setProjects(nextProjectsWithMetrics)
    return nextProjectsWithMetrics
  }

  const refreshProjectSnapshot = async (projectId: string) => {
    const nextTasks = await loadTasksByProject(projectId)
    await reloadProjectsOnly()
    applyProjectMetricsFromTasks(projectId, nextTasks)
    return nextTasks
  }

  const loadDashboardPreview = async () => {
    setIsLoading(true)
    setStatus('Loading projects and tasks...')

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

      const nextProjects = await getMyProjects()
      const nextProjectsWithMetrics = await hydrateProjectsWithTaskMetrics(nextProjects)
      setProjects(nextProjectsWithMetrics)

      if (nextProjectsWithMetrics.length === 0) {
        setTasks([])
        setProjectMembers([])
        setSelectedProjectId(null)
        setStatus('No projects found. Create your first project in the database.')
        setIsLoading(false)
        return
      }

      const targetProjectId =
        selectedProjectId && nextProjectsWithMetrics.some((project) => project.id === selectedProjectId)
          ? selectedProjectId
          : nextProjectsWithMetrics[0].id

      const nextTasks = await loadTasksByProject(targetProjectId)

      setStatus(
        `Loaded: ${nextProjectsWithMetrics.length} project(s), ${nextTasks.length} task(s) in selected project`,
      )
    } catch (error) {
      setStatus(error instanceof Error ? `Error: ${error.message}` : 'Unknown error')
      setProjects([])
      setTasks([])
      setProjectMembers([])
      setSelectedProjectId(null)
      setMembershipRoleByProjectId({})
    }

    setIsLoading(false)
  }

  const selectProject = async (projectId: string) => {
    setIsLoading(true)

    try {
      const nextTasks = await loadTasksByProject(projectId)
      setStatus(`Loaded ${nextTasks.length} task(s) for selected project`)
    } catch (error) {
      setStatus(error instanceof Error ? `Error: ${error.message}` : 'Unknown error')
    }

    setIsLoading(false)
  }

  const addProject = async (input: {
    name: string
    customerName?: string
    startDate?: string
    endDate?: string
    estimatedHours?: number
  }) => {
    setIsLoading(true)

    try {
      const createdProject = await createProject(input)
      setProjects((prev) => [createdProject, ...prev])
      setSelectedProjectId(createdProject.id)
      setTasks([])
      setProjectMembers([])
      setStatus(`Project created: ${createdProject.name}`)
    } catch (error) {
      if (error instanceof Error && error.message.includes('row-level security policy')) {
        setStatus(
          'Create project error: RLS blocks insert. Run the policies SQL in Supabase SQL Editor, then retry.',
        )
      } else {
        setStatus(error instanceof Error ? `Create project error: ${error.message}` : 'Unknown error')
      }
    }

    setIsLoading(false)
  }

  const editProject = async (
    projectId: string,
    patch: { name?: string; description?: string; deadlineAt?: string },
  ) => {
    if (!ensureProjectEditable(projectId, 'edit project')) {
      return
    }

    if (!canManageProject(projectId)) {
      setStatus('Permission denied: only owner or admin can edit this project')
      return
    }

    if (!patch.name?.trim()) {
      setStatus('Project name is required')
      return
    }

    setIsLoading(true)

    try {
      const updatedProject = await updateProject(projectId, {
        name: patch.name.trim(),
        description: patch.description,
        deadline_at: patch.deadlineAt,
      })

      setProjects((prev) =>
        prev.map((project) => (project.id === projectId ? updatedProject : project)),
      )
      setStatus(`Project updated: ${updatedProject.name}`)
    } catch (error) {
      setStatus(error instanceof Error ? `Update project error: ${error.message}` : 'Unknown error')
    }

    setIsLoading(false)
  }

  const removeProject = async (projectId: string) => {
    if (!canDeleteProject(projectId)) {
      setStatus('Permission denied: only owner can delete completed projects')
      return
    }

    setIsLoading(true)

    try {
      await deleteProject(projectId)
      const nextProjects = projects.filter((project) => project.id !== projectId)
      setProjects(nextProjects)

      if (selectedProjectId === projectId) {
        if (nextProjects.length > 0) {
          const nextProjectId = nextProjects[0].id
          await loadTasksByProject(nextProjectId)
        } else {
          setTasks([])
          setProjectMembers([])
          setSelectedProjectId(null)
        }
      }

      setStatus('Project deleted')
    } catch (error) {
      setStatus(error instanceof Error ? `Delete project error: ${error.message}` : 'Unknown error')
    }

    setIsLoading(false)
  }

  const addTask = async (input: {
    title: string
    description?: string
    status?: string
    priority?: string
    workPackageId?: string
    assignedTo?: string
    estimateHours?: number
    actualHours?: number
    blockedByTaskId?: string
    dueDate?: string
  }) => {
    if (!selectedProjectId) {
      setStatus('Select a project before creating tasks')
      return
    }

    if (!ensureProjectEditable(selectedProjectId, 'create task')) {
      return
    }

    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) {
      setStatus(`Create task error: ${authError.message}`)
      return
    }

    const authUserId = authData.user?.id ?? null
    if (!authUserId) {
      setStatus('Create task error: user is not authenticated')
      return
    }

    const canAssignInProject = canAssignTasksInProject(selectedProjectId)
    const normalizedAssignedTo =
      input.assignedTo ?? (canAssignInProject ? undefined : authUserId)

    if (
      normalizedAssignedTo &&
      normalizedAssignedTo !== authUserId &&
      !canAssignInProject
    ) {
      setStatus('Permission denied: only owner, admin, or manager can assign tasks')
      return
    }

    setIsLoading(true)

    try {
      const createdTask = await createTask({
        projectId: selectedProjectId,
        workPackageId: input.workPackageId,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        assignedTo: normalizedAssignedTo,
        estimateHours: input.estimateHours,
        actualHours: input.actualHours,
        blockedByTaskId: input.blockedByTaskId,
        dueDate: input.dueDate,
      })

      await refreshProjectSnapshot(selectedProjectId)
      setStatus(`Task created: ${createdTask.title}`)
    } catch (error) {
      if (error instanceof Error && error.message.includes('row-level security policy')) {
        setStatus(
          'Create task error: RLS blocks insert into tasks. Apply tasks policies in Supabase SQL Editor, then retry.',
        )
      } else {
        setStatus(error instanceof Error ? `Create task error: ${error.message}` : 'Unknown error')
      }
    }

    setIsLoading(false)
  }

  const editTask = async (
    taskId: string,
    patch: {
      title?: string
      description?: string
      status?: string
      priority?: string
      workPackageId?: string
      assignedTo?: string
      estimateHours?: number
      actualHours?: number
      dueDate?: string
    },
  ) => {
    const targetTask = tasks.find((task) => task.id === taskId)

    if (targetTask?.project_id && !ensureProjectEditable(targetTask.project_id, 'update task')) {
      return
    }

    if (targetTask && !canManageTask(targetTask)) {
      setStatus('Permission denied: you cannot update this task')
      return
    }

    if (
      patch.assignedTo !== undefined &&
      targetTask?.project_id &&
      !canAssignTasksInProject(targetTask.project_id)
    ) {
      setStatus('Permission denied: only owner, admin, or manager can assign tasks')
      return
    }

    try {
      const updatedTask = await updateTask(taskId, {
        title: patch.title,
        description: patch.description,
        status: patch.status,
        priority: patch.priority,
        work_package_id: patch.workPackageId,
        assigned_to: patch.assignedTo,
        estimate_hours: patch.estimateHours,
        actual_hours: patch.actualHours,
        due_date: patch.dueDate,
      })

      const projectIdToRefresh = updatedTask.project_id ?? targetTask?.project_id ?? selectedProjectId
      if (projectIdToRefresh) {
        await refreshProjectSnapshot(projectIdToRefresh)
      } else {
        setTasks((prev) => prev.map((task) => (task.id === taskId ? updatedTask : task)))
      }

      setStatus(`Task updated: ${updatedTask.title}`)
    } catch (error) {
      setStatus(error instanceof Error ? `Update task error: ${error.message}` : 'Unknown error')
    }
  }

  const removeTask = async (taskId: string) => {
    const targetTask = tasks.find((task) => task.id === taskId)

    if (targetTask?.project_id && !ensureProjectEditable(targetTask.project_id, 'delete task')) {
      return
    }

    if (targetTask && !canDeleteTask(targetTask)) {
      setStatus('Permission denied: you cannot delete this task')
      return
    }

    try {
      await deleteTask(taskId)

      if (selectedProjectId) {
        await refreshProjectSnapshot(selectedProjectId)
      } else {
        setTasks((prev) => prev.filter((task) => task.id !== taskId))
        await reloadProjectsOnly()
      }

      setStatus('Task deleted')
    } catch (error) {
      setStatus(error instanceof Error ? `Delete task error: ${error.message}` : 'Unknown error')
    }
  }

  const inviteMemberToSelectedProjectByEmail = async (email: string, role = 'member') => {
    if (!selectedProjectId) {
      setStatus('Select a project before inviting members')
      return
    }

    if (!ensureProjectEditable(selectedProjectId, 'invite members')) {
      return
    }

    if (!canInviteToProject(selectedProjectId)) {
      setStatus('Permission denied: only project members can invite users')
      return
    }

    setIsLoading(true)

    try {
      await inviteProjectMemberByEmail({
        projectId: selectedProjectId,
        email,
        role,
      })
      const nextMembers = await getProjectMembers(selectedProjectId)
      setProjectMembers(nextMembers)
      setStatus('Member invited to project by email')
    } catch (error) {
      if (error instanceof Error) {
        const normalizedMessage = error.message.toLowerCase()
        if (normalizedMessage.includes('user with this email was not found')) {
          setStatus('User with this email does not exist')
        } else {
          setStatus(`Invite member error: ${error.message}`)
        }
      } else {
        setStatus('Unknown error')
      }
    }

    setIsLoading(false)
  }

  const changeSelectedProjectMemberRole = async (userId: string, role: string) => {
    if (!selectedProjectId) {
      setStatus('Select a project before changing member roles')
      return
    }

    const normalizedNextRole = role.trim().toLowerCase()
    const isSelfRoleUpdate = Boolean(currentUserId) && userId === currentUserId
    const selfMember = projectMembers.find((member) => member.user_id === userId)
    const isSelfCurrentlyAdmin = (selfMember?.role ?? '').toLowerCase() === 'admin'
    const otherAdminsCount = projectMembers.filter(
      (member) => member.user_id !== userId && (member.role ?? '').toLowerCase() === 'admin',
    ).length

    if (isSelfRoleUpdate && isSelfCurrentlyAdmin && normalizedNextRole !== 'admin' && otherAdminsCount === 0) {
      setStatus('You cannot change your role: add another admin first')
      return
    }

    if (!ensureProjectEditable(selectedProjectId, 'change member roles')) {
      return
    }

    if (!canManageProject(selectedProjectId)) {
      setStatus('Permission denied: only owner or admin can change roles')
      return
    }

    setIsLoading(true)

    try {
      await updateProjectMemberRole({
        projectId: selectedProjectId,
        userId,
        role,
      })
      const nextMembers = await getProjectMembers(selectedProjectId)
      setProjectMembers(nextMembers)
      setStatus('Member role updated')
    } catch (error) {
      setStatus(error instanceof Error ? `Update role error: ${error.message}` : 'Unknown error')
    }

    setIsLoading(false)
  }

  const getSelectedProjectMemberUnfinishedTasksCount = async (userId: string) => {
    if (!selectedProjectId) {
      return 0
    }

    return getProjectMemberUnfinishedTasksCount(selectedProjectId, userId)
  }

  const removeSelectedProjectMember = async (userId: string, unassignUnfinishedTasks: boolean) => {
    if (!selectedProjectId) {
      setStatus('Select a project before removing members')
      return
    }

    if (!ensureProjectEditable(selectedProjectId, 'remove members')) {
      return
    }

    if (!canManageProject(selectedProjectId)) {
      setStatus('Permission denied: only owner or admin can remove members')
      return
    }

    setIsLoading(true)

    try {
      await removeProjectMember({
        projectId: selectedProjectId,
        userId,
        unassignUnfinishedTasks,
      })

      const [nextMembers, nextTasks] = await Promise.all([
        getProjectMembers(selectedProjectId),
        getProjectTasks(selectedProjectId),
      ])
      setProjectMembers(nextMembers)
      setTasks(nextTasks)
      applyProjectMetricsFromTasks(selectedProjectId, nextTasks)
      await reloadProjectsOnly()
      setStatus('Member removed from project')
    } catch (error) {
      setStatus(error instanceof Error ? `Remove member error: ${error.message}` : 'Unknown error')
    }

    setIsLoading(false)
  }

  const resetDashboardPreview = () => {
    setProjects([])
    setTasks([])
    setProjectMembers([])
    setSelectedProjectId(null)
    setStatus('Click the button to load dashboard data')
  }

  const completeSelectedProject = async () => {
    if (!selectedProjectId) {
      setStatus('Select a project before completing it')
      return
    }

    if (isProjectCompleted(selectedProjectId)) {
      setStatus('Project is already completed')
      return
    }

    if (!canManageProject(selectedProjectId)) {
      setStatus('Permission denied: only owner or admin can complete this project')
      return
    }

    setIsLoading(true)

    try {
      const latestTasks = await getProjectTasks(selectedProjectId)
      setTasks(latestTasks)

      const incompleteTasksCount = latestTasks.filter((task: TaskPreview) => !isTaskClosedStatus(task.status)).length
      if (incompleteTasksCount > 0) {
        setStatus(`Cannot complete project: ${incompleteTasksCount} unfinished task(s) remain`)
        setIsLoading(false)
        return
      }

      const completedProject = await completeProject(selectedProjectId)
      setProjects((prev) =>
        prev.map((project) => (project.id === selectedProjectId ? completedProject : project)),
      )
      setStatus(`Project completed: ${completedProject.name}`)
    } catch (error) {
      setStatus(error instanceof Error ? `Complete project error: ${error.message}` : 'Unknown error')
    }

    setIsLoading(false)
  }

  return {
    status,
    setStatus,
    isLoading,
    projects,
    tasks,
    projectMembers,
    selectedProjectId,
    currentUserId,
    getProjectRole,
    canManageProject,
    canDeleteProject,
    canAssignTasksInProject,
    canInviteToProject,
    loadDashboardPreview,
    selectProject,
    addProject,
    editProject,
    removeProject,
    addTask,
    editTask,
    removeTask,
    inviteMemberToSelectedProjectByEmail,
    changeSelectedProjectMemberRole,
    getSelectedProjectMemberUnfinishedTasksCount,
    removeSelectedProjectMember,
    completeSelectedProject,
    canManageTask,
    canDeleteTask,
    resetDashboardPreview,
  }
}
