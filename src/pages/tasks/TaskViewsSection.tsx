import type { TaskStatus } from '../../features/tasks/constants.ts'
import type { TaskPreview } from '../../lib/pm'
import { TaskBoardView } from './views/TaskBoardView'
import { TaskListView } from './views/TaskListView'

export type TaskViewMode = 'list' | 'board'

type TaskViewsSectionProps = {
  taskViewMode: TaskViewMode
  onTaskViewModeChange: (mode: TaskViewMode) => void
  isWorkPackagesLoading: boolean
  tasks: TaskPreview[]
  assigneeLabelByUserId: Record<string, string>
  assigneeAvatarUrlByUserId: Record<string, string>
  workPackageLabelById: Record<string, string>
  workPackageColorById: Record<string, string>
  dependencyLabelByTaskId: Record<string, string>
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

export function TaskViewsSection({
  taskViewMode,
  onTaskViewModeChange,
  isWorkPackagesLoading,
  tasks,
  assigneeLabelByUserId,
  assigneeAvatarUrlByUserId,
  workPackageLabelById,
  workPackageColorById,
  dependencyLabelByTaskId,
  onOpenUserProfile,
  dragTaskId,
  onDragTaskIdChange,
  onMoveTaskToStatus,
  onTaskClick,
  canManageTask,
  canTakeUnassignedTasks,
  currentUserId,
  onTakeTask,
}: TaskViewsSectionProps) {
  const sharedQueueTasks = tasks.filter((task) => !task.assigned_to)
  const assignedTasks = tasks.filter((task) => Boolean(task.assigned_to))

  const formatDueDate = (dueDateRaw: string | null | undefined) => {
    if (!dueDateRaw) {
      return 'No due date'
    }

    return new Date(dueDateRaw).toLocaleDateString()
  }

  const shouldDeferTaskViews = isWorkPackagesLoading && tasks.length > 0

  return (
    <section className="page-section border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="section-title text-slate-900">Task Views</h3>
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

      {shouldDeferTaskViews ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]" aria-live="polite" aria-busy="true">
          <div className="min-w-0 space-y-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="animate-pulse rounded-xl border border-slate-200 bg-white p-3">
                <div className="h-4 w-1/3 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-11/12 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-8/12 rounded bg-slate-100" />
              </div>
            ))}
          </div>
          <aside className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-3">
            <div className="animate-pulse space-y-2">
              <div className="h-4 w-2/3 rounded bg-cyan-100" />
              <div className="h-16 rounded-lg border border-cyan-200 bg-white" />
            </div>
          </aside>
        </div>
      ) : (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {taskViewMode === 'board' ? (
            <TaskBoardView
              tasks={assignedTasks}
              assigneeLabelByUserId={assigneeLabelByUserId}
              assigneeAvatarUrlByUserId={assigneeAvatarUrlByUserId}
              workPackageLabelById={workPackageLabelById}
              workPackageColorById={workPackageColorById}
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
              tasks={assignedTasks}
              assigneeLabelByUserId={assigneeLabelByUserId}
              workPackageLabelById={workPackageLabelById}
              workPackageColorById={workPackageColorById}
              dependencyLabelByTaskId={dependencyLabelByTaskId}
              onOpenUserProfile={onOpenUserProfile}
              onTaskClick={onTaskClick}
              canManageTask={canManageTask}
            />
          ) : null}
        </div>

        <aside className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-3">
          <div className="mb-2">
            <h4 className="text-sm font-semibold text-cyan-900">Unassigned Tasks ({sharedQueueTasks.length})</h4>
          </div>

          {sharedQueueTasks.length === 0 ? (
            <p className="rounded-lg border border-cyan-200 bg-white px-3 py-4 text-center text-xs text-slate-500">
              No unassigned tasks
            </p>
          ) : (
            <div className="space-y-2">
              {sharedQueueTasks.map((task) => (
                <article
                  key={task.id}
                  onClick={() => onTaskClick?.(task.id)}
                  className={`rounded-lg border border-cyan-200 bg-white p-2.5 transition ${onTaskClick ? 'cursor-pointer hover:border-cyan-300 hover:bg-cyan-50/30' : ''}`}
                  style={task.work_package_id && workPackageColorById[task.work_package_id]
                    ? {
                        borderLeftWidth: '4px',
                        borderLeftColor: workPackageColorById[task.work_package_id],
                      }
                    : undefined}
                >
                  <p className="truncate text-sm font-semibold text-slate-800">{task.title}</p>

                  <div className="mt-1.5 min-h-10">
                    {task.description ? (
                      <p className="line-clamp-2 text-xs leading-5 text-slate-600">{task.description}</p>
                    ) : null}
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600">
                    <span>Status: {task.status ?? 'todo'}</span>
                    <span>Priority: {task.priority ?? 'medium'}</span>
                    <span>Estimate: {task.estimate_hours ?? 0}h</span>
                    <span>Due: {formatDueDate(task.due_date)}</span>
                  </div>

                  {canTakeUnassignedTasks && currentUserId ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onTakeTask(task.id)
                      }}
                      className="mt-2 w-full rounded-md border border-cyan-300 bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-900 hover:bg-cyan-200"
                    >
                      Take task
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </aside>
      </div>
      )}
    </section>
  )
}
