import { useEffect, useMemo, useState } from 'react'
import { useWorkspace } from '../features/dashboard/workspace-context.tsx'
import { KANBAN_COLUMNS, type TaskStatus } from '../features/tasks/constants.ts'
import { KanbanColumn, TaskLogTimeModal } from '../features/tasks/components'
import { useTaskForm } from '../features/tasks/hooks/useTaskForm.ts'
import {
  createTimeEntry,
  getProjectTaskWorkPackages,
  hasProjectEstimateVersion,
  type TaskPreview,
  type WorkPackagePreview,
} from '../lib/pm'
import { toCanonicalTaskStatus } from '../shared/utils/task-status.ts'

function normalizeStatus(value: string | null | undefined): TaskStatus {
  return toCanonicalTaskStatus(value)
}

function getPriorityBadgeClass(priority: string | null | undefined) {
  const normalized = (priority ?? 'medium').toLowerCase()

  if (normalized === 'high') {
    return 'bg-rose-100 text-rose-800 border border-rose-200'
  }

  if (normalized === 'low') {
    return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
  }

  return 'bg-amber-100 text-amber-800 border border-amber-200'
}

type TaskViewMode = 'list' | 'board' | 'calendar'

export function TasksPage() {
  const {
    taskTitle,
    setTaskTitle,
    taskDescription,
    setTaskDescription,
    taskPriority,
    setTaskPriority,
    taskEstimateHours,
    setTaskEstimateHours,
    taskWorkPackageId,
    setTaskWorkPackageId,
    taskAssigneeId,
    setTaskAssigneeId,
    taskBlockedByTaskId,
    setTaskBlockedByTaskId,
    taskDueDate,
    setTaskDueDate,
    canSubmit,
    reset,
  } = useTaskForm()
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [logTimeTask, setLogTimeTask] = useState<TaskPreview | null>(null)
  const [workPackages, setWorkPackages] = useState<Array<Pick<WorkPackagePreview, 'id' | 'name' | 'estimated_hours'>>>([])
  const [hasEstimateVersion, setHasEstimateVersion] = useState<boolean | null>(null)
  const [taskViewMode, setTaskViewMode] = useState<TaskViewMode>('board')
  const [calendarMonth, setCalendarMonth] = useState(new Date().toISOString().slice(0, 7))

  const {
    status,
    setStatus,
    isLoading,
    projects,
    tasks,
    projectMembers,
    selectedProjectId,
    getProjectRole,
    selectProject,
    addTask,
    editTask,
    removeTask,
    canAssignTasksInProject,
    canManageTask,
    canDeleteTask,
  } = useWorkspace()

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )
  const myRoleInSelectedProject = selectedProject ? getProjectRole(selectedProject.id) : null
  const isMemberInSelectedProject = myRoleInSelectedProject === 'member'
  const projectStartDate = selectedProject?.start_date ?? ''
  const projectEndDate = selectedProject?.end_date ?? ''
  const parsedEstimateHours = Number.parseFloat(taskEstimateHours)
  const isProjectMissing = !selectedProjectId
  const isTaskTitleMissing = taskTitle.trim().length === 0
  const isEstimateHoursMissingOrInvalid =
    taskEstimateHours.trim().length === 0 || !Number.isFinite(parsedEstimateHours) || parsedEstimateHours < 0
  const isWorkPackageMissing = taskWorkPackageId.trim().length === 0
  const missingRequiredFields = useMemo(() => {
    const fields: string[] = []

    if (isProjectMissing) {
      fields.push('Project')
    }

    if (isTaskTitleMissing) {
      fields.push('Task title')
    }

    if (isEstimateHoursMissingOrInvalid) {
      fields.push('Estimated hours')
    }

    if (isWorkPackageMissing) {
      fields.push('Work package')
    }

    return fields
  }, [isEstimateHoursMissingOrInvalid, isProjectMissing, isTaskTitleMissing, isWorkPackageMissing])

  useEffect(() => {
    const loadWorkPackages = async () => {
      if (!selectedProjectId) {
        setWorkPackages([])
        setTaskWorkPackageId('')
        setHasEstimateVersion(null)
        return
      }

      setHasEstimateVersion(null)

      try {
        const [nextWorkPackages, hasVersion] = await Promise.all([
          getProjectTaskWorkPackages(selectedProjectId),
          hasProjectEstimateVersion(selectedProjectId),
        ])
        setWorkPackages(nextWorkPackages)
        setHasEstimateVersion(hasVersion)
        setTaskWorkPackageId((prev) =>
          nextWorkPackages.some((item: Pick<WorkPackagePreview, 'id' | 'name' | 'estimated_hours'>) => item.id === prev)
            ? prev
            : '',
        )
      } catch {
        setWorkPackages([])
        setHasEstimateVersion(false)
        setTaskWorkPackageId('')
      }
    }

    void loadWorkPackages()
  }, [selectedProjectId, setTaskWorkPackageId])

  const createTaskHandler = async () => {
    if (!selectedProjectId) {
      setStatus('Select a project before creating tasks')
      return
    }

    if (hasEstimateVersion === null) {
      setStatus('Checking estimate version...')
      return
    }

    if (!hasEstimateVersion) {
      setStatus(
        isMemberInSelectedProject
          ? 'Estimate version is not created yet. Task creation is unavailable.'
          : 'Create estimate version v1 first before creating tasks',
      )
      return
    }

    if (!canSubmit) {
      setStatus('Task title, estimated hours, and work package are required')
      return
    }

    if (isWorkPackageMissing) {
      setStatus('Work package is required')
      return
    }

    const estimateHours = Number.parseFloat(taskEstimateHours)
    if (!Number.isFinite(estimateHours) || estimateHours < 0) {
      setStatus('Estimated hours must be a number greater than or equal to 0')
      return
    }

    if (taskDueDate) {
      if (projectStartDate && taskDueDate < projectStartDate) {
        setStatus('Due date must be within project dates')
        return
      }
      if (projectEndDate && taskDueDate > projectEndDate) {
        setStatus('Due date must be within project dates')
        return
      }
    }

    await addTask({
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      status: 'backlog',
      priority: taskPriority,
      estimateHours,
      workPackageId: taskWorkPackageId,
      assignedTo: canAssignAssignee ? taskAssigneeId || undefined : undefined,
      blockedByTaskId: taskBlockedByTaskId || undefined,
      dueDate: taskDueDate || undefined,
    })

    reset()
  }

  const moveTaskToStatus = async (taskId: string, status: TaskStatus) => {
    await editTask(taskId, { status })
  }

  const submitTaskLogTime = async (hours: number, comment: string) => {
    if (!logTimeTask || !selectedProjectId) {
      setStatus('Select project and task before logging time')
      return
    }

    if (!Number.isFinite(hours) || hours <= 0) {
      setStatus('Hours must be a number greater than 0')
      return
    }

    await createTimeEntry({
      projectId: selectedProjectId,
      taskId: logTimeTask.id,
      entryDate: new Date().toISOString().slice(0, 10),
      hoursSpent: hours,
      isBillable: true,
      category: 'delivery',
      notes: comment,
    })

    await selectProject(selectedProjectId)
    setStatus(`Time logged for task: ${logTimeTask.title}`)
    setLogTimeTask(null)
  }

  const assigneeLabelByUserId = projectMembers.reduce<Record<string, string>>((acc, member) => {
    if (member.user_id) {
      const name = member.full_name || member.email || member.user_id
      acc[member.user_id] = name
    }
    return acc
  }, {})
  const dependencyLabelByTaskId = tasks.reduce<Record<string, string>>((acc, task) => {
    acc[task.id] = task.title
    return acc
  }, {})
  const assigneeOptions = projectMembers
    .filter((member) => Boolean(member.user_id))
    .map((member) => ({
      userId: member.user_id as string,
      label: member.full_name || member.email || (member.user_id as string),
    }))
  const canAssignAssignee = selectedProject ? canAssignTasksInProject(selectedProject.id) : false
  const dependencyOptions = useMemo(
    () => tasks.map((task) => ({ id: task.id, label: task.title })),
    [tasks],
  )

  const shiftCalendarMonth = (direction: -1 | 1) => {
    const [yearText, monthText] = calendarMonth.split('-')
    const year = Number.parseInt(yearText, 10)
    const month = Number.parseInt(monthText, 10)

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return
    }

    const nextDate = new Date(year, month - 1 + direction, 1)
    const nextYear = nextDate.getFullYear()
    const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0')
    setCalendarMonth(`${nextYear}-${nextMonth}`)
  }

  const calendarMeta = useMemo(() => {
    const [yearText, monthText] = calendarMonth.split('-')
    const year = Number.parseInt(yearText, 10)
    const month = Number.parseInt(monthText, 10)

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return null
    }

    const firstDay = new Date(year, month - 1, 1)
    const daysInMonth = new Date(year, month, 0).getDate()
    const firstWeekday = firstDay.getDay()
    const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7

    const tasksByDate = tasks.reduce<Record<string, TaskPreview[]>>((acc, task) => {
      if (!task.due_date) {
        return acc
      }
      const dueKey = task.due_date.slice(0, 10)
      if (!dueKey.startsWith(calendarMonth)) {
        return acc
      }
      acc[dueKey] = [...(acc[dueKey] ?? []), task]
      return acc
    }, {})

    const cells = Array.from({ length: cellCount }, (_, index) => {
      const dayNumber = index - firstWeekday + 1
      if (dayNumber < 1 || dayNumber > daysInMonth) {
        return null
      }

      const dateKey = `${calendarMonth}-${String(dayNumber).padStart(2, '0')}`
      return {
        dayNumber,
        dateKey,
        tasks: tasksByDate[dateKey] ?? [],
      }
    })

    return {
      cells,
      monthTitle: firstDay.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    }
  }, [calendarMonth, tasks])

  const assignTaskHandler = async (taskId: string, userId: string) => {
    if (!canAssignAssignee) {
      return
    }

    await editTask(taskId, {
      assignedTo: userId || undefined,
    })
  }

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

      <section className="page-section bg-slate-50/70">
        <h3 className="section-title">Create Task</h3>
        <p className="section-subtitle">Add task metadata before placing it on the board.</p>
        <p className="mt-2 text-[11px] text-slate-500">Fields marked with * are required.</p>

        {hasEstimateVersion === false && selectedProjectId ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {isMemberInSelectedProject
              ? 'Estimate version is not created yet. Task creation is unavailable.'
              : 'Create estimate version v1 in Project Details → Estimates before creating tasks.'}
          </p>
        ) : null}

        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Core</p>
            <div className="mt-2 space-y-2.5">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Project *
                </label>
                <select
                  value={selectedProjectId ?? ''}
                  onChange={(event) => {
                    if (event.target.value) {
                      void selectProject(event.target.value)
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
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Task title *
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(event) => setTaskTitle(event.target.value)}
                  placeholder="Short task name"
                  className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 ${
                    isTaskTitleMissing ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Description
                </label>
                <input
                  type="text"
                  value={taskDescription}
                  onChange={(event) => setTaskDescription(event.target.value)}
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
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Estimated hours *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={taskEstimateHours}
                  onChange={(event) => setTaskEstimateHours(event.target.value)}
                  placeholder="e.g. 6"
                  className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 ${
                    isEstimateHoursMissingOrInvalid ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Priority
                </label>
                <select
                  value={taskPriority}
                  onChange={(event) => setTaskPriority(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Due date
                </label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(event) => setTaskDueDate(event.target.value)}
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
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Work Package *
                </label>
                <select
                  value={taskWorkPackageId}
                  onChange={(event) => setTaskWorkPackageId(event.target.value)}
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
                    No active work packages found. Add packages in Project Details → Estimates.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Blocked by task
                </label>
                <select
                  value={taskBlockedByTaskId}
                  onChange={(event) => setTaskBlockedByTaskId(event.target.value)}
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
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Assignee
                  </label>
                  <select
                    value={taskAssigneeId}
                    onChange={(event) => setTaskAssigneeId(event.target.value)}
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
            onClick={createTaskHandler}
            disabled={!selectedProjectId || hasEstimateVersion !== true || !canSubmit || missingRequiredFields.length > 0 || isLoading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Create task
          </button>
        </div>
      </section>

      <section className="page-section">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="section-title">Task Views</h3>
          <div className="flex items-center gap-2">
            {([
              { key: 'list', label: 'List' },
              { key: 'board', label: 'Board' },
              { key: 'calendar', label: 'Calendar' },
            ] as const).map((view) => (
              <button
                key={view.key}
                type="button"
                onClick={() => setTaskViewMode(view.key)}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                  taskViewMode === view.key
                    ? 'border-cyan-300 bg-cyan-100 text-cyan-900'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>

        {taskViewMode === 'board' ? (
          <>
            <p className="mb-3 text-xs text-slate-500">Drag card to change task status</p>
            <div className="grid gap-4 xl:grid-cols-5">
              {KANBAN_COLUMNS.map((column) => {
                const columnTasks = tasks.filter((task) => normalizeStatus(task.status) === column.key)

                return (
                  <KanbanColumn
                    key={column.key}
                    status={column.key}
                    label={column.label}
                    tasks={columnTasks}
                    assigneeLabelByUserId={assigneeLabelByUserId}
                    dependencyLabelByTaskId={dependencyLabelByTaskId}
                    assigneeOptions={assigneeOptions}
                    canAssignAssignee={canAssignAssignee}
                    onDragOver={(event) => event.preventDefault()}
                    onDropTask={(status) => {
                      if (dragTaskId) {
                        void moveTaskToStatus(dragTaskId, status)
                      }
                      setDragTaskId(null)
                    }}
                    onAssignTask={assignTaskHandler}
                    onDeleteTask={(taskId) => void removeTask(taskId)}
                    onDragTaskStart={setDragTaskId}
                    onLogTime={setLogTimeTask}
                    canManageTask={canManageTask}
                    canDeleteTask={canDeleteTask}
                  />
                )
              })}
            </div>
          </>
        ) : null}

        {taskViewMode === 'list' ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full bg-white text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Task</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Priority</th>
                  <th className="px-3 py-2 text-left">Assignee</th>
                  <th className="px-3 py-2 text-left">Dependency</th>
                  <th className="px-3 py-2 text-left">Due date</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-slate-500">
                      No tasks yet
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-800">{task.title}</td>
                      <td className="px-3 py-2 text-slate-600">{task.status ?? 'todo'}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${getPriorityBadgeClass(
                            task.priority,
                          )}`}
                        >
                          {task.priority ?? 'medium'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {task.assigned_to
                          ? assigneeLabelByUserId[task.assigned_to] ?? task.assigned_to
                          : task.created_by
                            ? `${assigneeLabelByUserId[task.created_by] ?? task.created_by} (creator)`
                            : 'Unassigned'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {task.blocked_by_task_id
                          ? dependencyLabelByTaskId[task.blocked_by_task_id] ?? task.blocked_by_task_id
                          : 'None'}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {taskViewMode === 'calendar' ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => shiftCalendarMonth(-1)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  aria-label="Previous month"
                >
                  ←
                </button>
                <p className="text-sm font-semibold text-slate-900 min-w-[140px] text-center">
                  {calendarMeta?.monthTitle ?? 'Calendar'}
                </p>
                <button
                  type="button"
                  onClick={() => shiftCalendarMonth(1)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  aria-label="Next month"
                >
                  →
                </button>
              </div>
              <input
                type="month"
                value={calendarMonth}
                onChange={(event) => setCalendarMonth(event.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800 outline-none focus:border-slate-500"
              />
            </div>

            <div className="grid grid-cols-7 gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <p>Sun</p>
              <p>Mon</p>
              <p>Tue</p>
              <p>Wed</p>
              <p>Thu</p>
              <p>Fri</p>
              <p>Sat</p>
            </div>

            <div className="mt-2 grid grid-cols-7 gap-2">
              {calendarMeta?.cells.map((cell, index) => (
                <div
                  key={`${cell?.dateKey ?? 'blank'}-${index}`}
                  className={`min-h-[96px] rounded-lg border p-2 ${
                    cell ? 'border-slate-200 bg-slate-50' : 'border-transparent bg-transparent'
                  }`}
                >
                  {cell ? (
                    <>
                      <p className="text-xs font-semibold text-slate-700">{cell.dayNumber}</p>
                      <div className="mt-1 space-y-1">
                        {cell.tasks.slice(0, 3).map((task) => (
                          <div
                            key={task.id}
                            className={`rounded bg-white px-1.5 py-1 text-[10px] border ${getPriorityBadgeClass(task.priority)}`}
                            title={`${task.title}${
                              task.blocked_by_task_id
                                ? ` | Blocked by: ${
                                    dependencyLabelByTaskId[task.blocked_by_task_id] ?? task.blocked_by_task_id
                                  }`
                                : ''
                            }`}
                          >
                            {task.title}
                          </div>
                        ))}
                        {cell.tasks.length > 3 ? (
                          <p className="text-[10px] text-slate-500">+{cell.tasks.length - 3} more</p>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
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
