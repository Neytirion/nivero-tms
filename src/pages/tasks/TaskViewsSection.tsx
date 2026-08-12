import type { TaskStatus } from '../../features/tasks/constants.ts'
import type { TaskPreview } from '../../lib/pm'
import { TaskBoardView } from './views/TaskBoardView'
import { TaskListView } from './views/TaskListView'

export type TaskViewMode = 'list' | 'board'

type TaskViewsSectionProps = {
  taskViewMode: TaskViewMode
  onTaskViewModeChange: (mode: TaskViewMode) => void
  tasks: TaskPreview[]
  assigneeLabelByUserId: Record<string, string>
  workPackageLabelById: Record<string, string>
  dependencyLabelByTaskId: Record<string, string>
  onOpenUserProfile: (userId: string) => void
  dragTaskId: string | null
  onDragTaskIdChange: (taskId: string | null) => void
  onMoveTaskToStatus: (taskId: string, status: TaskStatus) => void
  onTaskClick?: (taskId: string) => void
  canManageTask: (task: TaskPreview) => boolean
}

export function TaskViewsSection({
  taskViewMode,
  onTaskViewModeChange,
  tasks,
  assigneeLabelByUserId,
  workPackageLabelById,
  dependencyLabelByTaskId,
  onOpenUserProfile,
  dragTaskId,
  onDragTaskIdChange,
  onMoveTaskToStatus,
  onTaskClick,
  canManageTask,
}: TaskViewsSectionProps) {
  return (
    <section className="page-section border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="section-title text-slate-900">Task Views</h3>
          {taskViewMode === 'board' ? (
            <p className="text-[11px] text-slate-500">Order: editable first, then priority, then nearest due date.</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {([
            { key: 'list', label: 'List' },
            { key: 'board', label: 'Board' },
          ] as const).map((view) => (
            <button
              key={view.key}
              type="button"
              onClick={() => onTaskViewModeChange(view.key)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                taskViewMode === view.key
                  ? 'border-sky-300 bg-sky-100 text-sky-900 shadow-sm'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {taskViewMode === 'board' ? (
        <TaskBoardView
          tasks={tasks}
          assigneeLabelByUserId={assigneeLabelByUserId}
          onOpenUserProfile={onOpenUserProfile}
          dragTaskId={dragTaskId}
          onDragTaskIdChange={onDragTaskIdChange}
          onMoveTaskToStatus={onMoveTaskToStatus}
          onTaskClick={onTaskClick}
          canManageTask={canManageTask}
        />
      ) : null}

      {taskViewMode === 'list' ? (
        <TaskListView
          tasks={tasks}
          assigneeLabelByUserId={assigneeLabelByUserId}
          workPackageLabelById={workPackageLabelById}
          dependencyLabelByTaskId={dependencyLabelByTaskId}
          onOpenUserProfile={onOpenUserProfile}
          onTaskClick={onTaskClick}
        />
      ) : null}
    </section>
  )
}
