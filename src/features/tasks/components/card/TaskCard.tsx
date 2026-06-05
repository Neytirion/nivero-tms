import type { TaskPreview } from '../../../../lib/pm'
import { useEffect, useState } from 'react'
import { getTaskCommentsCount } from '../../../../lib/pm'
import { TaskCommentsPanel } from '../comments'

interface TaskCardProps {
  task: TaskPreview
  assigneeLabel: string
  blockedByLabel?: string
  assigneeOptions?: Array<{
    userId: string
    label: string
  }>
  canAssignAssignee?: boolean
  onAssignTask?: (taskId: string, userId: string) => void | Promise<void>
  onDelete: (taskId: string) => void | Promise<void>
  onLogTime: (task: TaskPreview) => void
  isLocked: boolean
  canDelete: boolean
}

export function TaskCard({
  task,
  assigneeLabel,
  blockedByLabel,
  assigneeOptions,
  canAssignAssignee,
  onAssignTask,
  onDelete,
  onLogTime,
  isLocked,
  canDelete,
}: TaskCardProps) {
  const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'
  const [isCommentsOpen, setIsCommentsOpen] = useState(false)
  const [commentsCount, setCommentsCount] = useState(0)

  useEffect(() => {
    const loadCommentsCount = async () => {
      try {
        const count = await getTaskCommentsCount(task.id)
        setCommentsCount(count)
      } catch {
        setCommentsCount(0)
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCommentsCount()
  }, [task.id])

  return (
    <article
      className={`rounded-xl border p-3 shadow-sm ${
        isLocked
          ? 'border-amber-200 bg-amber-50/80 text-slate-500'
          : 'border-slate-200 bg-white transition-colors hover:border-cyan-200'
      }`}
    >
      <p className="text-sm font-semibold text-slate-900">{task.title}</p>
      <p className="mt-1 text-xs text-slate-500">{task.description || 'No description'}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
          Priority: {task.priority ?? 'medium'}
        </span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
          Due: {dueDate}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">Assignee: {assigneeLabel}</p>
      {blockedByLabel ? <p className="mt-1 text-xs text-slate-500">Blocked by: {blockedByLabel}</p> : null}
      <p className="mt-1 text-xs text-slate-500">
        Estimate: {task.estimate_hours ?? 0}h | Actual: {task.actual_hours ?? 0}h
      </p>

      {!isLocked && canAssignAssignee && assigneeOptions && onAssignTask ? (
        <div className="mt-2">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Assignee
          </label>
          <select
            value={task.assigned_to ?? ''}
            onChange={(event) => void onAssignTask(task.id, event.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800 outline-none focus:border-slate-500"
          >
            <option value="">Unassigned</option>
            {assigneeOptions.map((option) => (
              <option key={option.userId} value={option.userId}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {!isLocked ? (
        <div className="mt-2 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => onLogTime(task)}
            className="rounded-md bg-cyan-100 px-2 py-1 text-xs font-medium text-cyan-800 hover:bg-cyan-200"
          >
            Log time
          </button>
          {canDelete ? (
            <button
              type="button"
              onClick={() => void onDelete(task.id)}
              className="rounded-md bg-rose-100 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-200"
            >
              Delete
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setIsCommentsOpen((prev) => !prev)}
          className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
        >
          {isCommentsOpen ? 'Hide comments' : `Comments (${commentsCount})`}
        </button>
      </div>

      {isCommentsOpen && task.project_id ? (
        <TaskCommentsPanel
          projectId={task.project_id}
          taskId={task.id}
          readOnly={isLocked}
          onCommentsCountChange={setCommentsCount}
        />
      ) : null}
    </article>
  )
}
