import type { TaskPreview } from '../../../../lib/pm'

interface TaskCardProps {
  task: TaskPreview
  workPackageLabel?: string | null
  workPackageColor?: string | null
  assigneeUserId?: string | null
  assigneeLabel: string
  assigneeAvatarUrl?: string | null
  onTaskClick?: (taskId: string) => void
  onOpenUserProfile?: (userId: string) => void
  isLocked: boolean
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

function getDueDateMeta(dueDateRaw: string | null | undefined) {
  if (!dueDateRaw) {
    return {
      label: 'No due date',
      toneClass: 'bg-slate-100 text-slate-600 border border-slate-200',
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dueDate = new Date(dueDateRaw)
  dueDate.setHours(0, 0, 0, 0)

  const dayDiff = Math.floor((dueDate.getTime() - today.getTime()) / 86400000)

  if (dayDiff < 0) {
    return {
      label: 'Overdue',
      toneClass: 'bg-cyan-100 text-cyan-900 border border-cyan-300',
    }
  }

  if (dayDiff === 0) {
    return {
      label: 'Today',
      toneClass: 'bg-sky-100 text-sky-900 border border-sky-300',
    }
  }

  if (dayDiff <= 3) {
    return {
      label: 'Soon',
      toneClass: 'bg-sky-50 text-sky-800 border border-sky-200',
    }
  }

  return {
    label: 'Planned',
    toneClass: 'bg-slate-100 text-slate-700 border border-slate-200',
  }
}

export function TaskCard({
  task,
  workPackageLabel,
  workPackageColor,
  assigneeUserId,
  assigneeLabel,
  assigneeAvatarUrl,
  onTaskClick,
  onOpenUserProfile,
  isLocked,
}: TaskCardProps) {
  const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'
  const dueMeta = getDueDateMeta(task.due_date)
  const titleInitials = assigneeLabel
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U'
  const cardToneClass = isLocked
    ? 'border-2 border-dashed border-slate-400 bg-slate-200/80 text-slate-600 opacity-90 hover:border-slate-500 hover:bg-slate-100 hover:shadow-sm'
    : 'border border-l-4 border-sky-200 border-l-sky-400 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-sm hover:border-sky-400 hover:border-l-sky-500 hover:shadow-md'
  const cardStyle = !isLocked && workPackageColor
    ? {
        borderLeftColor: workPackageColor,
        borderLeftWidth: '6px',
        boxShadow: `inset 0 0 0 1px ${workPackageColor}33`,
      }
    : undefined

  return (
    <article
      onClick={() => onTaskClick?.(task.id)}
      className={`group relative rounded-2xl p-3.5 transition ${onTaskClick ? 'cursor-pointer' : ''} ${cardToneClass}`}
      style={cardStyle}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`line-clamp-2 w-full text-left text-sm font-semibold leading-5 ${isLocked ? 'text-slate-700' : 'text-slate-900'}`}>
          {task.title}
        </p>
        <span className={`text-xs transition ${isLocked ? 'text-slate-400 group-hover:text-slate-600' : 'text-slate-300 group-hover:text-sky-600'}`}>↗</span>
      </div>

      {workPackageLabel && workPackageColor ? (
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: workPackageColor }}
            aria-hidden="true"
          />
          <span
            className="inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              borderColor: `${workPackageColor}66`,
              backgroundColor: `${workPackageColor}1f`,
              color: '#0f172a',
            }}
          >
            <span className="truncate">{workPackageLabel}</span>
          </span>
        </div>
      ) : null}

      {task.description ? (
        <p className={`mt-1.5 line-clamp-2 text-xs leading-5 ${isLocked ? 'text-slate-500' : 'text-slate-500'}`}>{task.description}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span
          data-priority={task.priority ?? 'medium'}
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getPriorityBadgeClass(
            task.priority,
          )}`}
        >
          {task.priority ?? 'medium'}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${dueMeta.toneClass}`}>
          {dueMeta.label}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
          {dueDate}
        </span>
      </div>

      <div className={`mt-3 flex items-center justify-between border-t pt-2.5 ${isLocked ? 'border-slate-300' : 'border-slate-200/70'}`}>
        <div className="min-w-0 flex items-center gap-2">
          {assigneeAvatarUrl ? (
            <img
              src={assigneeAvatarUrl}
              alt={assigneeLabel}
              className="h-6 w-6 shrink-0 rounded-full border border-slate-200 object-cover"
            />
          ) : (
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
              isLocked ? 'bg-slate-300 text-slate-700' : 'bg-sky-100 text-sky-800'
            }`}>
              {titleInitials}
            </span>
          )}
          <p className={`truncate text-xs ${isLocked ? 'text-slate-600' : 'text-slate-600'}`}>
            {assigneeUserId && onOpenUserProfile ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenUserProfile(assigneeUserId)
                }}
                className={`truncate font-medium underline-offset-2 hover:underline ${isLocked ? 'text-slate-700' : 'text-sky-700'}`}
              >
                {assigneeLabel}
              </button>
            ) : (
              assigneeLabel
            )}
          </p>
        </div>
      </div>
    </article>
  )
}
