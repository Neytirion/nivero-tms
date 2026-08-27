import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'
import { useTasksPageController } from './useTasksPageController'
import { CreateTaskSection } from '.'
import { WorkspacePageHeader } from '../../shared/components'

export function CreateTaskPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const {
    isLoading,
    selectedProject,
    selectedProjectId,
    useEstimates,
    isProjectMissing,
    isTaskTitleMissing,
    isEstimateHoursMissingOrInvalid,
    isWorkPackageMissing,
    missingRequiredFields,
    hasAttemptedSubmit,
    setHasAttemptedSubmit,
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
    taskIsBillable,
    setTaskIsBillable,
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
    memberDisplayRoleByUserId,
    canSubmit,
    createTaskHandler,
    selectProject,
  } = useTasksPageController()

  const projectIdFromQuery = searchParams.get('projectId')
  const activeProjectId = projectIdFromQuery ?? selectedProjectId

  useEffect(() => {
    if (projectIdFromQuery && projectIdFromQuery !== selectedProjectId) {
      void selectProject(projectIdFromQuery)
    }
  }, [projectIdFromQuery, selectedProjectId, selectProject])

  const handleCreateTask = async () => {
    const wasCreated = await createTaskHandler()
    if (wasCreated) {
      navigate(activeProjectId ? `/app/tasks?projectId=${activeProjectId}` : '/app/tasks')
    }
  }

  return (
    <div className="space-y-5">
        <WorkspacePageHeader
          eyebrow="Tasks"
          title="Create Task"
          backButton={{
            label: '← Back to Tasks',
            onClick: () => navigate(activeProjectId ? `/app/tasks?projectId=${activeProjectId}` : '/app/tasks'),
          }}
        />

        <CreateTaskSection
          useEstimates={useEstimates}
          selectedProjectId={selectedProjectId}
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
          taskIsBillable={taskIsBillable}
          taskWorkPackageId={taskWorkPackageId}
          taskBlockedByTaskId={taskBlockedByTaskId}
          taskAssigneeId={taskAssigneeId}
          projectStartDate={projectStartDate}
          projectEndDate={projectEndDate}
          workPackages={workPackages}
          dependencyOptions={dependencyOptions}
          canAssignAssignee={canAssignAssignee}
          projectMembers={projectMembers}
          memberDisplayRoleByUserId={memberDisplayRoleByUserId}
          missingRequiredFields={missingRequiredFields}
          hasAttemptedSubmit={hasAttemptedSubmit}
          isLoading={isLoading}
          canSubmit={canSubmit}
          onTaskTitleChange={setTaskTitle}
          onTaskDescriptionChange={setTaskDescription}
          onTaskEstimateHoursChange={setTaskEstimateHours}
          onTaskPriorityChange={setTaskPriority}
          onTaskDueDateChange={setTaskDueDate}
          onTaskIsBillableChange={setTaskIsBillable}
          onTaskWorkPackageIdChange={setTaskWorkPackageId}
          onTaskBlockedByTaskIdChange={setTaskBlockedByTaskId}
          onTaskAssigneeIdChange={setTaskAssigneeId}
          onCreateTask={handleCreateTask}
          onSetHasAttemptedSubmit={setHasAttemptedSubmit}
        />
    </div>
  )
}
