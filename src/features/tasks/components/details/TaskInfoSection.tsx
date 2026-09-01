interface TaskInfoSectionProps {
  isBillable: boolean
  status: string | null | undefined
  priority: string | null | undefined
  dueDate: string
  daysUntilDue: number | null
  isDueSoon: boolean
  isOverdue: boolean
  assigneeUserId: string | null
  assigneeLabel: string
  hasWorkPackageLink: boolean
  workPackageLabel: string | null
  isWorkPackagesLoading: boolean
  blockedByLabel: string | undefined
  projectStartDate: string
  projectEndDate: string
  isTaskEditing: boolean
  taskStatusDraft: string
  setTaskStatusDraft: (v: string) => void
  taskPriorityDraft: string
  setTaskPriorityDraft: (v: string) => void
  taskDueDateDraft: string
  setTaskDueDateDraft: (v: string) => void
  onOpenUserProfile: (userId: string) => void
}

function getStatusLabel(status: string | null | undefined) {
  const value = (status ?? 'todo').replaceAll('_', ' ')
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function TaskInfoSection({
  isBillable,
  status,
  priority,
  dueDate,
  daysUntilDue,
  isDueSoon,
  isOverdue,
  assigneeUserId,
  assigneeLabel,
  hasWorkPackageLink,
  workPackageLabel,
  isWorkPackagesLoading,
  blockedByLabel,
  projectStartDate,
  projectEndDate,
  isTaskEditing,
  taskStatusDraft,
  setTaskStatusDraft,
  taskPriorityDraft,
  setTaskPriorityDraft,
  taskDueDateDraft,
  setTaskDueDateDraft,
  onOpenUserProfile,
}: TaskInfoSectionProps) {
  const dueBadgeClass = isOverdue
    ? 'bg-rose-50 text-rose-700 font-medium'
    : isDueSoon
      ? 'bg-amber-50 text-amber-700'
      : 'bg-slate-100 text-slate-600'

  const dueLabel =
    daysUntilDue !== null
      ? isOverdue
        ? `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'} overdue`
        : `${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'} remaining`
      : null

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Quick Settings - Status, Priority, Billing */}
      <div className="mb-6 grid gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Status</label>
          {isTaskEditing ? (
            <select
              value={taskStatusDraft}
              onChange={(event) => setTaskStatusDraft(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
            >
              <option value="backlog">Backlog</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-sm text-slate-700 font-medium">{getStatusLabel(status)}</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Priority</label>
          {isTaskEditing ? (
            <select
              value={taskPriorityDraft}
              onChange={(event) => setTaskPriorityDraft(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-sm text-slate-700 font-medium capitalize">{priority ?? 'medium'}</p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Billing Type</label>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="flex items-center gap-2 text-sm text-slate-700 font-medium">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                {isBillable ? (
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path d="M6 18L18 6M6 6l12 12" />
                )}
              </svg>
              {isBillable ? 'Billable' : 'Non-billable'}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 border-t border-dashed border-slate-200" />

      {/* Details grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Due date</label>
          {isTaskEditing ? (
            <div className="flex flex-col gap-2">
              <input
                type="date"
                value={taskDueDateDraft}
                min={projectStartDate || undefined}
                max={projectEndDate || undefined}
                onChange={(event) => setTaskDueDateDraft(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
              />
              {daysUntilDue !== null && dueLabel ? (
                <p className={`text-xs px-3 py-1.5 rounded-md inline-flex w-fit ${dueBadgeClass}`}>
                  {dueLabel}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-sm text-slate-700 font-medium">{dueDate}</p>
              {daysUntilDue !== null && dueLabel ? (
                <p className={`text-xs mt-2 ${isOverdue ? 'text-rose-600 font-medium' : isDueSoon ? 'text-amber-600' : 'text-slate-500'}`}>
                  {dueLabel}
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Assignee</label>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            {assigneeUserId ? (
              <button
                type="button"
                onClick={() => onOpenUserProfile(assigneeUserId)}
                className="text-sm font-medium text-sky-700 hover:text-sky-800"
              >
                {assigneeLabel}
              </button>
            ) : (
              <p className="text-sm text-slate-500">Unassigned</p>
            )}
          </div>
        </div>

        {hasWorkPackageLink ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Work package</label>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-sm text-slate-700 font-medium">
                {workPackageLabel ?? (isWorkPackagesLoading ? 'Loading work package...' : 'Not linked')}
              </p>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Blocked by</label>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-sm text-slate-700 font-medium">{blockedByLabel ?? 'None'}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
