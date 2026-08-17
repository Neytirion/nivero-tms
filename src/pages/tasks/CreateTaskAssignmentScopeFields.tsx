import type { AssignmentScopeFieldsProps } from './create-task-section.types'

export function CreateTaskAssignmentScopeFields(props: AssignmentScopeFieldsProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-slate-900">Assignment & Scope</h4>
      <p className="mt-1 text-xs text-slate-500">
        {props.useEstimates
          ? 'Link the task to estimate scope and optionally set an owner.'
          : 'Assign dependencies and optionally set an owner.'}
      </p>

      <div className="mt-3 space-y-3">
        {props.useEstimates ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Work package *</label>
            <select
              value={props.taskWorkPackageId}
              onChange={(event) => props.onTaskWorkPackageIdChange(event.target.value)}
              className={`h-9 w-full rounded-lg border bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-slate-500 ${
                props.hasAttemptedSubmit && props.isWorkPackageMissing
                  ? 'border-rose-400 bg-rose-50/40'
                  : 'border-slate-300'
              }`}
            >
              <option value="">Select work package</option>
              {props.workPackages.map((workPackage) => (
                <option key={workPackage.id} value={workPackage.id}>
                  {workPackage.name}
                </option>
              ))}
            </select>
            {props.workPackages.length === 0 && props.selectedProjectId && props.hasEstimateVersion === true ? (
              <p className="mt-1 text-[11px] text-rose-600">
                No active work packages found. Add packages in Project Details {'->'} Estimates.
              </p>
            ) : null}
          </div>
        ) : null}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Blocked by task</label>
          <select
            value={props.taskBlockedByTaskId}
            onChange={(event) => props.onTaskBlockedByTaskIdChange(event.target.value)}
            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-slate-500"
          >
            <option value="">None</option>
            {props.dependencyOptions.map((task) => (
              <option key={task.id} value={task.id}>
                {task.label}
              </option>
            ))}
          </select>
        </div>

        {props.canAssignAssignee ? (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Assignee</label>
            <select
              value={props.taskAssigneeId}
              onChange={(event) => props.onTaskAssigneeIdChange(event.target.value)}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 outline-none focus:border-slate-500"
            >
              <option value="">Unassigned</option>
              {props.projectMembers.map((member) => (
                <option key={member.member_id} value={member.user_id ?? ''}>
                  {member.full_name || member.email || member.user_id}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    </div>
  )
}