import type { TaskPreview } from '../../../../lib/pm'

interface TaskCardProps {
  task: TaskPreview
  assigneeUserId?: string | null
  assigneeLabel: string
  onTaskClick?: (taskId: string) => void
  onOpenUserProfile?: (userId: string) => void
  isLocked: boolean
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

export function TaskCard({
  task,
  assigneeUserId,
  assigneeLabel,
  onTaskClick,
  onOpenUserProfile,
  isLocked,
}: TaskCardProps) {
  const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'

  return (
    <article
      onClick={() => onTaskClick?.(task.id)}
      className={`rounded-2xl border-2 p-3 shadow-sm transition ${onTaskClick ? 'cursor-pointer' : ''} ${
        isLocked
          ? 'border-amber-200 bg-amber-50/80 text-slate-500'
          : 'border-slate-200 bg-white hover:border-cyan-300 hover:shadow-md'
      }`}
    >
      <p className="line-clamp-2 w-full text-left text-sm font-semibold text-slate-900">
        {task.title}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          data-priority={task.priority ?? 'medium'}
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getPriorityBadgeClass(
            task.priority,
          )}`}
        >
          {task.priority ?? 'medium'}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
          {dueDate}
        </span>
        {isLocked ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">Locked</span>
        ) : null}
      </div>
      <p className="mt-2 truncate text-xs text-slate-600">
        {task.assigned_to ? 'Assigned to ' : 'Owner: '}
        {assigneeUserId && onOpenUserProfile ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpenUserProfile(assigneeUserId)
            }}
            className="font-medium text-cyan-700 underline-offset-2 hover:underline"
          >
            {assigneeLabel}
          </button>
        ) : (
          assigneeLabel
        )}
      </p>
      <p className="mt-2 text-[11px] text-slate-400">Open card for full details</p>
    </article>
  )
}
