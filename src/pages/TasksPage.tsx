import { TaskLogTimeModal } from '../features/tasks/components'
import { CreateTaskSection, TaskViewsSection } from './tasks'
import { useTasksPageController } from './tasks/useTasksPageController'

export function TasksPage() {
  const {
    status,
    isLoading,
    selectedProject,
    selectedProjectId,
    myRoleInSelectedProject,
    isMemberInSelectedProject,
    projects,
    tasks,
    projectMembers,
    hasEstimateVersion,
    taskViewMode,
    setTaskViewMode,
    dragTaskId,
    setDragTaskId,
    calendarMonth,
    setCalendarMonth,
    canAssignAssignee,
    canManageTask,
    canDeleteTaskInView,
    projectStartDate,
    projectEndDate,
    isProjectMissing,
    isTaskTitleMissing,
    isEstimateHoursMissingOrInvalid,
    isWorkPackageMissing,
    missingRequiredFields,
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
    assigneeLabelByUserId,
    dependencyLabelByTaskId,
    workPackageLabelById,
    assigneeOptions,
    canSubmit,
    logTimeTask,
    setLogTimeTask,
    calendarMeta,
    createTaskHandler,
    moveTaskToStatus,
    assignTaskHandler,
    removeTask,
    submitTaskLogTime,
    shiftCalendarMonth,
    selectProject,
  } = useTasksPageController()

  return (
    <div className="space-y-5">
      <section className="page-section bg-[linear-gradient(120deg,rgba(14,116,144,0.08),rgba(16,185,129,0.06))]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Kanban Board</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">Execution Pipeline</h2>
        <p className="mt-2 text-sm text-slate-600">
          Drag and drop tasks between Backlog, To Do, In Progress, Review, and Done.
        </p>
        <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{status}</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Your Project Role</p>
        <p className="mt-1 text-base font-semibold text-slate-900">
          {selectedProject && myRoleInSelectedProject
            ? `${myRoleInSelectedProject} in ${selectedProject.name}`
            : 'Select a project to see your role.'}
        </p>
      </section>

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
        onCreateTask={createTaskHandler}
      />

      <TaskViewsSection
        taskViewMode={taskViewMode}
        onTaskViewModeChange={setTaskViewMode}
        tasks={tasks}
        assigneeLabelByUserId={assigneeLabelByUserId}
        workPackageLabelById={workPackageLabelById}
        dependencyLabelByTaskId={dependencyLabelByTaskId}
        assigneeOptions={assigneeOptions}
        canAssignAssignee={canAssignAssignee}
        dragTaskId={dragTaskId}
        onDragTaskIdChange={setDragTaskId}
        onMoveTaskToStatus={(taskId, status) => {
          void moveTaskToStatus(taskId, status)
        }}
        onAssignTask={(taskId, userId) => {
          void assignTaskHandler(taskId, userId)
        }}
        onDeleteTask={(taskId) => {
          void removeTask(taskId)
        }}
        onLogTime={(task) => {
          setLogTimeTask(task)
        }}
        canManageTask={canManageTask}
        canDeleteTask={canDeleteTaskInView}
        calendarMonth={calendarMonth}
        onCalendarMonthChange={setCalendarMonth}
        onShiftCalendarMonth={shiftCalendarMonth}
        calendarMeta={calendarMeta}
      />

      <TaskLogTimeModal
        isOpen={Boolean(logTimeTask)}
        taskTitle={logTimeTask?.title ?? ''}
        onClose={() => setLogTimeTask(null)}
        onSubmit={submitTaskLogTime}
        isSubmitting={isLoading}
      />
    </div>
  )
}
