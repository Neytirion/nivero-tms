import { CreateTaskAssignmentScopeFields } from './CreateTaskAssignmentScopeFields'
import { CreateTaskCoreFields } from './CreateTaskCoreFields'
import { CreateTaskFooter } from './CreateTaskFooter'
import { CreateTaskPlanningFields } from './CreateTaskPlanningFields'
import type { CreateTaskSectionProps } from './create-task-section.types'

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
  hasAttemptedSubmit,
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
        <CreateTaskCoreFields
          projects={projects}
          selectedProjectId={selectedProjectId}
          hasAttemptedSubmit={hasAttemptedSubmit}
          isProjectMissing={isProjectMissing}
          isTaskTitleMissing={isTaskTitleMissing}
          taskTitle={taskTitle}
          taskDescription={taskDescription}
          onSelectProject={onSelectProject}
          onTaskTitleChange={onTaskTitleChange}
          onTaskDescriptionChange={onTaskDescriptionChange}
        />

        <CreateTaskPlanningFields
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
      />
    </section>
  )
}
