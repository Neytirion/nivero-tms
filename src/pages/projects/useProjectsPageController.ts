import { useEffect, useMemo, useState } from 'react'
import { useWorkspace } from '../../features/dashboard/workspace-context.tsx'
import { useProjectForm } from '../../features/projects/hooks/useProjectForm.ts'
import { deriveRisk } from '../../features/projects/utils/project-metrics.ts'
import { hasProjectPermission } from '../../shared/utils/permissions'
import type { DetailsTab } from '../../features/projects/components'

export function useProjectsPageController() {
  const {
    projectName,
    setProjectName,
    projectCustomer,
    setProjectCustomer,
    projectStartDate,
    setProjectStartDate,
    projectEndDate,
    setProjectEndDate,
    canSubmit,
    reset,
  } = useProjectForm()

  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState('member')
  const [searchValue, setSearchValue] = useState('')
  const [activeTab, setActiveTab] = useState<DetailsTab>('overview')
  const [isCompleteConfirmOpen, setIsCompleteConfirmOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [settingsDraft, setSettingsDraft] = useState<{
    projectId: string | null
    name: string
    description: string
    startDate: string
    deadline: string
  }>({
    projectId: null,
    name: '',
    description: '',
    startDate: '',
    deadline: '',
  })
  const [isSaveSettingsConfirmOpen, setIsSaveSettingsConfirmOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [pendingRoleByUserId, setPendingRoleByUserId] = useState<Record<string, string>>({})

  const {
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
    canInviteToProject,
    loadDashboardPreview,
    selectProject,
    addProject,
    editProject,
    removeProject,
    inviteMemberToSelectedProjectByEmail,
    changeSelectedProjectMemberRole,
    completeSelectedProject,
  } = useWorkspace()

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null
  const myRoleInSelectedProject = selectedProject ? getProjectRole(selectedProject.id) : null
  const canEditSelectedProject = selectedProject ? canManageProject(selectedProject.id) : false
  const canDeleteSelectedProject = selectedProject ? canDeleteProject(selectedProject.id) : false
  const canInviteToSelectedProject = selectedProject ? canInviteToProject(selectedProject.id) : false
  const canManageMemberRoles = hasProjectPermission(myRoleInSelectedProject, 'member.role.update')
  const canAssignAdminRole =
    selectedProject?.owner_id != null && selectedProject.owner_id === currentUserId
  const canAssignManagerRole = myRoleInSelectedProject === 'owner' || myRoleInSelectedProject === 'admin'

  const effectiveMemberRole = useMemo(() => {
    if (memberRole === 'admin' && !canAssignAdminRole) {
      return 'member'
    }

    if (memberRole === 'manager' && !canAssignManagerRole) {
      return 'member'
    }

    return memberRole
  }, [memberRole, canAssignAdminRole, canAssignManagerRole])

  const totalProjects = projects.length
  const activeProjects = projects.filter((project) => (project.status ?? '').toLowerCase() !== 'completed').length
  const completedProjects = projects.filter((project) => (project.status ?? '').toLowerCase() === 'completed').length
  const riskProjects = projects.filter((project) => deriveRisk(project) === 'Red').length
  const teamMemberNames = projectMembers.map((member) => member.full_name ?? member.email ?? 'Unknown')
  const teamMemberNameByUserId = projectMembers.reduce<Record<string, string>>((acc, member) => {
    if (member.user_id) {
      acc[member.user_id] = member.full_name ?? member.email ?? member.user_id
    }
    return acc
  }, {})
  const projectManagerName = selectedProject?.project_manager_id
    ? teamMemberNameByUserId[selectedProject.project_manager_id] ?? 'Assigned'
    : 'Not set'
  const incompleteTaskCount = tasks.filter((task) => (task.status ?? '').toLowerCase() !== 'done' && (task.status ?? '').toLowerCase() !== 'completed').length
  const currentSettingsDraft =
    selectedProject && settingsDraft.projectId === selectedProject.id
      ? settingsDraft
      : {
          projectId: selectedProject?.id ?? null,
          name: selectedProject?.name ?? '',
          description: selectedProject?.description ?? '',
          startDate: selectedProject?.start_date ?? '',
            deadline: selectedProject?.end_date ?? selectedProject?.deadline_at ?? '',
        }

  const filteredProjects = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    if (!query) {
      return projects
    }

    return projects.filter((project) => {
      const source = [project.name, project.customer_name, project.description].filter(Boolean).join(' ').toLowerCase()
      return source.includes(query)
    })
  }, [projects, searchValue])

  useEffect(() => {
    if (!selectedProjectId) {
      return
    }

    void selectProject(selectedProjectId)
    // Intentionally track selected project only to refresh members/tasks snapshot on page entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId])

  const updateSettingsDraft = (patch: Partial<Omit<typeof currentSettingsDraft, 'projectId'>>) => {
    if (!selectedProject) {
      return
    }

    const baseDraft =
      settingsDraft.projectId === selectedProject.id
        ? settingsDraft
        : {
            projectId: selectedProject.id,
            name: selectedProject.name,
            description: selectedProject.description ?? '',
            startDate: selectedProject.start_date ?? '',
              deadline: selectedProject.end_date ?? selectedProject.deadline_at ?? '',
          }

    setSettingsDraft({
      ...baseDraft,
      ...patch,
    })
  }

  const createProjectHandler = async () => {
    if (!canSubmit) {
      return
    }

    await addProject({
      name: projectName.trim(),
      customerName: projectCustomer.trim() || undefined,
      startDate: projectStartDate || undefined,
      endDate: projectEndDate || undefined,
    })
    reset()
    setIsCreateModalOpen(false)
  }

  const inviteMemberHandler = async () => {
    const email = memberEmail.trim()

    if (!selectedProjectId) {
      setStatus('Select a project before inviting members')
      return
    }

    if (!email) {
      setStatus('Member email is required')
      return
    }

    await inviteMemberToSelectedProjectByEmail(email, effectiveMemberRole)
    setMemberEmail('')
  }

  const completeProjectHandler = async () => {
    if (!selectedProject) {
      return
    }

    await completeSelectedProject()
    setIsCompleteConfirmOpen(false)
  }

  const saveProjectSettings = async () => {
    if (!selectedProject) {
      return
    }

    if (currentSettingsDraft.startDate && currentSettingsDraft.deadline && currentSettingsDraft.deadline < currentSettingsDraft.startDate) {
      setStatus('Planned end date cannot be earlier than start date')
      return
    }

    const wasSaved = await editProject(selectedProject.id, {
      name: currentSettingsDraft.name,
      description: currentSettingsDraft.description,
      startDate: currentSettingsDraft.startDate || undefined,
      deadlineAt: currentSettingsDraft.deadline || undefined,
    })

    if (wasSaved) {
        setIsSaveSettingsConfirmOpen(false)
      }
  }

  const deleteSelectedProjectHandler = async () => {
    if (!selectedProjectId) {
      return
    }

    await removeProject(selectedProjectId)
    setIsDeleteConfirmOpen(false)
  }

  const updateMemberRoleHandler = async (userId: string, fallbackRole: string) => {
    const nextRole = pendingRoleByUserId[userId] ?? fallbackRole
    await changeSelectedProjectMemberRole(userId, nextRole)
  }

  return {
    status,
    isLoading,
    projects,
    tasks,
    projectMembers,
    selectedProject,
    selectedProjectId,
    myRoleInSelectedProject,
    canManageProject,
    canEditSelectedProject,
    canDeleteSelectedProject,
    canManageMemberRoles,
    canInviteToSelectedProject,
    canAssignAdminRole,
    canAssignManagerRole,
    effectiveMemberRole,
    totalProjects,
    activeProjects,
    completedProjects,
    riskProjects,
    teamMemberNames,
    projectManagerName,
    incompleteTaskCount,
    searchValue,
    setSearchValue,
    filteredProjects,
    activeTab,
    setActiveTab,
    memberEmail,
    setMemberEmail,
    memberRole,
    setMemberRole,
    pendingRoleByUserId,
    setPendingRoleByUserId,
    isCompleteConfirmOpen,
    setIsCompleteConfirmOpen,
    isSaveSettingsConfirmOpen,
    setIsSaveSettingsConfirmOpen,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    isCreateModalOpen,
    setIsCreateModalOpen,
    projectName,
    setProjectName,
    projectCustomer,
    setProjectCustomer,
    projectStartDate,
    setProjectStartDate,
    projectEndDate,
    setProjectEndDate,
    canSubmit,
    reset,
    currentSettingsDraft,
    updateSettingsDraft,
    createProjectHandler,
    inviteMemberHandler,
    completeProjectHandler,
    saveProjectSettings,
    deleteSelectedProjectHandler,
    updateMemberRoleHandler,
    loadDashboardPreview,
    selectProject,
  }
}
