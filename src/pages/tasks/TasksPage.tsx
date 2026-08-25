import { TaskViewsSection } from '.'
import { UserProfileDialog, WorkspacePageHeader, type UserProfilePreview } from '../../shared/components'
import { useTasksPageController } from './useTasksPageController'
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

export function TasksPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const {
    selectedProject,
    selectedProjectId,
    myRoleInSelectedProject,
    projectMembers,
    tasks,
    taskViewMode,
    setTaskViewMode,
    dragTaskId,
    setDragTaskId,
    canManageTask,
    canTakeUnassignedTasks,
    isWorkPackagesLoading,
    isTaskCardPreferencesLoading,
    currentUserProfile,
    assigneeLabelByUserId,
    assigneeAvatarUrlByUserId,
    dependencyLabelByTaskId,
    workPackageLabelById,
    workPackageColorById,
    taskCardFieldPreferences,
    moveTaskToStatus,
    claimTaskHandler,
    selectProject,
    resetPageState,
  } = useTasksPageController()

  const canOpenCardSettings = myRoleInSelectedProject === 'admin' || myRoleInSelectedProject === 'owner'

  // Restore selected project from URL when page loads or URL changes
  useEffect(() => {
    const projectId = searchParams.get('projectId')
    if (projectId && projectId !== selectedProjectId) {
      selectProject(projectId)
    }
  }, [searchParams, selectedProjectId, selectProject])

  // Reset page state when refresh signal is detected
  useEffect(() => {
    if (searchParams.has('refresh')) {
      resetPageState()
      // Remove the refresh parameter from URL
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('refresh')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, resetPageState, setSearchParams])

  const [selectedProfile, setSelectedProfile] = useState<UserProfilePreview | null>(null)

  const openUserProfile = (userId: string) => {
    // Find member in project members to get full info
    const member = projectMembers.find((m) => m.user_id === userId)
    
    if (member) {
      setSelectedProfile({
        userId: member.user_id,
        fullName: member.full_name,
        email: member.email,
        avatarUrl: member.avatar_url,
        role: member.role,
        joinedAt: member.joined_at,
      })
      return
    }

    // Fallback: just name if not found in members
    setSelectedProfile({
      userId,
      fullName: assigneeLabelByUserId[userId] ?? userId,
    })
  }

  return (
    <div className="space-y-5">
      <WorkspacePageHeader
        eyebrow="Kanban Board"
        title={selectedProject?.name || 'Select a project'}
        description="Track delivery, assignments, and due dates in one project-focused board."
        backButton={selectedProjectId ? { label: '← Back to Project Details', onClick: () => navigate(`/app/projects/${selectedProjectId}`) } : undefined}
        actions={canOpenCardSettings && selectedProjectId ? (
          <button
            type="button"
            onClick={() => navigate(`/app/tasks/card-settings?projectId=${selectedProjectId}`)}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-900 transition hover:bg-cyan-100"
          >
            Edit Card Settings
          </button>
        ) : null}
        badges={[
          ...(selectedProject?.status ? [{ label: selectedProject.status, tone: 'neutral' as const }] : []),
          ...(myRoleInSelectedProject ? [{ label: myRoleInSelectedProject, tone: 'cyan' as const }] : []),
        ]}
      />

      <TaskViewsSection
        taskViewMode={taskViewMode}
        onTaskViewModeChange={setTaskViewMode}
        isWorkPackagesLoading={isWorkPackagesLoading}
        isTaskCardPreferencesLoading={isTaskCardPreferencesLoading}
        tasks={tasks}
        assigneeLabelByUserId={assigneeLabelByUserId}
        assigneeAvatarUrlByUserId={assigneeAvatarUrlByUserId}
        workPackageLabelById={workPackageLabelById}
        workPackageColorById={workPackageColorById}
        dependencyLabelByTaskId={dependencyLabelByTaskId}
        onOpenUserProfile={openUserProfile}
        dragTaskId={dragTaskId}
        onDragTaskIdChange={setDragTaskId}
        onMoveTaskToStatus={(taskId, status) => {
          void moveTaskToStatus(taskId, status)
        }}
        onTaskClick={(taskId) => navigate(`/app/tasks/${taskId}`, { state: { backTo: `/app/tasks?projectId=${selectedProjectId}` } })}
        canManageTask={canManageTask}
        canTakeUnassignedTasks={canTakeUnassignedTasks}
        currentUserId={currentUserProfile?.userId ?? null}
        taskCardFieldPreferences={taskCardFieldPreferences}
        onTakeTask={(taskId) => {
          void claimTaskHandler(taskId)
        }}
      />

      <UserProfileDialog
        isOpen={Boolean(selectedProfile)}
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
      />

      {/* Плавающая кнопка (FAB) - Вариант 3 */}
      {selectedProject && (
        <button
          onClick={() => navigate(`/app/tasks/create?projectId=${selectedProject.id}`)}
          className="fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-blue-600 p-4 text-white hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          title="Create a new task"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
    </div>
  )
}
