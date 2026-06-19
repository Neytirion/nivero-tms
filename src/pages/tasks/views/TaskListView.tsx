import type { TaskPreview } from '../../../lib/pm'
import { getTaskPriorityBadgeClass } from '../tasks-page.utils'

interface TaskListViewProps {
  tasks: TaskPreview[]
  assigneeLabelByUserId: Record<string, string>
  workPackageLabelById: Record<string, string>
  dependencyLabelByTaskId: Record<string, string>
}

export function TaskListView({
  tasks,
  assigneeLabelByUserId,
  workPackageLabelById,
  dependencyLabelByTaskId,
}: TaskListViewProps) {
  return (
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
  )
}
