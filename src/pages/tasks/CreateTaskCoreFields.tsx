import type { CoreTaskFieldsProps } from './create-task-section.types'

export function CreateTaskCoreFields(props: CoreTaskFieldsProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Core</p>
      <div className="mt-2 space-y-2.5">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Project *</label>
          <select
            value={props.selectedProjectId ?? ''}
            onChange={(event) => {
              if (event.target.value) {
                props.onSelectProject(event.target.value)
              }
            }}
            className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500 ${
              props.hasAttemptedSubmit && props.isProjectMissing
                ? 'border-rose-400 bg-rose-50/40'
                : 'border-slate-300'
            }`}
          >
            <option value="">Select project</option>
            {props.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Task title *</label>
          <input
            type="text"
            value={props.taskTitle}
            onChange={(event) => props.onTaskTitleChange(event.target.value)}
            placeholder="Short task name"
            className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 ${
              props.hasAttemptedSubmit && props.isTaskTitleMissing
                ? 'border-rose-400 bg-rose-50/40'
                : 'border-slate-300'
            }`}
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Description</label>
          <input
            type="text"
            value={props.taskDescription}
            onChange={(event) => props.onTaskDescriptionChange(event.target.value)}
            placeholder="What exactly needs to be done"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
          />
        </div>
      </div>
    </div>
  )
}