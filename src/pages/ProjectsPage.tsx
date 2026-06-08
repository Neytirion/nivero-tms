import { useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '../shared/components'
import { useWorkspace } from '../features/dashboard/workspace-context.tsx'
import { CreateProjectModal, ProjectDetailsSection, ProjectsSummaryCards, ProjectsTable, type DetailsTab } from '../features/projects/components'
import { useProjectForm } from '../features/projects/hooks/useProjectForm.ts'
import { deriveRisk } from '../features/projects/utils/project-metrics.ts'

export function ProjectsPage() {
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
    deadline: string
  }>({
    projectId: null,
    name: '',
    description: '',
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
          deadline: selectedProject?.deadline_at ?? '',
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
            deadline: selectedProject.deadline_at ?? '',
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

    await editProject(selectedProject.id, {
      name: currentSettingsDraft.name,
      description: currentSettingsDraft.description,
      deadlineAt: currentSettingsDraft.deadline || undefined,
    })

    setIsSaveSettingsConfirmOpen(false)
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

  return (
    <div className="space-y-5">
      <section className="page-section bg-[linear-gradient(120deg,rgba(14,116,144,0.08),rgba(2,132,199,0.03))]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Projects</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Project Portfolio</h2>
            <p className="mt-2 text-sm text-slate-600">Create, filter, and drill down into project health, tasks, estimates, and team access.</p>
          </div>
        </div>
        <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{status}</p>
      </section>

      <ProjectsSummaryCards
        totalProjects={totalProjects}
        activeProjects={activeProjects}
        completedProjects={completedProjects}
        riskProjects={riskProjects}
      />

      <ProjectsTable
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        isLoading={isLoading}
        onOpenCreateProject={() => setIsCreateModalOpen(true)}
        onRefresh={() => void loadDashboardPreview()}
        projects={filteredProjects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(projectId) => void selectProject(projectId)}
        onOpenProjectSettings={(projectId: string) => {
          setActiveTab('settings')
          return selectProject(projectId)
        }}
      />

      <ProjectDetailsSection
        selectedProject={selectedProject}
        selectedProjectId={selectedProjectId}
        myRoleInSelectedProject={myRoleInSelectedProject}
        isLoading={isLoading}
        canManageProject={canManageProject}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        settingsName={currentSettingsDraft.name}
        onSettingsNameChange={(value) => updateSettingsDraft({ name: value })}
        settingsDescription={currentSettingsDraft.description}
        onSettingsDescriptionChange={(value) => updateSettingsDraft({ description: value })}
        settingsDeadline={currentSettingsDraft.deadline}
        onSettingsDeadlineChange={(value) => updateSettingsDraft({ deadline: value })}
        canEditSelectedProject={canEditSelectedProject}
        canDeleteSelectedProject={canDeleteSelectedProject}
        tasks={tasks}
        incompleteTaskCount={incompleteTaskCount}
        teamMemberNames={teamMemberNames}
        projectManagerName={projectManagerName}
        canInviteToSelectedProject={canInviteToSelectedProject}
        memberEmail={memberEmail}
        onMemberEmailChange={setMemberEmail}
        memberRole={effectiveMemberRole}
        onMemberRoleChange={setMemberRole}
        canAssignAdminRole={canAssignAdminRole}
        canAssignManagerRole={canAssignManagerRole}
        onInviteMember={inviteMemberHandler}
        projectMembers={projectMembers}
        pendingRoleByUserId={pendingRoleByUserId}
        onPendingRoleChange={(userId, role) =>
          setPendingRoleByUserId((prev) => ({
            ...prev,
            [userId]: role,
          }))
        }
        selectedProjectOwnerId={selectedProject?.owner_id}
        onSaveRole={updateMemberRoleHandler}
        onOpenDeleteConfirm={() => setIsDeleteConfirmOpen(true)}
        onOpenCompleteConfirm={() => setIsCompleteConfirmOpen(true)}
        onOpenSaveSettingsConfirm={() => setIsSaveSettingsConfirmOpen(true)}
      />

      <ConfirmDialog
        isOpen={isCompleteConfirmOpen}
        title="Complete project"
        description={`Mark "${selectedProject?.name ?? ''}" as completed? You can keep viewing it in the list.`}
        confirmText="Complete project"
        tone="success"
        onCancel={() => setIsCompleteConfirmOpen(false)}
        onConfirm={completeProjectHandler}
      />

      <ConfirmDialog
        isOpen={isSaveSettingsConfirmOpen}
        title="Save project settings"
        description={`Save changes for "${selectedProject?.name ?? ''}"?`}
        confirmText="Save settings"
        tone="success"
        onCancel={() => setIsSaveSettingsConfirmOpen(false)}
        onConfirm={saveProjectSettings}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete project"
        description={`Delete "${selectedProject?.name ?? ''}"? This action cannot be undone.`}
        confirmText="Delete project"
        tone="danger"
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={deleteSelectedProjectHandler}
      />

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        projectName={projectName}
        projectCustomer={projectCustomer}
        projectStartDate={projectStartDate}
        projectEndDate={projectEndDate}
        isLoading={isLoading}
        canSubmit={canSubmit}
        onProjectNameChange={setProjectName}
        onProjectCustomerChange={setProjectCustomer}
        onProjectStartDateChange={setProjectStartDate}
        onProjectEndDateChange={setProjectEndDate}
        onCreate={createProjectHandler}
        onClose={() => {
          setIsCreateModalOpen(false)
          reset()
        }}
      />
    </div>
  )
}
