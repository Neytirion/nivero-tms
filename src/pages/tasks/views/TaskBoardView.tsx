import { KANBAN_COLUMNS, type TaskStatus } from '../../../features/tasks/constants.ts'
import { KanbanColumn } from '../../../features/tasks/components'
import type { TaskPreview } from '../../../lib/pm'
import { normalizeTaskStatus, sortTasksForBoardColumn } from '../tasks-page.utils'

interface TaskBoardViewProps {
  tasks: TaskPreview[]
  assigneeLabelByUserId: Record<string, string>
  assigneeAvatarUrlByUserId: Record<string, string>
  onOpenUserProfile: (userId: string) => void
  dragTaskId: string | null
  onDragTaskIdChange: (taskId: string | null) => void
  onMoveTaskToStatus: (taskId: string, status: TaskStatus) => void
  onTaskClick?: (taskId: string) => void
  canManageTask: (task: TaskPreview) => boolean
  canTakeUnassignedTasks: boolean
  currentUserId: string | null
  onTakeTask: (taskId: string) => void
}

export function TaskBoardView({
  tasks,
  assigneeLabelByUserId,
  assigneeAvatarUrlByUserId,
  onOpenUserProfile,
  dragTaskId,
  onDragTaskIdChange,
  onMoveTaskToStatus,
  onTaskClick,
  canManageTask,
  canTakeUnassignedTasks,
  currentUserId,
  onTakeTask,
}: TaskBoardViewProps) {
  const sharedQueueTasks = tasks.filter((task) => !task.assigned_to)
  const assignedTasks = tasks.filter((task) => Boolean(task.assigned_to))

  return (
    <>
      {sharedQueueTasks.length > 0 ? (
        <section className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50/60 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-cyan-900">Shared Queue ({sharedQueueTasks.length})</h4>
            <p className="text-xs text-cyan-700">Unassigned tasks anyone can take</p>
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {sharedQueueTasks.map((task) => (
              <div key={task.id} className="rounded-lg border border-cyan-200 bg-white px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onTaskClick?.(task.id)}
                    className="truncate text-left text-sm font-semibold text-slate-800 hover:text-cyan-800"
                  >
                    {task.title}
                  </button>
                  {canTakeUnassignedTasks && currentUserId ? (
                    <button
                      type="button"
                      onClick={() => onTakeTask(task.id)}
                      className="shrink-0 rounded-md border border-cyan-300 bg-cyan-100 px-2 py-0.5 text-[11px] font-semibold text-cyan-900 hover:bg-cyan-200"
                    >
                      Take
                    </button>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-slate-500">{task.status ?? 'todo'} • {(task.priority ?? 'medium')}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-5">
        {KANBAN_COLUMNS.map((column) => {
          const columnTasks = sortTasksForBoardColumn(
            assignedTasks.filter((task) => normalizeTaskStatus(task.status) === column.key),
            canManageTask,
          )

          return (
            <KanbanColumn
              key={column.key}
              status={column.key}
              label={column.label}
              tasks={columnTasks}
              assigneeLabelByUserId={assigneeLabelByUserId}
              assigneeAvatarUrlByUserId={assigneeAvatarUrlByUserId}
              onOpenUserProfile={onOpenUserProfile}
              onDragOver={(event) => event.preventDefault()}
              onDropTask={(status) => {
                if (dragTaskId) {
                  onMoveTaskToStatus(dragTaskId, status)
                }
                onDragTaskIdChange(null)
              }}
              onDragTaskStart={onDragTaskIdChange}
              onTaskClick={onTaskClick}
              canManageTask={canManageTask}
            />
          )
        })}
      </div>
    </>
  )
}
