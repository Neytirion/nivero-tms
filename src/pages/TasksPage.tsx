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

  const visibleProjectMembers = selectedProject ? projectMembers : []

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

      <section className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium tracking-[0.12em] text-slate-500">Project Members</p>
          {selectedProject ? (
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-500">
              {visibleProjectMembers.length}
            </span>
          ) : null}
        </div>

        {!selectedProject ? (
          <p className="mt-1 text-xs text-slate-500">Select a project to see members.</p>
        ) : visibleProjectMembers.length === 0 ? (
          <p className="mt-1 text-xs text-slate-500">No members found in this project yet.</p>
        ) : (
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {visibleProjectMembers.map((member) => {
              const memberName = member.full_name || member.email || member.user_id || 'Unknown member'

              return (
                <li key={member.member_id} className="rounded-md border border-slate-200 bg-white/80 px-2.5 py-1.5">
                  <p className="text-xs font-medium text-slate-700">{memberName}</p>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">{member.role}</p>
                </li>
              )
            })}
          </ul>
        )}
      </section>

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
