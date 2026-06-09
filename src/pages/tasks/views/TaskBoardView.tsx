import { KANBAN_COLUMNS, type TaskStatus } from '../../../features/tasks/constants.ts'
import { KanbanColumn } from '../../../features/tasks/components'
import type { TaskPreview } from '../../../lib/pm'
import { normalizeTaskStatus } from '../../tasks-page.utils'
import type { AssigneeOption } from './task-view-types'

interface TaskBoardViewProps {
  tasks: TaskPreview[]
  assigneeLabelByUserId: Record<string, string>
  workPackageLabelById: Record<string, string>
  dependencyLabelByTaskId: Record<string, string>
  assigneeOptions: AssigneeOption[]
  canAssignAssignee: boolean
  dragTaskId: string | null
  onDragTaskIdChange: (taskId: string | null) => void
  onMoveTaskToStatus: (taskId: string, status: TaskStatus) => void
  onAssignTask: (taskId: string, userId: string) => void
  onDeleteTask: (taskId: string) => void
  onLogTime: (task: TaskPreview | null) => void
  canManageTask: (task: TaskPreview) => boolean
  canDeleteTask: (task: TaskPreview) => boolean
}

export function TaskBoardView({
  tasks,
  assigneeLabelByUserId,
  workPackageLabelById,
  dependencyLabelByTaskId,
  assigneeOptions,
  canAssignAssignee,
  dragTaskId,
  onDragTaskIdChange,
  onMoveTaskToStatus,
  onAssignTask,
  onDeleteTask,
  onLogTime,
  canManageTask,
  canDeleteTask,
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
              workPackageLabelById={workPackageLabelById}
              dependencyLabelByTaskId={dependencyLabelByTaskId}
              assigneeOptions={assigneeOptions}
              canAssignAssignee={canAssignAssignee}
              onDragOver={(event) => event.preventDefault()}
              onDropTask={(status) => {
                if (dragTaskId) {
                  onMoveTaskToStatus(dragTaskId, status)
                }
                onDragTaskIdChange(null)
              }}
              onAssignTask={onAssignTask}
              onDeleteTask={onDeleteTask}
              onDragTaskStart={onDragTaskIdChange}
              onLogTime={onLogTime}
              canManageTask={canManageTask}
              canDeleteTask={canDeleteTask}
            />
          )
        })}
      </div>
    </>
  )
}
