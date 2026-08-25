import { KANBAN_COLUMNS, type TaskStatus } from '../../../features/tasks/constants.ts'
import { KanbanColumn } from '../../../features/tasks/components'
import type { ProjectTaskCardFieldPreferences, TaskPreview } from '../../../lib/pm'
import { normalizeTaskStatus, sortTasksForBoardColumn } from '../utils/tasks-page.utils'

interface TaskBoardViewProps {
  tasks: TaskPreview[]
  assigneeLabelByUserId: Record<string, string>
  assigneeAvatarUrlByUserId: Record<string, string>
  workPackageLabelById: Record<string, string>
  workPackageColorById: Record<string, string>
  onOpenUserProfile: (userId: string) => void
  dragTaskId: string | null
  onDragTaskIdChange: (taskId: string | null) => void
  onMoveTaskToStatus: (taskId: string, status: TaskStatus) => void
  onTaskClick?: (taskId: string) => void
  canManageTask: (task: TaskPreview) => boolean
  taskCardFieldPreferences?: ProjectTaskCardFieldPreferences
}

export function TaskBoardView({
  tasks,
  assigneeLabelByUserId,
  assigneeAvatarUrlByUserId,
  workPackageLabelById,
  workPackageColorById,
  onOpenUserProfile,
  dragTaskId,
  onDragTaskIdChange,
  onMoveTaskToStatus,
  onTaskClick,
  canManageTask,
  taskCardFieldPreferences,
}: TaskBoardViewProps) {
  return (
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
              workPackageLabelById={workPackageLabelById}
              workPackageColorById={workPackageColorById}
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
              taskCardFieldPreferences={taskCardFieldPreferences}
            />
          )
        })}
    </div>
  )
}
