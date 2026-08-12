import type { TaskPreview } from '../../../lib/pm'
import { useMemo, useState } from 'react'
import { getTaskPriorityBadgeClass } from '../tasks-page.utils'

interface TaskListViewProps {
  tasks: TaskPreview[]
  assigneeLabelByUserId: Record<string, string>
  workPackageLabelById: Record<string, string>
  dependencyLabelByTaskId: Record<string, string>
  onOpenUserProfile: (userId: string) => void
  onTaskClick?: (taskId: string) => void
  canManageTask: (task: TaskPreview) => boolean
}

export function TaskListView({
  tasks,
  assigneeLabelByUserId,
  workPackageLabelById,
  dependencyLabelByTaskId,
  onOpenUserProfile,
  onTaskClick,
  canManageTask,
}: TaskListViewProps) {
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'>('all')
  const [accessFilter, setAccessFilter] = useState<'all' | 'editable' | 'view_only'>('all')

  const filteredTasks = useMemo(
    () => tasks.filter((task) => {
      if (priorityFilter !== 'all' && (task.priority ?? 'medium').toLowerCase() !== priorityFilter) {
        return false
      }

      if (statusFilter !== 'all' && (task.status ?? 'todo') !== statusFilter) {
        return false
      }

      if (accessFilter === 'editable' && !canManageTask(task)) {
        return false
      }

      if (accessFilter === 'view_only' && canManageTask(task)) {
        return false
      }

      return true
    }),
    [tasks, priorityFilter, statusFilter, accessFilter, canManageTask],
  )

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <div className="flex flex-wrap items-end gap-2 border-b border-slate-200 bg-slate-50/70 px-3 py-2">
        <label className="flex min-w-[120px] flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Priority
          <select
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as 'all' | 'high' | 'medium' | 'low')}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700"
          >
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>

        <label className="flex min-w-[120px] flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | 'backlog' | 'todo' | 'in_progress' | 'review' | 'done')}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700"
          >
            <option value="all">All</option>
            <option value="backlog">Backlog</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
        </label>

        <label className="flex min-w-[140px] flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Access
          <select
            value={accessFilter}
            onChange={(event) => setAccessFilter(event.target.value as 'all' | 'editable' | 'view_only')}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700"
          >
            <option value="all">All</option>
            <option value="editable">Editable</option>
            <option value="view_only">View only</option>
          </select>
        </label>

        <button
          type="button"
          onClick={() => {
            setPriorityFilter('all')
            setStatusFilter('all')
            setAccessFilter('all')
          }}
          className="ml-auto rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          Reset filters
        </button>
      </div>

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
          {filteredTasks.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-4 text-center text-slate-500">
                No tasks match current filters
              </td>
            </tr>
          ) : (
            filteredTasks.map((task) => (
              <tr
                key={task.id}
                className={`border-t border-slate-100 ${onTaskClick ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                onClick={() => onTaskClick?.(task.id)}
              >
                <td className="px-3 py-2 font-medium text-slate-800">{task.title}</td>
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
                  {task.assigned_to ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpenUserProfile(task.assigned_to as string)
                      }}
                      className="text-cyan-700 underline-offset-2 hover:underline"
                    >
                      {assigneeLabelByUserId[task.assigned_to] ?? task.assigned_to}
                    </button>
                  ) : task.created_by ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onOpenUserProfile(task.created_by as string)
                      }}
                      className="text-cyan-700 underline-offset-2 hover:underline"
                    >
                      {(assigneeLabelByUserId[task.created_by] ?? task.created_by)} (creator)
                    </button>
                  ) : 'Unassigned'}
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
  )
}
