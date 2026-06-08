import type { ProjectMemberListItem, ProjectPreview, WorkPackagePreview } from '../../lib/pm'

type DependencyOption = {
  id: string
  label: string
}

type CreateTaskSectionProps = {
  hasEstimateVersion: boolean | null
  selectedProjectId: string | null
  isMemberInSelectedProject: boolean
  projects: ProjectPreview[]
  selectedProject: ProjectPreview | null
  isProjectMissing: boolean
  isTaskTitleMissing: boolean
  isEstimateHoursMissingOrInvalid: boolean
  isWorkPackageMissing: boolean
  taskTitle: string
  taskDescription: string
  taskEstimateHours: string
  taskPriority: string
  taskDueDate: string
  taskWorkPackageId: string
  taskBlockedByTaskId: string
  taskAssigneeId: string
  projectStartDate: string
  projectEndDate: string
  workPackages: Array<Pick<WorkPackagePreview, 'id' | 'name' | 'estimated_hours'>>
  dependencyOptions: DependencyOption[]
  canAssignAssignee: boolean
  projectMembers: ProjectMemberListItem[]
  missingRequiredFields: string[]
  isLoading: boolean
  canSubmit: boolean
  onSelectProject: (projectId: string) => void
  onTaskTitleChange: (value: string) => void
  onTaskDescriptionChange: (value: string) => void
  onTaskEstimateHoursChange: (value: string) => void
  onTaskPriorityChange: (value: string) => void
  onTaskDueDateChange: (value: string) => void
  onTaskWorkPackageIdChange: (value: string) => void
  onTaskBlockedByTaskIdChange: (value: string) => void
  onTaskAssigneeIdChange: (value: string) => void
  onCreateTask: () => void
}

export function CreateTaskSection({
  hasEstimateVersion,
  selectedProjectId,
  isMemberInSelectedProject,
  projects,
  selectedProject,
  isProjectMissing,
  isTaskTitleMissing,
  isEstimateHoursMissingOrInvalid,
  isWorkPackageMissing,
  taskTitle,
  taskDescription,
  taskEstimateHours,
  taskPriority,
  taskDueDate,
  taskWorkPackageId,
  taskBlockedByTaskId,
  taskAssigneeId,
  projectStartDate,
  projectEndDate,
  workPackages,
  dependencyOptions,
  canAssignAssignee,
  projectMembers,
  missingRequiredFields,
  isLoading,
  canSubmit,
  onSelectProject,
  onTaskTitleChange,
  onTaskDescriptionChange,
  onTaskEstimateHoursChange,
  onTaskPriorityChange,
  onTaskDueDateChange,
  onTaskWorkPackageIdChange,
  onTaskBlockedByTaskIdChange,
  onTaskAssigneeIdChange,
  onCreateTask,
}: CreateTaskSectionProps) {
  return (
    <section className="page-section bg-slate-50/70">
      <h3 className="section-title">Create Task</h3>
      <p className="section-subtitle">Add task metadata before placing it on the board.</p>
      <p className="mt-2 text-[11px] text-slate-500">Fields marked with * are required.</p>

      {hasEstimateVersion === false && selectedProjectId ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {isMemberInSelectedProject
            ? 'Estimate version is not created yet. Task creation is unavailable.'
            : 'Create estimate version v1 in Project Details -> Estimates before creating tasks.'}
        </p>
      ) : null}

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Core</p>
          <div className="mt-2 space-y-2.5">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Project *</label>
              <select
                value={selectedProjectId ?? ''}
                onChange={(event) => {
                  if (event.target.value) {
                    onSelectProject(event.target.value)
                  }
                }}
                className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500 ${
                  isProjectMissing ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
                }`}
              >
                <option value="">Select project</option>
                {projects.map((project) => (
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
                value={taskTitle}
                onChange={(event) => onTaskTitleChange(event.target.value)}
                placeholder="Short task name"
                className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 ${
                  isTaskTitleMissing ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
                }`}
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Description</label>
              <input
                type="text"
                value={taskDescription}
                onChange={(event) => onTaskDescriptionChange(event.target.value)}
                placeholder="What exactly needs to be done"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Planning</p>
          <div className="mt-2 space-y-2.5">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Estimated hours *</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={taskEstimateHours}
                onChange={(event) => onTaskEstimateHoursChange(event.target.value)}
                placeholder="e.g. 6"
                className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 ${
                  isEstimateHoursMissingOrInvalid ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
                }`}
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Priority</label>
              <select
                value={taskPriority}
                onChange={(event) => onTaskPriorityChange(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Due date</label>
              <input
                type="date"
                value={taskDueDate}
                onChange={(event) => onTaskDueDateChange(event.target.value)}
                min={projectStartDate || undefined}
                max={projectEndDate || undefined}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
              />
              {projectStartDate || projectEndDate ? (
                <p className="mt-1 text-[11px] text-slate-500">
                  Allowed range: {projectStartDate || '...'} - {projectEndDate || '...'}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assignment & Scope</p>
          <div className="mt-2 space-y-2.5">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Work Package *</label>
              <select
                value={taskWorkPackageId}
                onChange={(event) => onTaskWorkPackageIdChange(event.target.value)}
                className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500 ${
                  isWorkPackageMissing ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
                }`}
              >
                <option value="">Select work package</option>
                {workPackages.map((workPackage) => (
                  <option key={workPackage.id} value={workPackage.id}>
                    {workPackage.name}
                  </option>
                ))}
              </select>
              {workPackages.length === 0 && selectedProjectId && hasEstimateVersion === true ? (
                <p className="mt-1 text-[11px] text-rose-600">
                  No active work packages found. Add packages in Project Details {'->'} Estimates.
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Blocked by task</label>
              <select
                value={taskBlockedByTaskId}
                onChange={(event) => onTaskBlockedByTaskIdChange(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
              >
                <option value="">None</option>
                {dependencyOptions.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.label}
                  </option>
                ))}
              </select>
            </div>

            {canAssignAssignee ? (
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Assignee</label>
                <select
                  value={taskAssigneeId}
                  onChange={(event) => onTaskAssigneeIdChange(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
                >
                  <option value="">Unassigned</option>
                  {projectMembers.map((member) => (
                    <option key={member.member_id} value={member.user_id ?? ''}>
                      {member.full_name || member.email || member.user_id}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                Task will be assigned automatically according to your role permissions.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        {missingRequiredFields.length > 0 ? (
          <p className="text-xs text-rose-600">Fill in: {missingRequiredFields.join(', ')}</p>
        ) : (
          <p className="text-xs text-slate-500">
            {selectedProject ? `Selected project: ${selectedProject.name}` : 'Select a project first.'}
          </p>
        )}
        <button
          type="button"
          onClick={onCreateTask}
          disabled={
            !selectedProjectId ||
            hasEstimateVersion !== true ||
            !canSubmit ||
            missingRequiredFields.length > 0 ||
            isLoading
          }
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Create task
        </button>
      </div>
    </section>
  )
}
