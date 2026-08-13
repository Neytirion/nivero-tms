import { TaskViewsSection } from '.'
import type { ProjectMemberListItem } from '../../lib/pm'
import { UserProfileDialog, type UserProfilePreview } from '../../shared/components'
import { useTasksPageController } from './useTasksPageController'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

export function TasksPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const {
    selectedProject,
    selectedProjectId,
    myRoleInSelectedProject,
    projectMembers,
    currentUserProfile,
    tasks,
    taskViewMode,
    setTaskViewMode,
    dragTaskId,
    setDragTaskId,
    canManageTask,
    hasEstimateVersion,
    assigneeLabelByUserId,
    dependencyLabelByTaskId,
    workPackageLabelById,
    moveTaskToStatus,
    resetPageState,
  } = useTasksPageController()

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

  const visibleProjectMembers = selectedProject ? projectMembers : []
  const [isMembersOpen, setIsMembersOpen] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<UserProfilePreview | null>(null)

  const membersByUserId = useMemo(
    () => projectMembers.reduce<Record<string, ProjectMemberListItem>>((acc, member) => {
      if (member.user_id) {
        acc[member.user_id] = member
      }
      return acc
    }, {}),
    [projectMembers],
  )

  const openUserProfile = (userId: string) => {
    if (currentUserProfile?.userId === userId) {
      setSelectedProfile(currentUserProfile)
      return
    }

    const member = membersByUserId[userId]

    if (member) {
      setSelectedProfile({
        userId: member.user_id,
        fullName: member.full_name,
        email: member.email,
        role: member.role,
        joinedAt: member.joined_at,
      })
      return
    }

    setSelectedProfile({
      userId,
      fullName: assigneeLabelByUserId[userId] ?? userId,
    })
  }

  return (
    <div className="space-y-5">
      <section className="page-section bg-[linear-gradient(120deg,rgba(14,116,144,0.08),rgba(16,185,129,0.06))]">
        {selectedProjectId && (
          <button
            type="button"
            onClick={() => navigate(`/app/projects/${selectedProjectId}`)}
            className="mb-3 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            ← Back to Project Details
          </button>
        )}
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Kanban Board</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          {selectedProject?.name || 'Select a project'}
        </h2>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Your Project Role</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900 truncate">
              {selectedProject && myRoleInSelectedProject
                ? `${myRoleInSelectedProject} in ${selectedProject.name}`
                : 'Select a project to see your role.'}
            </p>
          </div>
          {selectedProject && (
            <button
              aria-label="Toggle members"
              onClick={() => setIsMembersOpen((v) => !v)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 6a5 5 0 0 1 10 0H3Z" />
              </svg>
              {visibleProjectMembers.length}
              <svg
                className={`h-3 w-3 transition-transform ${isMembersOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M4.5 6.5 8 10l3.5-3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        {isMembersOpen && selectedProject && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            {visibleProjectMembers.length === 0 ? (
              <p className="text-xs text-slate-500">No members found in this project yet.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {visibleProjectMembers.map((member) => {
                  const memberName = member.full_name || member.email || member.user_id || 'Unknown'
                  const initials = memberName.slice(0, 2).toUpperCase()
                  return (
                    <li key={member.member_id} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                        {initials}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (member.user_id) {
                            openUserProfile(member.user_id)
                          }
                        }}
                        className="text-xs font-medium text-slate-700 underline-offset-2 hover:text-cyan-700 hover:underline"
                      >
                        {memberName}
                      </button>
                      <span className="text-[10px] uppercase tracking-wide text-slate-400">{member.role}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </section>

      <TaskViewsSection
        taskViewMode={taskViewMode}
        onTaskViewModeChange={setTaskViewMode}
        tasks={tasks}
        assigneeLabelByUserId={assigneeLabelByUserId}
        workPackageLabelById={workPackageLabelById}
        dependencyLabelByTaskId={dependencyLabelByTaskId}
        onOpenUserProfile={openUserProfile}
        dragTaskId={dragTaskId}
        onDragTaskIdChange={setDragTaskId}
        onMoveTaskToStatus={(taskId, status) => {
          void moveTaskToStatus(taskId, status)
        }}
        onTaskClick={(taskId) => navigate(`/app/tasks/${taskId}`)}
        canManageTask={canManageTask}
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
