import type { PlanningTaskFieldsProps } from './create-task-section.types'

export function CreateTaskPlanningFields(props: PlanningTaskFieldsProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-slate-900">Planning</h4>
      <p className="mt-1 text-xs text-slate-500">
        {props.useEstimates
          ? 'Set effort, urgency, and due date constraints.'
          : 'Set urgency and due date constraints.'}
      </p>

      <div className="mt-3 space-y-3">
        {props.useEstimates ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Estimated hours *</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={props.taskEstimateHours}
              onChange={(event) => props.onTaskEstimateHoursChange(event.target.value)}
              placeholder="e.g. 6"
              className={`h-9 w-full rounded-lg border bg-white px-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 ${
                props.hasAttemptedSubmit && props.isEstimateHoursMissingOrInvalid
                  ? 'border-rose-400 bg-rose-50/40'
                  : 'border-slate-300'
              }`}
            />
          </div>
        ) : null}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Priority</label>
          <select
            value={props.taskPriority}
            onChange={(event) => props.onTaskPriorityChange(event.target.value)}
            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-slate-500"
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Due date</label>
          <input
            type="date"
            value={props.taskDueDate}
            onChange={(event) => props.onTaskDueDateChange(event.target.value)}
            min={props.projectStartDate || undefined}
            max={props.projectEndDate || undefined}
            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-slate-500"
          />
          {props.projectStartDate || props.projectEndDate ? (
            <p className="mt-1 text-[11px] text-slate-500">
              Allowed range: {props.projectStartDate || '...'} - {props.projectEndDate || '...'}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}