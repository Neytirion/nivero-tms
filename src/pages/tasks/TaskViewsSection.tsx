import { KANBAN_COLUMNS, type TaskStatus } from '../../features/tasks/constants.ts'
import { KanbanColumn } from '../../features/tasks/components'
import type { TaskPreview } from '../../lib/pm'
import { getTaskPriorityBadgeClass, normalizeTaskStatus } from '../tasks-page.utils'

export type TaskViewMode = 'list' | 'board' | 'calendar'

type AssigneeOption = {
  userId: string
  label: string
}

type CalendarCell = {
  dayNumber: number
  dateKey: string
  tasks: TaskPreview[]
}

type CalendarMeta = {
  cells: Array<CalendarCell | null>
  monthTitle: string
} | null

type TaskViewsSectionProps = {
  taskViewMode: TaskViewMode
  onTaskViewModeChange: (mode: TaskViewMode) => void
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
  calendarMonth: string
  onCalendarMonthChange: (month: string) => void
  onShiftCalendarMonth: (direction: -1 | 1) => void
  calendarMeta: CalendarMeta
}

export function TaskViewsSection({
  taskViewMode,
  onTaskViewModeChange,
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
  calendarMonth,
  onCalendarMonthChange,
  onShiftCalendarMonth,
  calendarMeta,
}: TaskViewsSectionProps) {
  return (
    <section className="page-section">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="section-title">Task Views</h3>
        <div className="flex items-center gap-2">
          {([
            { key: 'list', label: 'List' },
            { key: 'board', label: 'Board' },
            { key: 'calendar', label: 'Calendar' },
          ] as const).map((view) => (
            <button
              key={view.key}
              type="button"
              onClick={() => onTaskViewModeChange(view.key)}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                taskViewMode === view.key
                  ? 'border-cyan-300 bg-cyan-100 text-cyan-900'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {taskViewMode === 'board' ? (
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
      ) : null}

      {taskViewMode === 'list' ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full bg-white text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Task</th>
                <th className="px-3 py-2 text-left">Work Package</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Priority</th>
                <th className="px-3 py-2 text-left">Assignee</th>
                <th className="px-3 py-2 text-left">Dependency</th>
                <th className="px-3 py-2 text-left">Due date</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                    No tasks yet
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-800">{task.title}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {task.work_package_id ? workPackageLabelById[task.work_package_id] ?? task.work_package_id : 'Not linked'}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{task.status ?? 'todo'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${getTaskPriorityBadgeClass(
                          task.priority,
                        )}`}
                      >
                        {task.priority ?? 'medium'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {task.assigned_to
                        ? assigneeLabelByUserId[task.assigned_to] ?? task.assigned_to
                        : task.created_by
                          ? `${assigneeLabelByUserId[task.created_by] ?? task.created_by} (creator)`
                          : 'Unassigned'}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {task.blocked_by_task_id
                        ? dependencyLabelByTaskId[task.blocked_by_task_id] ?? task.blocked_by_task_id
                        : 'None'}
                    </td>
                    <td className="px-3 py-2 text-slate-600">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {taskViewMode === 'calendar' ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onShiftCalendarMonth(-1)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                aria-label="Previous month"
              >
                {'<-'}
              </button>
              <p className="text-sm font-semibold text-slate-900 min-w-[140px] text-center">
                {calendarMeta?.monthTitle ?? 'Calendar'}
              </p>
              <button
                type="button"
                onClick={() => onShiftCalendarMonth(1)}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                aria-label="Next month"
              >
                {'->'}
              </button>
            </div>
            <input
              type="month"
              value={calendarMonth}
              onChange={(event) => onCalendarMonthChange(event.target.value)}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800 outline-none focus:border-slate-500"
            />
          </div>

          <div className="grid grid-cols-7 gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <p>Sun</p>
            <p>Mon</p>
            <p>Tue</p>
            <p>Wed</p>
            <p>Thu</p>
            <p>Fri</p>
            <p>Sat</p>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {calendarMeta?.cells.map((cell, index) => (
              <div
                key={`${cell?.dateKey ?? 'blank'}-${index}`}
                className={`min-h-[96px] rounded-lg border p-2 ${
                  cell ? 'border-slate-200 bg-slate-50' : 'border-transparent bg-transparent'
                }`}
              >
                {cell ? (
                  <>
                    <p className="text-xs font-semibold text-slate-700">{cell.dayNumber}</p>
                    <div className="mt-1 space-y-1">
                      {cell.tasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          className={`rounded bg-white px-1.5 py-1 text-[10px] border ${getTaskPriorityBadgeClass(task.priority)}`}
                          title={`${task.title}${
                            task.blocked_by_task_id
                              ? ` | Blocked by: ${dependencyLabelByTaskId[task.blocked_by_task_id] ?? task.blocked_by_task_id}`
                              : ''
                          }`}
                        >
                          {task.title}
                        </div>
                      ))}
                      {cell.tasks.length > 3 ? (
                        <p className="text-[10px] text-slate-500">+{cell.tasks.length - 3} more</p>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
