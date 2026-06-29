import { useNavigate, useParams } from 'react-router-dom'
import { useTasksPageController } from './useTasksPageController'
import { useEffect, useState } from 'react'
import { TaskCommentsPanel } from '../../features/tasks/components/comments'

export function TaskDetailsPage() {
  const navigate = useNavigate()
  const { taskId } = useParams<{ taskId: string }>()
  const [isCommentsOpen, setIsCommentsOpen] = useState(false)

  const {
    tasks,
    canAssignAssignee,
    canManageTask,
    canDeleteTaskInView,
    projectStartDate,
    projectEndDate,
    assigneeLabelByUserId,
    workPackageLabelById,
    dependencyLabelByTaskId,
    assigneeOptions,
    assignTaskHandler,
    updateTaskDueDateHandler,
    removeTask,
  } = useTasksPageController()

  const task = tasks.find((t) => t.id === taskId)

  useEffect(() => {
    if (!task && taskId) {
      navigate('/app/tasks', { replace: true })
    }
  }, [task, taskId, navigate])

  if (!task) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-slate-500">Loading task...</div>
      </div>
    )
  }

  function getPriorityBadgeClass(priority: string | null | undefined) {
    const normalized = (priority ?? 'medium').toLowerCase()

    if (normalized === 'high') {
      return 'bg-rose-100 text-rose-800 border border-rose-200'
    }

    if (normalized === 'low') {
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
    }

    return 'bg-amber-100 text-amber-800 border border-amber-200'
  }

  function getStatusBadgeClass(status: string | null | undefined) {
    const normalized = (status ?? 'todo').toLowerCase()

    if (normalized === 'done' || normalized === 'completed') {
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
    }

    if (normalized === 'in_progress' || normalized === 'in-progress') {
      return 'bg-blue-100 text-blue-800 border border-blue-200'
    }

    if (normalized === 'review') {
      return 'bg-purple-100 text-purple-800 border border-purple-200'
    }

    return 'bg-slate-100 text-slate-800 border border-slate-200'
  }

  const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'
  const dueDateInputValue = task.due_date?.slice(0, 10) ?? ''
  const assigneeLabel = task.assigned_to ? assigneeLabelByUserId[task.assigned_to] : 'Unassigned'
  const workPackageLabel = task.work_package_id ? workPackageLabelById[task.work_package_id] : 'Not linked'
  const blockedByLabel = task.blocked_by_task_id ? dependencyLabelByTaskId[task.blocked_by_task_id] : undefined
  const isLocked = !canManageTask(task.id)
  const canDelete = canDeleteTaskInView(task.id)

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/app/tasks')}
            className="mb-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Tasks
          </button>
          <h1 className="text-3xl font-bold text-slate-900">{task.title}</h1>
          <p className="mt-2 text-slate-600">{task.description || 'No description'}</p>
        </div>

        {/* Main Card */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="space-y-6 p-6">
            {/* Status and Priority */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                <span
                  className={`inline-block rounded-full px-3 py-1 text-sm font-semibold uppercase tracking-wide ${getStatusBadgeClass(
                    task.status,
                  )}`}
                >
                  {task.status ?? 'todo'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Priority</label>
                <span
                  className={`inline-block rounded-full px-3 py-1 text-sm font-semibold uppercase tracking-wide ${getPriorityBadgeClass(
                    task.priority,
                  )}`}
                >
                  {task.priority ?? 'medium'}
                </span>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label htmlFor="task-due-date" className="block text-sm font-semibold text-slate-700 mb-2">
                Due Date
              </label>
              {!isLocked ? (
                <input
                  id="task-due-date"
                  type="date"
                  value={dueDateInputValue}
                  min={projectStartDate || undefined}
                  max={projectEndDate || undefined}
                  onChange={(event) => void updateTaskDueDateHandler(task.id, event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              ) : (
                <p className="text-slate-600">{dueDate}</p>
              )}
            </div>

            {/* Assignee */}
            <div>
              <label htmlFor="task-assignee" className="block text-sm font-semibold text-slate-700 mb-2">
                Assignee
              </label>
              {!isLocked && canAssignAssignee && assigneeOptions ? (
                <select
                  id="task-assignee"
                  value={task.assigned_to ?? ''}
                  onChange={(event) => void assignTaskHandler(task.id, event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Unassigned</option>
                  {assigneeOptions.map((option) => (
                    <option key={option.userId} value={option.userId}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-slate-600">{assigneeLabel}</p>
              )}
            </div>

            {/* Work Package */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Work Package</label>
              <p className="text-slate-600">{workPackageLabel}</p>
            </div>

            {/* Blocked By */}
            {blockedByLabel ? (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Blocked By</label>
                <p className="text-slate-600">{blockedByLabel}</p>
              </div>
            ) : null}

            {/* Hours */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Estimate Hours</label>
                <p className="text-slate-600">{task.estimate_hours ?? 0}h</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Actual Hours</label>
                <p className="text-slate-600">{task.actual_hours ?? 0}h</p>
              </div>
            </div>

            {/* Comments */}
            <div>
              <button
                type="button"
                onClick={() => setIsCommentsOpen((prev) => !prev)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                {isCommentsOpen ? 'Hide Comments' : 'Show Comments'}
              </button>

              {isCommentsOpen && task.project_id ? (
                <div className="mt-4">
                  <TaskCommentsPanel
                    projectId={task.project_id}
                    taskId={task.id}
                    readOnly={isLocked}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {/* Action Buttons */}
          {!isLocked ? (
            <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
              {canDelete ? (
                <button
                  type="button"
                  onClick={async () => {
                    await removeTask(task.id)
                    navigate('/app/tasks')
                  }}
                  className="rounded-lg bg-rose-100 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-200"
                >
                  Delete Task
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
