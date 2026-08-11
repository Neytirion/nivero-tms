import { TaskLogTimeModal } from '../../features/tasks/components'
import { TaskViewsSection } from '.'
import { useTasksPageController } from './useTasksPageController'
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

export function TasksPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const {
    isLoading,
    selectedProject,
    selectedProjectId,
    myRoleInSelectedProject,
    projectMembers,
    tasks,
    taskViewMode,
    setTaskViewMode,
    dragTaskId,
    setDragTaskId,
    calendarMonth,
    setCalendarMonth,
    canAssignAssignee,
    canManageTask,
    canDeleteTaskInView,
    projectStartDate,
    projectEndDate,
    hasEstimateVersion,
    assigneeLabelByUserId,
    dependencyLabelByTaskId,
    workPackageLabelById,
    assigneeOptions,
    logTimeTask,
    setLogTimeTask,
    calendarMeta,
    moveTaskToStatus,
    assignTaskHandler,
    updateTaskDueDateHandler,
    removeTask,
    submitTaskLogTime,
    shiftCalendarMonth,
    hasMoreTasks,
    tasksTotalCount,
    loadMoreTasks,
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
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Execution Pipeline</h2>
        <p className="mt-2 text-sm text-slate-600">
          Drag and drop tasks between Backlog, To Do, In Progress, Review, and Done.
        </p>
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
                      <span className="text-xs font-medium text-slate-700">{memberName}</span>
                      <span className="text-[10px] uppercase tracking-wide text-slate-400">{member.role}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="page-section bg-slate-50/70">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="section-title">Create Task</h3>
            <p className="section-subtitle">Add a new task to your project</p>
          </div>
          <button
            onClick={() => navigate('/app/tasks/create')}
            disabled={!selectedProject || hasEstimateVersion === false}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create task
          </button>
        </div>
        {selectedProject && hasEstimateVersion === false && (
          <p className="mt-2 text-sm text-slate-600">
            Create estimate version v1 in Project Details → Estimates before creating tasks.
          </p>
        )}
      </section>

      <TaskViewsSection
        taskViewMode={taskViewMode}
        onTaskViewModeChange={setTaskViewMode}
        tasks={tasks}
        assigneeLabelByUserId={assigneeLabelByUserId}
        workPackageLabelById={workPackageLabelById}
        dependencyLabelByTaskId={dependencyLabelByTaskId}
        assigneeOptions={assigneeOptions}
        canAssignAssignee={canAssignAssignee}
        dragTaskId={dragTaskId}
        onDragTaskIdChange={setDragTaskId}
        onMoveTaskToStatus={(taskId, status) => {
          void moveTaskToStatus(taskId, status)
        }}
        onAssignTask={(taskId, userId) => {
          void assignTaskHandler(taskId, userId)
        }}
        onUpdateTaskDueDate={(taskId, dueDate) => {
          void updateTaskDueDateHandler(taskId, dueDate)
        }}
        onDeleteTask={(taskId) => {
          void removeTask(taskId)
        }}
        onLogTime={(task) => {
          setLogTimeTask(task)
        }}
        onTaskClick={(taskId) => navigate(`/app/tasks/${taskId}`)}
        canManageTask={canManageTask}
        canDeleteTask={canDeleteTaskInView}
        projectStartDate={projectStartDate}
        projectEndDate={projectEndDate}
        calendarMonth={calendarMonth}
        onCalendarMonthChange={setCalendarMonth}
        onShiftCalendarMonth={shiftCalendarMonth}
        calendarMeta={calendarMeta}
      />

      <TaskLogTimeModal
        isOpen={Boolean(logTimeTask)}
        taskTitle={logTimeTask?.title ?? ''}
        onClose={() => setLogTimeTask(null)}
        onSubmit={submitTaskLogTime}
        isSubmitting={isLoading}
      />

      {hasMoreTasks && (
        <section className="page-section">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing {tasks.length} of {tasksTotalCount} tasks
            </p>
            <button
              type="button"
              onClick={() => void loadMoreTasks()}
              disabled={isLoading}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Load more tasks
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
