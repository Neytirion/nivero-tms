import { useNavigate } from 'react-router-dom'
import { useTasksPageController } from './useTasksPageController'
import { CreateTaskSection } from '.'

export function CreateTaskPage() {
  const navigate = useNavigate()

  const {
    isLoading,
    selectedProject,
    selectedProjectId,
    isMemberInSelectedProject,
    hasEstimateVersion,
    isProjectMissing,
    isTaskTitleMissing,
    isEstimateHoursMissingOrInvalid,
    isWorkPackageMissing,
    missingRequiredFields,
    hasAttemptedSubmit,
    taskTitle,
    setTaskTitle,
    taskDescription,
    setTaskDescription,
    taskEstimateHours,
    setTaskEstimateHours,
    taskPriority,
    setTaskPriority,
    taskDueDate,
    setTaskDueDate,
    taskWorkPackageId,
    setTaskWorkPackageId,
    taskBlockedByTaskId,
    setTaskBlockedByTaskId,
    taskAssigneeId,
    setTaskAssigneeId,
    workPackages,
    dependencyOptions,
    projectStartDate,
    projectEndDate,
    canAssignAssignee,
    projectMembers,
    canSubmit,
    createTaskHandler,
  } = useTasksPageController()

  const handleCreateTask = async () => {
    await createTaskHandler()
    navigate('/app/tasks')
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/app/tasks')}
            className="mb-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Tasks
          </button>
          <h1 className="text-3xl font-bold text-slate-900">Create Task</h1>
          <p className="mt-2 text-slate-600">Create clear, estimate-linked tasks your team can execute immediately.</p>
        </div>

        <CreateTaskSection
          hasEstimateVersion={hasEstimateVersion}
          selectedProjectId={selectedProjectId}
          isMemberInSelectedProject={isMemberInSelectedProject}
          selectedProject={selectedProject}
          isProjectMissing={isProjectMissing}
          isTaskTitleMissing={isTaskTitleMissing}
          isEstimateHoursMissingOrInvalid={isEstimateHoursMissingOrInvalid}
          isWorkPackageMissing={isWorkPackageMissing}
          taskTitle={taskTitle}
          taskDescription={taskDescription}
          taskEstimateHours={taskEstimateHours}
          taskPriority={taskPriority}
          taskDueDate={taskDueDate}
          taskWorkPackageId={taskWorkPackageId}
          taskBlockedByTaskId={taskBlockedByTaskId}
          taskAssigneeId={taskAssigneeId}
          projectStartDate={projectStartDate}
          projectEndDate={projectEndDate}
          workPackages={workPackages}
          dependencyOptions={dependencyOptions}
          canAssignAssignee={canAssignAssignee}
          projectMembers={projectMembers}
          missingRequiredFields={missingRequiredFields}
          hasAttemptedSubmit={hasAttemptedSubmit}
          isLoading={isLoading}
          canSubmit={canSubmit}
          onTaskTitleChange={setTaskTitle}
          onTaskDescriptionChange={setTaskDescription}
          onTaskEstimateHoursChange={setTaskEstimateHours}
          onTaskPriorityChange={setTaskPriority}
          onTaskDueDateChange={setTaskDueDate}
          onTaskWorkPackageIdChange={setTaskWorkPackageId}
          onTaskBlockedByTaskIdChange={setTaskBlockedByTaskId}
          onTaskAssigneeIdChange={setTaskAssigneeId}
          onCreateTask={handleCreateTask}
        />
      </div>
    </div>
  )
}
