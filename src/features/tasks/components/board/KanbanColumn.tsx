import type { TaskPreview } from '../../../../lib/pm'
import type { DragEvent } from 'react'
import type { TaskStatus } from '../../constants'
import { TaskCard } from '../card'

interface KanbanColumnProps {
  status: TaskStatus
  label: string
  tasks: TaskPreview[]
  assigneeLabelByUserId: Record<string, string>
  assigneeAvatarUrlByUserId: Record<string, string>
  workPackageColorById: Record<string, string>
  onOpenUserProfile: (userId: string) => void
  onDropTask: (status: TaskStatus) => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDragTaskStart: (taskId: string) => void
  onTaskClick?: (taskId: string) => void
  canManageTask: (task: TaskPreview) => boolean
}

export function KanbanColumn({
  status,
  label,
  tasks,
  assigneeLabelByUserId,
  assigneeAvatarUrlByUserId,
  workPackageColorById,
  onOpenUserProfile,
  onDropTask,
  onDragOver,
  onDragTaskStart,
  onTaskClick,
  canManageTask,
}: KanbanColumnProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={() => onDropTask(status)}
      className="rounded-xl border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] p-3 shadow-sm"
    >
      <h3 className="text-sm font-semibold text-slate-900">
        {label} ({tasks.length})
      </h3>

      <div className="mt-3 space-y-2">
        {tasks.length === 0 ? <p className="text-xs text-slate-500">No tasks</p> : null}

        {tasks.map((task) => (
          <div
            key={task.id}
            draggable={canManageTask(task)}
            onDragStart={() => {
              if (canManageTask(task)) {
                onDragTaskStart(task.id)
              }
            }}
          >
            {/** For member-created unassigned tasks, show creator as effective assignee in UI. */}
            <TaskCard
              task={task}
              workPackageColor={task.work_package_id ? (workPackageColorById[task.work_package_id] ?? null) : null}
              assigneeUserId={task.assigned_to ?? task.created_by}
              assigneeLabel={
                task.assigned_to
                  ? assigneeLabelByUserId[task.assigned_to] ?? task.assigned_to
                  : task.created_by
                    ? `${assigneeLabelByUserId[task.created_by] ?? task.created_by} (creator)`
                    : 'Unassigned'
              }
              assigneeAvatarUrl={
                task.assigned_to
                  ? assigneeAvatarUrlByUserId[task.assigned_to] ?? null
                  : task.created_by
                    ? assigneeAvatarUrlByUserId[task.created_by] ?? null
                    : null
              }
              onTaskClick={onTaskClick}
              onOpenUserProfile={onOpenUserProfile}
              isLocked={!canManageTask(task)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
