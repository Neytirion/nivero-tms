import { TaskViewsSection } from '.'
import { UserProfileDialog, type UserProfilePreview } from '../../shared/components'
import { useTasksPageController } from './useTasksPageController'
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

export function TasksPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const {
    selectedProject,
    selectedProjectId,
    projectMembers,
    tasks,
    taskViewMode,
    setTaskViewMode,
    dragTaskId,
    setDragTaskId,
    canManageTask,
    canTakeUnassignedTasks,
    hasEstimateVersion,
    currentUserProfile,
    assigneeLabelByUserId,
    assigneeAvatarUrlByUserId,
    dependencyLabelByTaskId,
    workPackageLabelById,
    workPackageColorById,
    moveTaskToStatus,
    claimTaskHandler,
    selectProject,
    resetPageState,
  } = useTasksPageController()

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
      <section className="page-section bg-[linear-gradient(120deg,rgba(14,116,144,0.08),rgba(16,185,129,0.06))]">
        {selectedProjectId && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/app/projects/${selectedProjectId}`)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              ← Back to Project Details
            </button>
            <button
              type="button"
              onClick={() => navigate(`/app/tasks/card-settings?projectId=${selectedProjectId}`)}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-900 transition hover:bg-cyan-100"
            >
              Edit Card Settings
            </button>
          </div>
        )}
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Kanban Board</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          {selectedProject?.name || 'Select a project'}
        </h2>
      </section>

      <TaskViewsSection
        taskViewMode={taskViewMode}
        onTaskViewModeChange={setTaskViewMode}
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
          onClick={() => navigate('/app/tasks/create')}
          disabled={hasEstimateVersion === false}
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
