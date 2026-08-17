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
}: TaskBoardViewProps) {
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-5">
        {KANBAN_COLUMNS.map((column) => {
          const columnTasks = sortTasksForBoardColumn(
            tasks.filter((task) => normalizeTaskStatus(task.status) === column.key),
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
