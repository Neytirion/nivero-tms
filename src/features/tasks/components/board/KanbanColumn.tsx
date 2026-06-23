import type { TaskPreview } from '../../../../lib/pm'
import type { DragEvent } from 'react'
import type { TaskStatus } from '../../constants'
import { TaskCard } from '../card'

interface KanbanColumnProps {
  status: TaskStatus
  label: string
  tasks: TaskPreview[]
  assigneeLabelByUserId: Record<string, string>
  workPackageLabelById?: Record<string, string>
  dependencyLabelByTaskId?: Record<string, string>
  assigneeOptions?: Array<{
    userId: string
    label: string
  }>
  canAssignAssignee?: boolean
  onDropTask: (status: TaskStatus) => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onAssignTask?: (taskId: string, userId: string) => void | Promise<void>
  onUpdateTaskDueDate?: (taskId: string, dueDate: string) => void | Promise<void>
  onDeleteTask: (taskId: string) => void | Promise<void>
  onDragTaskStart: (taskId: string) => void
  onLogTime: (task: TaskPreview) => void
  canManageTask: (task: TaskPreview) => boolean
  canDeleteTask: (task: TaskPreview) => boolean
  projectStartDate?: string
  projectEndDate?: string
}

export function KanbanColumn({
  status,
  label,
  tasks,
  assigneeLabelByUserId,
  workPackageLabelById,
  dependencyLabelByTaskId,
  assigneeOptions,
  canAssignAssignee,
  onDropTask,
  onDragOver,
  onAssignTask,
  onUpdateTaskDueDate,
  onDeleteTask,
  onDragTaskStart,
  onLogTime,
  canManageTask,
  canDeleteTask,
  projectStartDate,
  projectEndDate,
}: KanbanColumnProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={() => onDropTask(status)}
      className="rounded-xl border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] p-3"
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
              assigneeLabel={
                task.assigned_to
                  ? assigneeLabelByUserId[task.assigned_to] ?? task.assigned_to
                  : task.created_by
                    ? `${assigneeLabelByUserId[task.created_by] ?? task.created_by} (creator)`
                    : 'Unassigned'
              }
              blockedByLabel={
                task.blocked_by_task_id
                  ? dependencyLabelByTaskId?.[task.blocked_by_task_id] ?? task.blocked_by_task_id
                  : 'None'
              }
              workPackageLabel={
                task.work_package_id
                  ? workPackageLabelById?.[task.work_package_id] ?? task.work_package_id
                  : 'Not linked'
              }
              assigneeOptions={assigneeOptions ?? []}
              canAssignAssignee={Boolean(canAssignAssignee)}
              onAssignTask={onAssignTask ?? (() => undefined)}
              onUpdateDueDate={onUpdateTaskDueDate ?? (() => undefined)}
              onDelete={onDeleteTask}
              onLogTime={onLogTime}
              isLocked={!canManageTask(task)}
              canDelete={canDeleteTask(task)}
              projectStartDate={projectStartDate}
              projectEndDate={projectEndDate}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
