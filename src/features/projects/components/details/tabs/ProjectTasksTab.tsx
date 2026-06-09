import type { TaskPreview } from '../../../../../lib/pm'

interface ProjectTasksTabProps {
  sortedTasks: TaskPreview[]
}

export function ProjectTasksTab({ sortedTasks }: ProjectTasksTabProps) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <h4 className="text-sm font-semibold text-slate-900">Tasks in Selected Project</h4>
      <div className="mt-3 space-y-2">
        {sortedTasks.length === 0 ? (
          <p className="text-sm text-slate-500">No tasks yet</p>
        ) : (
          sortedTasks.map((task) => (
            <div key={task.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-sm font-semibold text-slate-900">{task.title}</p>
              <p className="text-xs text-slate-500">
                {task.status ?? 'todo'} · {task.priority ?? 'medium'} · {(task.actual_hours ?? 0).toFixed(1)}h
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
