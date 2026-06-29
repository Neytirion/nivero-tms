import { useNavigate } from 'react-router-dom'
import { useTasksPageController } from './useTasksPageController'
import { useEffect } from 'react'
import { CreateTaskSection } from '.'

export function CreateTaskPage() {
  const navigate = useNavigate()

  const {
    status,
    isLoading,
    selectedProject,
    selectedProjectId,
    isMemberInSelectedProject,
    projects,
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
    selectProject,
  } = useTasksPageController()

  // Redirect if no project is selected
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      // Auto-select first project
      void selectProject(projects[0].id)
    }
  }, [selectedProjectId, projects, selectProject])

  const handleCreateTask = async () => {
    await createTaskHandler()
    navigate('/app/tasks')
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/app/tasks')}
            className="mb-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Tasks
          </button>
          <h1 className="text-3xl font-bold text-slate-900">Create Task</h1>
          <p className="mt-2 text-slate-600">Add a new task to your project</p>
        </div>

        {/* Status message */}
        {status && (
          <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-2">
            <p className="text-sm text-slate-700">{status}</p>
          </div>
        )}

        {/* Main Card */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <CreateTaskSection
            hasEstimateVersion={hasEstimateVersion}
            selectedProjectId={selectedProjectId}
            isMemberInSelectedProject={isMemberInSelectedProject}
            projects={projects}
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
            onSelectProject={(projectId) => {
              void selectProject(projectId)
            }}
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
    </div>
  )
}
