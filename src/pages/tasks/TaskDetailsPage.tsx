import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTasksPageController } from './useTasksPageController'
import { useEffect, useState } from 'react'
import { TaskLogTimeModal } from '../../features/tasks/components'
import { TaskCommentsPanel } from '../../features/tasks/components/comments'
import { ConfirmDialog, UserProfileDialog, type UserProfilePreview } from '../../shared/components'

export function TaskDetailsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { taskId } = useParams<{ taskId: string }>()
  const [isCommentsOpen, setIsCommentsOpen] = useState(true)
  const [selectedProfile, setSelectedProfile] = useState<UserProfilePreview | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [estimateHoursDraft, setEstimateHoursDraft] = useState('0')

  const backTo =
    typeof location.state === 'object' &&
    location.state !== null &&
    'backTo' in location.state &&
    typeof location.state.backTo === 'string'
      ? location.state.backTo
      : '/app/tasks'

  const {
    isLoading,
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
    projectMembers,
    currentUserProfile,
    assignTaskHandler,
    updateTaskDueDateHandler,
    removeTask,
    logTimeTask,
    setLogTimeTask,
    submitTaskLogTime,
    editTask,
  } = useTasksPageController()

  const task = tasks.find((t) => t.id === taskId)
  const taskEstimateHours = task?.estimate_hours

  useEffect(() => {
    if (!task && taskId) {
      navigate(backTo, { replace: true })
    }
  }, [task, taskId, navigate, backTo])

  useEffect(() => {
    if (!taskId) {
      return
    }

    const estimateHours = taskEstimateHours ?? 0
    const syncTimerId = window.setTimeout(() => {
      setEstimateHoursDraft(String(estimateHours))
    }, 0)

    return () => {
      window.clearTimeout(syncTimerId)
    }
  }, [taskId, taskEstimateHours])

  if (!task) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-slate-500">Loading task...</div>
      </div>
    )
  }

  function getStatusLabel(status: string | null | undefined) {
    const value = (status ?? 'todo').replaceAll('_', ' ')
    return value.charAt(0).toUpperCase() + value.slice(1)
  }

  const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'
  const dueDateInputValue = task.due_date?.slice(0, 10) ?? ''
  const assigneeUserId = task.assigned_to ?? task.created_by
  const assigneeLabel = task.assigned_to
    ? assigneeLabelByUserId[task.assigned_to] ?? task.assigned_to
    : task.created_by
      ? `${assigneeLabelByUserId[task.created_by] ?? task.created_by} (creator)`
      : 'Unassigned'
  const workPackageLabel = task.work_package_id ? workPackageLabelById[task.work_package_id] : 'Not linked'
  const blockedByLabel = task.blocked_by_task_id ? dependencyLabelByTaskId[task.blocked_by_task_id] : undefined
  const isLocked = !canManageTask(task)
  const canDelete = canDeleteTaskInView(task)

  const currentUserId = currentUserProfile?.userId ?? null
  const isAssignee = Boolean(currentUserId && task.assigned_to === currentUserId)
  const isCreatorOfUnassigned = Boolean(currentUserId && !task.assigned_to && task.created_by === currentUserId)
  // Time logging is reserved for the person doing the work: the assignee (or the
  // creator while the task is still unassigned). Managers can edit tasks but do
  // not log time on someone else's behalf.
  const canLogTime = (isAssignee || isCreatorOfUnassigned) && !isLocked

  const estimateHours = task.estimate_hours ?? 0
  const actualHours = task.actual_hours ?? 0
  const remainingHours = Math.max(0, Math.round((estimateHours - actualHours) * 100) / 100)
  const isOverBudget = estimateHours > 0 && actualHours > estimateHours
  const canEditEstimateHours = !isLocked && canAssignAssignee
  const progressPct = estimateHours > 0
    ? Math.min(100, Math.round((actualHours / estimateHours) * 100))
    : 0

  const openUserProfile = (userId: string) => {
    if (currentUserProfile?.userId === userId) {
      setSelectedProfile(currentUserProfile)
      return
    }

    const member = projectMembers.find((candidate) => candidate.user_id === userId)

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

  const updateTaskStatusHandler = async (taskId: string, status: string) => {
    await editTask(taskId, { status })
  }

  const updateTaskPriorityHandler = async (taskId: string, priority: string) => {
    await editTask(taskId, { priority })
  }

  const updateTaskDescriptionHandler = async (taskId: string, description: string) => {
    await editTask(taskId, { description })
  }

  const updateTaskEstimateHoursHandler = async (taskId: string, nextValue: string) => {
    const normalized = nextValue.trim()

    if (!normalized) {
      setEstimateHoursDraft(String(estimateHours))
      return
    }

    const parsedEstimateHours = Number.parseFloat(normalized)
    if (!Number.isFinite(parsedEstimateHours) || parsedEstimateHours < 0) {
      setEstimateHoursDraft(String(estimateHours))
      return
    }

    if (parsedEstimateHours === estimateHours) {
      setEstimateHoursDraft(String(estimateHours))
      return
    }

    await editTask(taskId, { estimateHours: parsedEstimateHours })
  }

  const getDaysUntilDue = (dueDateRaw: string | null | undefined) => {
    if (!dueDateRaw) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(dueDateRaw)
    dueDate.setHours(0, 0, 0, 0)
    const days = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000)
    return days
  }

  const daysUntilDue = getDaysUntilDue(task.due_date)
  const isDueSoon = daysUntilDue !== null && daysUntilDue <= 3 && daysUntilDue >= 0
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {backTo.startsWith('/app/projects/') ? 'Project Details' : 'Tasks'}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-bold text-slate-900 break-words">{task.title}</h1>
            </div>
          </div>

          {/* Description */}
          <div className="mt-6 lg:max-w-[calc(100%-312px)]">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Description</label>
            {!isLocked ? (
              <textarea
                value={task.description ?? ''}
                onChange={(event) => void updateTaskDescriptionHandler(task.id, event.target.value)}
                placeholder="Add description..."
                className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-3 text-base leading-6 text-slate-900 outline-none shadow-sm transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-200"
                rows={5}
              />
            ) : (
              <p className="text-base leading-6 text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg border border-slate-200 p-4">{task.description || 'No description'}</p>
            )}
          </div>

          {/* Badges row */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {isAssignee && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 6a5 5 0 0 1 10 0H3Z" />
                </svg>
                Assigned to you
              </span>
            )}
            {isLocked && (
              <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                🔒 View only
              </span>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Details Section */}
            <section className="rounded-lg border border-slate-200 bg-white p-6">
              {/* Quick Settings - Status and Priority */}
              <div className="mb-6 grid gap-4 sm:grid-cols-2">
                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Status</label>
                  {!isLocked ? (
                    <select
                      value={task.status ?? 'todo'}
                      onChange={(event) => void updateTaskStatusHandler(task.id, event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                    >
                      <option value="backlog">Backlog</option>
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </select>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-sm text-slate-700 font-medium">{getStatusLabel(task.status)}</p>
                    </div>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Priority</label>
                  {!isLocked ? (
                    <select
                      value={task.priority ?? 'medium'}
                      onChange={(event) => void updateTaskPriorityHandler(task.id, event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-sm text-slate-700 font-medium capitalize">{task.priority ?? 'medium'}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="mb-6 border-t border-slate-200"></div>

              {/* Details - Other fields */}
              <div className="space-y-4">
                {/* Due Date */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Due date</label>
                  {!isLocked ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="date"
                        value={dueDateInputValue}
                        min={projectStartDate || undefined}
                        max={projectEndDate || undefined}
                        onChange={(event) => void updateTaskDueDateHandler(task.id, event.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                      />
                      {task.due_date && daysUntilDue !== null && (
                        <p className={`text-xs px-3 py-1.5 rounded-md inline-flex w-fit ${isOverdue ? 'bg-rose-50 text-rose-700 font-medium' : isDueSoon ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {isOverdue
                            ? `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'} overdue`
                            : `${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'} remaining`}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-sm text-slate-700 font-medium">{dueDate}</p>
                      {daysUntilDue !== null && (
                        <p className={`text-xs mt-2 ${isOverdue ? 'text-rose-600 font-medium' : isDueSoon ? 'text-amber-600' : 'text-slate-500'}`}>
                          {isOverdue
                            ? `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'} overdue`
                            : `${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'} remaining`}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Assignee */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Assignee</label>
                  {!isLocked && canAssignAssignee && assigneeOptions ? (
                    <select
                      value={task.assigned_to ?? ''}
                      onChange={(event) => void assignTaskHandler(task.id, event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                    >
                      <option value="">Unassigned</option>
                      {assigneeOptions.map((option) => (
                        <option key={option.userId} value={option.userId}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      {assigneeUserId ? (
                        <button
                          type="button"
                          onClick={() => openUserProfile(assigneeUserId)}
                          className="text-sm font-medium text-sky-700 hover:text-sky-800"
                        >
                          {assigneeLabel}
                        </button>
                      ) : (
                        <p className="text-sm text-slate-500">Unassigned</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Work Package */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Work package</label>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm text-slate-700 font-medium">{workPackageLabel}</p>
                  </div>
                </div>

                {/* Blocked By */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Blocked by</label>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm text-slate-700 font-medium">{blockedByLabel ?? 'None'}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Time Tracking Section */}
            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-sm font-semibold text-slate-900">Time Tracking</h2>
                {canLogTime && (
                  <button
                    type="button"
                    onClick={() => setLogTimeTask(task)}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    Log time
                  </button>
                )}
              </div>

              {/* Time Cards */}
              <div className="grid gap-3 sm:grid-cols-3 mb-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Estimate</p>
                  {canEditEstimateHours ? (
                    <div className="mt-2">
                      <label htmlFor="task-estimate-hours" className="sr-only">Estimate hours</label>
                      <div className="flex items-center gap-2">
                        <input
                          id="task-estimate-hours"
                          type="number"
                          min={0}
                          step={0.25}
                          inputMode="decimal"
                          value={estimateHoursDraft}
                          onChange={(event) => setEstimateHoursDraft(event.target.value)}
                          onBlur={() => void updateTaskEstimateHoursHandler(task.id, estimateHoursDraft)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.currentTarget.blur()
                            }
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                        />
                        <span className="text-sm text-slate-500">h</span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-2xl font-bold text-slate-900">{estimateHours}<span className="text-sm text-slate-500">h</span></p>
                  )}
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Logged</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{actualHours}<span className="text-sm text-slate-500">h</span></p>
                </div>

                <div className={`rounded-lg border p-4 ${isOverBudget ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${isOverBudget ? 'text-rose-700' : 'text-slate-600'}`}>
                    {isOverBudget ? 'Over budget' : 'Remaining'}
                  </p>
                  <p className={`mt-2 text-2xl font-bold ${isOverBudget ? 'text-rose-700' : 'text-slate-900'}`}>
                    {isOverBudget ? `+${Math.round((actualHours - estimateHours) * 100) / 100}` : remainingHours}
                    <span className="text-sm text-slate-500">h</span>
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              {estimateHours > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
                    <span>Progress</span>
                    <span className="font-semibold">{progressPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className={`h-2 rounded-full transition-all ${isOverBudget ? 'bg-rose-500' : 'bg-sky-500'}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}

              {!canLogTime && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-600">
                    {isAssignee
                      ? '🔒 Time logging is unavailable while this project is read-only.'
                      : '👤 Only the assignee can log time on this task.'}
                  </p>
                </div>
              )}
            </section>

            {/* Comments Section */}
            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="text-sm font-semibold text-slate-900">Collaboration</h2>
                <button
                  type="button"
                  onClick={() => setIsCommentsOpen((prev) => !prev)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1"
                >
                  {isCommentsOpen ? 'Hide' : 'Show'}
                </button>
              </div>

              {isCommentsOpen && task.project_id && (
                <TaskCommentsPanel
                  projectId={task.project_id}
                  taskId={task.id}
                  readOnly={isLocked}
                />
              )}
            </section>

            {/* Delete Section */}
            {canDelete && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="inline-flex items-center rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-100"
                >
                  Delete task
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Access Card */}
            {isLocked && (
              <section className="rounded-lg border border-slate-200 bg-white p-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Access</h3>
                <p className="text-xs text-slate-600 leading-5">
                  You have read-only access. Task details can be modified by the assignee or project managers.
                </p>
              </section>
            )}
          </aside>
        </div>
      </div>

      <UserProfileDialog
        isOpen={Boolean(selectedProfile)}
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        tone="danger"
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={async () => {
          setIsDeleteConfirmOpen(false)
          await removeTask(task.id)
          navigate(backTo)
        }}
      />

      <TaskLogTimeModal
        isOpen={Boolean(logTimeTask)}
        taskTitle={task.title}
        onClose={() => setLogTimeTask(null)}
        onSubmit={submitTaskLogTime}
        isSubmitting={isLoading}
      />
    </div>
  )
}
