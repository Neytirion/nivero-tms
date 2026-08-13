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
  } = useTasksPageController()

  const task = tasks.find((t) => t.id === taskId)

  useEffect(() => {
    if (!task && taskId) {
      navigate(backTo, { replace: true })
    }
  }, [task, taskId, navigate, backTo])

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
      return 'bg-rose-50 text-rose-700 border border-rose-100'
    }

    if (normalized === 'low') {
      return 'bg-emerald-50 text-emerald-700 border border-emerald-100'
    }

    return 'bg-amber-50 text-amber-700 border border-amber-100'
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
      return 'bg-indigo-100 text-indigo-800 border border-indigo-200'
    }

    return 'bg-slate-100 text-slate-800 border border-slate-200'
  }

  function getStatusLabel(status: string | null | undefined) {
    const value = (status ?? 'todo').replaceAll('_', ' ')
    return value.charAt(0).toUpperCase() + value.slice(1)
  }

  function getDueToneClass(dueDateRaw: string | null | undefined) {
    if (!dueDateRaw) {
      return 'bg-slate-100 text-slate-600 border border-slate-200'
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dueDate = new Date(dueDateRaw)
    dueDate.setHours(0, 0, 0, 0)

    const dayDiff = Math.floor((dueDate.getTime() - today.getTime()) / 86400000)

    if (dayDiff < 0) {
      return 'bg-rose-50 text-rose-700 border border-rose-100'
    }

    if (dayDiff <= 2) {
      return 'bg-amber-50 text-amber-700 border border-amber-100'
    }

    return 'bg-emerald-50 text-emerald-700 border border-emerald-100'
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
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
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusBadgeClass(
                  task.status,
                )}`}
              >
                {getStatusLabel(task.status)}
              </span>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getPriorityBadgeClass(
                  task.priority,
                )}`}
              >
                {task.priority ?? 'medium'} priority
              </span>
            </div>
          </div>

          {task.description && (
            <p className="max-w-3xl text-sm leading-6 text-slate-600">{task.description}</p>
          )}

          {/* Badges row */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getDueToneClass(task.due_date)}`}>
              📅 {dueDate}
            </span>
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
              <h2 className="mb-4 text-sm font-semibold text-slate-900">Task Details</h2>

              <div className="grid gap-6 sm:grid-cols-2">
                {/* Due Date */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">Due date</label>
                  {!isLocked ? (
                    <input
                      type="date"
                      value={dueDateInputValue}
                      min={projectStartDate || undefined}
                      max={projectEndDate || undefined}
                      onChange={(event) => void updateTaskDueDateHandler(task.id, event.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                    />
                  ) : (
                    <p className="mt-2 text-sm text-slate-700 font-medium">{dueDate}</p>
                  )}
                </div>

                {/* Assignee */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">Assignee</label>
                  {!isLocked && canAssignAssignee && assigneeOptions ? (
                    <select
                      value={task.assigned_to ?? ''}
                      onChange={(event) => void assignTaskHandler(task.id, event.target.value)}
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                    >
                      <option value="">Unassigned</option>
                      {assigneeOptions.map((option) => (
                        <option key={option.userId} value={option.userId}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="mt-2">
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
                  <p className="block text-xs font-semibold uppercase tracking-wide text-slate-600">Work package</p>
                  <p className="mt-2 text-sm text-slate-700 font-medium">{workPackageLabel}</p>
                </div>

                {/* Blocked By */}
                <div>
                  <p className="block text-xs font-semibold uppercase tracking-wide text-slate-600">Blocked by</p>
                  <p className="mt-2 text-sm text-slate-700 font-medium">{blockedByLabel ?? 'None'}</p>
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
                  <p className="mt-2 text-2xl font-bold text-slate-900">{estimateHours}<span className="text-sm text-slate-500">h</span></p>
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
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Info Card */}
            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="mb-4 text-sm font-semibold text-slate-900">Info</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Status</p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusBadgeClass(
                      task.status,
                    )}`}
                  >
                    {getStatusLabel(task.status)}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Priority</p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getPriorityBadgeClass(
                      task.priority,
                    )}`}
                  >
                    {task.priority ?? 'medium'}
                  </span>
                </div>
              </div>
            </section>

            {/* Actions Card */}
            {canDelete && (
              <section className="rounded-lg border border-slate-200 bg-white p-6">
                <h3 className="mb-4 text-sm font-semibold text-slate-900">Actions</h3>
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="w-full rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  Delete task
                </button>
              </section>
            )}

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
