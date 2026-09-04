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

  const statusClass = status === 'done'
    ? 'bg-emerald-100 text-emerald-800'
    : status === 'in_progress'
      ? 'bg-sky-100 text-sky-800'
      : 'bg-slate-100 text-slate-700'
  const priorityClass = priority === 'high' ? 'bg-rose-100 text-rose-800' : priority === 'low' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-800'

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">Details</h2>
      </div>

      <div className="divide-y divide-slate-100">
        <div className="flex items-center justify-between gap-3 py-3 first:pt-0">
          <label className="text-sm text-slate-500">Status</label>
          {isTaskEditing ? (
            <select
              value={taskStatusDraft}
              onChange={(event) => setTaskStatusDraft(event.target.value)}
              className="max-w-[155px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-right text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
            >
              <option value="backlog">Backlog</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
          ) : (
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}>{getStatusLabel(status)}</span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 py-3">
          <label className="text-sm text-slate-500">Priority</label>
          {isTaskEditing ? (
            <select
              value={taskPriorityDraft}
              onChange={(event) => setTaskPriorityDraft(event.target.value)}
              className="max-w-[155px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-right text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          ) : (
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${priorityClass}`}>{priority ?? 'medium'}</span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 py-3">
          <label className="text-sm text-slate-500">Billing</label>
          <span className="text-sm font-medium text-slate-800">{isBillable ? 'Billable' : 'Non-billable'}</span>
        </div>

        <div className="flex items-start justify-between gap-3 border-t border-slate-100 py-3">
          <label className="pt-1 text-sm text-slate-500">Due date</label>
          {isTaskEditing ? (
            <div className="flex min-w-0 flex-col items-end gap-2">
              <input
                type="date"
                value={taskDueDateDraft}
                min={projectStartDate || undefined}
                max={projectEndDate || undefined}
                onChange={(event) => setTaskDueDateDraft(event.target.value)}
                className="w-full max-w-[155px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
              />
              {daysUntilDue !== null && dueLabel ? (
                <p className={`text-xs px-3 py-1.5 rounded-md inline-flex w-fit ${dueBadgeClass}`}>
                  {dueLabel}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800">{dueDate}</p>
              {daysUntilDue !== null && dueLabel ? (
                <p className={`text-xs mt-2 ${isOverdue ? 'text-rose-600 font-medium' : isDueSoon ? 'text-amber-600' : 'text-slate-500'}`}>
                  {dueLabel}
                </p>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 py-3">
          <label className="text-sm text-slate-500">Assignee</label>
          <div className="min-w-0 text-right">
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
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 py-3">
            <label className="text-sm text-slate-500">Work package</label>
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-medium text-slate-800">
                {workPackageLabel ?? (isWorkPackagesLoading ? 'Loading work package...' : 'Not linked')}
              </p>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 py-3 last:pb-0">
          <label className="text-sm text-slate-500">Blocked by</label>
          <p className="text-right text-sm font-medium text-slate-800">{blockedByLabel ?? 'None'}</p>
        </div>
      </div>
    </section>
  )
}
