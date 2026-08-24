import type { TaskStatus } from '../../features/tasks/constants.ts'
import { TaskCard } from '../../features/tasks/components/card'
import {
  type ProjectTaskCardFieldPreferences,
  type TaskPreview,
} from '../../lib/pm'
import { TaskBoardView } from './views/TaskBoardView'
import { TaskListView } from './views/TaskListView'

const DEFAULT_TASK_CARD_FIELD_PREFERENCES: ProjectTaskCardFieldPreferences = {
  showDescription: true,
  showPriority: true,
  showDueState: true,
  showDueDate: true,
  showAssignee: true,
  showWorkPackage: true,
}

export type TaskViewMode = 'list' | 'board'

type TaskViewsSectionProps = {
  taskViewMode: TaskViewMode
  onTaskViewModeChange: (mode: TaskViewMode) => void
  isWorkPackagesLoading: boolean
  isTaskCardPreferencesLoading?: boolean
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
  taskCardFieldPreferences?: ProjectTaskCardFieldPreferences
}

export function TaskViewsSection({
  taskViewMode,
  onTaskViewModeChange,
  isWorkPackagesLoading,
  isTaskCardPreferencesLoading = false,
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
  taskCardFieldPreferences,
}: TaskViewsSectionProps) {
  const effectiveTaskCardFieldPreferences = taskCardFieldPreferences ?? DEFAULT_TASK_CARD_FIELD_PREFERENCES
  const sharedQueueTasks = tasks.filter((task) => !task.assigned_to)
  const assignedTasks = tasks.filter((task) => Boolean(task.assigned_to))

  const isClientIntakeTask = (task: TaskPreview) => {
    const description = task.description ?? ''
    return /^\s*Client request submitted via public intake link\./i.test(description)
  }

  const getUnassignedTaskTitle = (task: TaskPreview) => {
    if (isClientIntakeTask(task)) {
      return 'Task from client'
    }

    return task.title
  }

  const shouldDeferTaskViews = taskViewMode === 'board' && (isWorkPackagesLoading || isTaskCardPreferencesLoading) && tasks.length > 0

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
        <div className="grid gap-4 xl:grid-cols-6" aria-live="polite" aria-busy="true">
          <div className="min-w-0 space-y-3 xl:col-span-5">
            {[0, 1, 2].map((row) => (
              <div key={row} className="animate-pulse rounded-xl border border-slate-200 bg-white p-3">
                <div className="h-4 w-1/3 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-11/12 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-8/12 rounded bg-slate-100" />
              </div>
            ))}
          </div>
          <aside className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-3 xl:col-span-1">
            <div className="animate-pulse space-y-2">
              <div className="h-4 w-2/3 rounded bg-cyan-100" />
              <div className="h-16 rounded-lg border border-cyan-200 bg-white" />
            </div>
          </aside>
        </div>
      ) : (
      <div className="grid gap-4 xl:grid-cols-6">
        <div className="min-w-0 xl:col-span-5">
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
              taskCardFieldPreferences={effectiveTaskCardFieldPreferences}
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

        <aside className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-3 xl:col-span-1">
          <div className="mb-2">
            <h4 className="text-sm font-semibold text-cyan-900">Unassigned Tasks ({sharedQueueTasks.length})</h4>
          </div>

          {sharedQueueTasks.length === 0 ? (
            <p className="rounded-lg border border-cyan-200 bg-white px-3 py-4 text-center text-xs text-slate-500">
              No unassigned tasks
            </p>
          ) : (
            <div className="space-y-2">
              {sharedQueueTasks.map((task) => {
                const clientIntakeTask = isClientIntakeTask(task)

                return (
                <div key={task.id} className="space-y-2">
                  <TaskCard
                    task={{
                      ...task,
                      title: getUnassignedTaskTitle(task),
                    }}
                    workPackageLabel={
                      task.work_package_id
                        ? (workPackageLabelById[task.work_package_id] ?? null)
                        : (task.work_package?.name ?? null)
                    }
                    workPackageColor={
                      task.work_package_id
                        ? (workPackageColorById[task.work_package_id] ?? null)
                        : (task.work_package?.color ?? null)
                    }
                    assigneeUserId={clientIntakeTask ? null : task.created_by}
                    assigneeLabel={
                      clientIntakeTask
                        ? 'Client'
                        : task.created_by
                        ? `${assigneeLabelByUserId[task.created_by] ?? task.created_by} (creator)`
                        : 'Unassigned'
                    }
                    assigneeAvatarUrl={
                      clientIntakeTask
                        ? null
                        : (task.created_by ? (assigneeAvatarUrlByUserId[task.created_by] ?? null) : null)
                    }
                    onTaskClick={onTaskClick}
                    onOpenUserProfile={onOpenUserProfile}
                    isLocked={!canManageTask(task)}
                    fieldPreferences={effectiveTaskCardFieldPreferences}
                  />

                  {canTakeUnassignedTasks && currentUserId ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onTakeTask(task.id)
                      }}
                      className="w-full rounded-md border border-cyan-300 bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-900 hover:bg-cyan-200"
                    >
                      Take task
                    </button>
                  ) : null}
                </div>
                )
              })}
            </div>
          )}
        </aside>
      </div>
      )}
    </section>
  )
}
