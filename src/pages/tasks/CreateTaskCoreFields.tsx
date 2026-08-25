import type { CoreTaskFieldsProps } from './create-task-section.types'

export function CreateTaskCoreFields(props: CoreTaskFieldsProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-slate-900">Task Basics</h4>

      <div className="mt-3 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Task title</label>
          <input
            type="text"
            value={props.taskTitle}
            onChange={(event) => props.onTaskTitleChange(event.target.value)}
            placeholder="Short task name"
            className={`h-9 w-full rounded-lg border bg-white px-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 ${
              props.hasAttemptedSubmit && props.isTaskTitleMissing
                ? 'border-rose-400 bg-rose-50/40'
                : 'border-slate-300'
            }`}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            value={props.taskDescription}
            onChange={(event) => props.onTaskDescriptionChange(event.target.value)}
            rows={3}
            placeholder="What exactly needs to be done"
            className="w-full rounded-xl border-2 border-slate-300 bg-gradient-to-b from-slate-50 to-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-500 shadow-sm transition focus:border-sky-400 focus:shadow"
          />
        </div>
      </div>
    </div>
  )
}