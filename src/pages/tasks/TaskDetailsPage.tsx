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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] py-6 px-4">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="mb-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            {backTo.startsWith('/app/projects/') ? '← Back to Project Details' : '← Back to Tasks'}
          </button>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Task overview</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900 break-words">{task.title}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{task.description || 'No description provided yet.'}</p>
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
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getDueToneClass(task.due_date)}`}>
                Due: {dueDate}
              </span>
              {isAssignee ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-5 6a5 5 0 0 1 10 0H3Z" />
                  </svg>
                  Assigned to you
                </span>
              ) : null}
              {isLocked ? (
                <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  View mode
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
          <section className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Execution details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="task-due-date" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Due date
                  </label>
                  {!isLocked ? (
                    <input
                      id="task-due-date"
                      type="date"
                      value={dueDateInputValue}
                      min={projectStartDate || undefined}
                      max={projectEndDate || undefined}
                      onChange={(event) => void updateTaskDueDateHandler(task.id, event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                    />
                  ) : (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{dueDate}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="task-assignee" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Assignee
                  </label>
                  {!isLocked && canAssignAssignee && assigneeOptions ? (
                    <select
                      id="task-assignee"
                      value={task.assigned_to ?? ''}
                      onChange={(event) => void assignTaskHandler(task.id, event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                    >
                      <option value="">Unassigned</option>
                      {assigneeOptions.map((option) => (
                        <option key={option.userId} value={option.userId}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {assigneeUserId ? (
                        <button
                          type="button"
                          onClick={() => openUserProfile(assigneeUserId)}
                          className="font-medium text-sky-700 underline-offset-2 hover:underline"
                        >
                          {assigneeLabel}
                        </button>
                      ) : (
                        assigneeLabel
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Context</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Work package</p>
                  <p className="mt-1 text-sm text-slate-800">{workPackageLabel}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Blocked by</p>
                  <p className="mt-1 text-sm text-slate-800">{blockedByLabel ?? 'No blocker'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Time tracking</h2>
                {canLogTime ? (
                  <button
                    type="button"
                    onClick={() => setLogTimeTask(task)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    Log time
                  </button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estimate</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{estimateHours}h</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Logged</p>
                  <p className="mt-1 text-xl font-semibold text-slate-900">{actualHours}h</p>
                </div>

                <div className={`rounded-xl border p-3 ${isOverBudget ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isOverBudget ? 'Over budget' : 'Remaining'}
                  </p>
                  <p className={`mt-1 text-xl font-semibold ${isOverBudget ? 'text-rose-700' : 'text-slate-900'}`}>
                    {isOverBudget ? `+${Math.round((actualHours - estimateHours) * 100) / 100}h` : `${remainingHours}h`}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                  <span>Progress against estimate</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full transition-all ${isOverBudget ? 'bg-rose-500' : 'bg-sky-500'}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {!canLogTime ? (
                <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  {isAssignee
                    ? 'Time logging is unavailable while this project is read-only.'
                    : 'Only the assignee can log time on this task.'}
                </p>
              ) : null}
            </div>
          </section>

          <aside className="space-y-5">
            {canDelete ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Actions</h2>
                <p className="mt-2 text-xs text-slate-500">Manage this task.</p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="inline-flex rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Delete task
                  </button>
                </div>
              </section>
            ) : null}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Collaboration</h2>
                <button
                  type="button"
                  onClick={() => setIsCommentsOpen((prev) => !prev)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {isCommentsOpen ? 'Hide comments' : 'Show comments'}
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-500">Use comments for updates, blockers, and handoffs.</p>

              {isCommentsOpen && task.project_id ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <TaskCommentsPanel
                    projectId={task.project_id}
                    taskId={task.id}
                    readOnly={isLocked}
                  />
                </div>
              ) : null}
            </section>

            {isLocked ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Access</h2>
                <p className="mt-2 text-sm text-slate-600">
                  You have view-only access. Task fields can be changed by the assignee or by
                  managers, admins, and owners.
                </p>
              </section>
            ) : null}
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
