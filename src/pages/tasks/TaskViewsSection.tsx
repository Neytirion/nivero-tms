import type { TaskStatus } from '../../features/tasks/constants.ts'
import type { TaskPreview } from '../../lib/pm'
import { TaskBoardView } from './views/TaskBoardView'
import { TaskCalendarView } from './views/TaskCalendarView'
import { TaskListView } from './views/TaskListView'
import type { AssigneeOption, CalendarMeta } from './views/task-view-types'

export type TaskViewMode = 'list' | 'board' | 'calendar'

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
  onUpdateTaskDueDate: (taskId: string, dueDate: string) => void
  onDeleteTask: (taskId: string) => void
  onLogTime: (task: TaskPreview | null) => void
  onTaskClick?: (taskId: string) => void
  canManageTask: (task: TaskPreview) => boolean
  canDeleteTask: (task: TaskPreview) => boolean
  projectStartDate: string
  projectEndDate: string
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
  onUpdateTaskDueDate,
  onDeleteTask,
  onLogTime,
  onTaskClick,
  canManageTask,
  canDeleteTask,
  projectStartDate,
  projectEndDate,
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
        <TaskBoardView
          tasks={tasks}
          assigneeLabelByUserId={assigneeLabelByUserId}
          workPackageLabelById={workPackageLabelById}
          dependencyLabelByTaskId={dependencyLabelByTaskId}
          assigneeOptions={assigneeOptions}
          canAssignAssignee={canAssignAssignee}
          dragTaskId={dragTaskId}
          onDragTaskIdChange={onDragTaskIdChange}
          onMoveTaskToStatus={onMoveTaskToStatus}
          onAssignTask={onAssignTask}
          onUpdateTaskDueDate={onUpdateTaskDueDate}
          onDeleteTask={onDeleteTask}
          onLogTime={onLogTime}
          onTaskClick={onTaskClick}
          canManageTask={canManageTask}
          canDeleteTask={canDeleteTask}
          projectStartDate={projectStartDate}
          projectEndDate={projectEndDate}
        />
      ) : null}

      {taskViewMode === 'list' ? (
        <TaskListView
          tasks={tasks}
          assigneeLabelByUserId={assigneeLabelByUserId}
          workPackageLabelById={workPackageLabelById}
          dependencyLabelByTaskId={dependencyLabelByTaskId}
        />
      ) : null}

      {taskViewMode === 'calendar' ? (
        <TaskCalendarView
          tasks={tasks}
          calendarMonth={calendarMonth}
          onCalendarMonthChange={onCalendarMonthChange}
          onShiftCalendarMonth={onShiftCalendarMonth}
          calendarMeta={calendarMeta}
          assigneeLabelByUserId={assigneeLabelByUserId}
          dependencyLabelByTaskId={dependencyLabelByTaskId}
        />
      ) : null}
    </section>
  )
}
