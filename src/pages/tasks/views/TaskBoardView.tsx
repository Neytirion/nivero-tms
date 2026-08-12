import { KANBAN_COLUMNS, type TaskStatus } from '../../../features/tasks/constants.ts'
import { KanbanColumn } from '../../../features/tasks/components'
import type { TaskPreview } from '../../../lib/pm'
import { normalizeTaskStatus } from '../tasks-page.utils'

interface TaskBoardViewProps {
  tasks: TaskPreview[]
  assigneeLabelByUserId: Record<string, string>
  onOpenUserProfile: (userId: string) => void
  dragTaskId: string | null
  onDragTaskIdChange: (taskId: string | null) => void
  onMoveTaskToStatus: (taskId: string, status: TaskStatus) => void
  onTaskClick?: (taskId: string) => void
  canManageTask: (task: TaskPreview) => boolean
}

export function TaskBoardView({
  tasks,
  assigneeLabelByUserId,
  onOpenUserProfile,
  dragTaskId,
  onDragTaskIdChange,
  onMoveTaskToStatus,
  onTaskClick,
  canManageTask,
}: TaskBoardViewProps) {
  return (
    <>
      <p className="mb-3 text-xs text-slate-500">Drag card to change task status</p>
      <div className="grid gap-4 xl:grid-cols-5">
        {KANBAN_COLUMNS.map((column) => {
          const columnTasks = tasks.filter((task) => normalizeTaskStatus(task.status) === column.key)

          return (
            <KanbanColumn
              key={column.key}
              status={column.key}
              label={column.label}
              tasks={columnTasks}
              assigneeLabelByUserId={assigneeLabelByUserId}
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
