import { CreateTaskAssignmentScopeFields } from './CreateTaskAssignmentScopeFields'
import { CreateTaskCoreFields } from './CreateTaskCoreFields'
import { CreateTaskFooter } from './CreateTaskFooter'
import { CreateTaskPlanningFields } from './CreateTaskPlanningFields'
import type { CreateTaskSectionProps } from './create-task-section.types'

export function CreateTaskSection({
  useEstimates,
  hasEstimateVersion,
  selectedProjectId,
  isMemberInSelectedProject,
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
  hasAttemptedSubmit,
  isLoading,
  canSubmit,
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
  const isCreationBlocked =
    !selectedProjectId ||
    (useEstimates && hasEstimateVersion !== true) ||
    !canSubmit ||
    missingRequiredFields.length > 0 ||
    isLoading

  return (
    <section className="page-section border border-slate-200 bg-[linear-gradient(170deg,#ffffff_0%,#f8fafc_58%,#eef2ff_100%)]">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Create Task</h3>
          <p className="mt-2 text-sm text-slate-600">
            Current project: <span className="text-base font-semibold text-slate-800">{selectedProject?.name ?? 'No project selected'}</span>
          </p>
        </div>
      </div>

      {useEstimates && hasEstimateVersion === false && selectedProjectId ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          {isMemberInSelectedProject
            ? 'Estimate version is not created yet. Task creation is unavailable.'
            : 'Create estimate version v1 in Project Details -> Estimates before creating tasks.'}
        </p>
      ) : null}

      {missingRequiredFields.length > 0 ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          Missing required fields: {missingRequiredFields.join(', ')}.
        </div>
      ) : null}

      <div className="mt-4 grid gap-4">
        <CreateTaskCoreFields
          selectedProject={selectedProject}
          hasAttemptedSubmit={hasAttemptedSubmit}
          isProjectMissing={isProjectMissing}
          isTaskTitleMissing={isTaskTitleMissing}
          taskTitle={taskTitle}
          taskDescription={taskDescription}
          onTaskTitleChange={onTaskTitleChange}
          onTaskDescriptionChange={onTaskDescriptionChange}
        />

        <CreateTaskPlanningFields
          useEstimates={useEstimates}
          hasAttemptedSubmit={hasAttemptedSubmit}
          isEstimateHoursMissingOrInvalid={isEstimateHoursMissingOrInvalid}
          taskEstimateHours={taskEstimateHours}
          taskPriority={taskPriority}
          taskDueDate={taskDueDate}
          projectStartDate={projectStartDate}
          projectEndDate={projectEndDate}
          onTaskEstimateHoursChange={onTaskEstimateHoursChange}
          onTaskPriorityChange={onTaskPriorityChange}
          onTaskDueDateChange={onTaskDueDateChange}
        />

        <CreateTaskAssignmentScopeFields
          useEstimates={useEstimates}
          selectedProjectId={selectedProjectId}
          hasEstimateVersion={hasEstimateVersion}
          hasAttemptedSubmit={hasAttemptedSubmit}
          isWorkPackageMissing={isWorkPackageMissing}
          taskWorkPackageId={taskWorkPackageId}
          taskBlockedByTaskId={taskBlockedByTaskId}
          taskAssigneeId={taskAssigneeId}
          workPackages={workPackages}
          dependencyOptions={dependencyOptions}
          canAssignAssignee={canAssignAssignee}
          projectMembers={projectMembers}
          onTaskWorkPackageIdChange={onTaskWorkPackageIdChange}
          onTaskBlockedByTaskIdChange={onTaskBlockedByTaskIdChange}
          onTaskAssigneeIdChange={onTaskAssigneeIdChange}
        />
      </div>

      <CreateTaskFooter
        selectedProject={selectedProject}
        selectedProjectId={selectedProjectId}
        hasEstimateVersion={hasEstimateVersion}
        canSubmit={canSubmit}
        missingRequiredFields={missingRequiredFields}
        isLoading={isLoading}
        onCreateTask={onCreateTask}
        isCreationBlocked={isCreationBlocked}
      />
    </section>
  )
}
