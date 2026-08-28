import type { PlanningTaskFieldsProps } from './create-task-section.types'

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(baseDate: Date, days: number) {
  const next = new Date(baseDate)
  next.setDate(next.getDate() + days)
  return next
}

export function CreateTaskPlanningFields(props: PlanningTaskFieldsProps) {
  const priorityOptions = [
    { value: 'low', label: 'Low', tone: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
    { value: 'medium', label: 'Medium', tone: 'bg-amber-50 border-amber-200 text-amber-800' },
    { value: 'high', label: 'High', tone: 'bg-rose-50 border-rose-200 text-rose-800' },
  ] as const

  const dueDateShortcuts = [
    { id: 'today', label: 'Today', value: toDateInputValue(new Date()) },
    { id: 'plus3', label: '+3d', value: toDateInputValue(addDays(new Date(), 3)) },
    { id: 'plus7', label: '+7d', value: toDateInputValue(addDays(new Date(), 7)) },
    { id: 'projectEnd', label: 'Project end', value: props.projectEndDate },
  ].filter((item) => Boolean(item.value))

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-slate-900">Planning</h4>

      <div className="mt-3 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Time required</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={props.taskEstimateHours}
            onChange={(event) => props.onTaskEstimateHoursChange(event.target.value)}
            placeholder="e.g. 6"
            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Priority</label>
          <div className="grid grid-cols-3 gap-2">
            {priorityOptions.map((option) => {
              const isSelected = props.taskPriority === option.value

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => props.onTaskPriorityChange(option.value)}
                  className={`rounded-lg border px-2.5 py-2 text-xs font-semibold transition ${
                    isSelected
                      ? `${option.tone} shadow-sm`
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <label className="block text-sm font-medium text-slate-700">Due date</label>
            <button
              type="button"
              onClick={() => props.onTaskDueDateChange('')}
              className="rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Clear
            </button>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <input
              type="date"
              value={props.taskDueDate}
              onChange={(event) => props.onTaskDueDateChange(event.target.value)}
              min={props.projectStartDate || undefined}
              max={props.projectEndDate || undefined}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-slate-500"
            />

            <div className="mt-2 flex flex-wrap gap-1.5">
              {dueDateShortcuts.map((shortcut) => {
                const isSelected = props.taskDueDate === shortcut.value
                return (
                  <button
                    key={shortcut.id}
                    type="button"
                    onClick={() => props.onTaskDueDateChange(shortcut.value)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-100 text-cyan-900'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {shortcut.label}
                  </button>
                )
              })}
            </div>
          </div>

          {props.projectStartDate || props.projectEndDate ? (
            <p className="mt-1 text-[11px] text-slate-500">
              Allowed range: {props.projectStartDate || '...'} - {props.projectEndDate || '...'}
            </p>
          ) : null}
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={props.taskIsBillable}
            onChange={(e) => props.onTaskIsBillableChange(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
          />
          <span className="text-sm font-medium text-slate-700">Billable task</span>
        </label>
      </div>
    </div>
  )
}