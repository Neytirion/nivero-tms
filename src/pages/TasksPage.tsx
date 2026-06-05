import { useEffect, useMemo, useState } from 'react'
import { useWorkspace } from '../features/dashboard/workspace-context.tsx'
import { KANBAN_COLUMNS, type TaskStatus } from '../features/tasks/constants.ts'
import { KanbanColumn, TaskLogTimeModal } from '../features/tasks/components'
import { useTaskForm } from '../features/tasks/hooks/useTaskForm.ts'
import { createTimeEntry, getProjectTaskWorkPackages, type TaskPreview, type WorkPackagePreview } from '../lib/pm'
import { toCanonicalTaskStatus } from '../shared/utils/task-status.ts'

function normalizeStatus(value: string | null | undefined): TaskStatus {
  return toCanonicalTaskStatus(value)
}

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
    taskDueDate,
    setTaskDueDate,
    canSubmit,
    reset,
  } = useTaskForm()
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [logTimeTask, setLogTimeTask] = useState<TaskPreview | null>(null)
  const [workPackages, setWorkPackages] = useState<Array<Pick<WorkPackagePreview, 'id' | 'name' | 'estimated_hours'>>>([])

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

  useEffect(() => {
    const loadWorkPackages = async () => {
      if (!selectedProjectId) {
        setWorkPackages([])
        setTaskWorkPackageId('')
        return
      }

      try {
        const nextWorkPackages = await getProjectTaskWorkPackages(selectedProjectId)
        setWorkPackages(nextWorkPackages)
        setTaskWorkPackageId((prev) => (nextWorkPackages.some((item) => item.id === prev) ? prev : ''))
      } catch {
        setWorkPackages([])
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

    if (!canSubmit) {
      setStatus('Task title and estimate hours are required')
      return
    }

    const estimateHours = Number.parseFloat(taskEstimateHours)
    if (!Number.isFinite(estimateHours) || estimateHours < 0) {
      setStatus('Estimated hours must be a number greater than or equal to 0')
      return
    }

    await addTask({
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      status: 'backlog',
      priority: taskPriority,
      estimateHours,
      workPackageId: taskWorkPackageId || undefined,
      assignedTo: canAssignAssignee ? taskAssigneeId || undefined : undefined,
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

        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Core</p>
            <div className="mt-2 space-y-2.5">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Project
                </label>
                <select
                  value={selectedProjectId ?? ''}
                  onChange={(event) => {
                    if (event.target.value) {
                      void selectProject(event.target.value)
                    }
                  }}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
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
                  Task title
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(event) => setTaskTitle(event.target.value)}
                  placeholder="Short task name"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
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
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
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
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assignment & Scope</p>
            <div className="mt-2 space-y-2.5">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Work Package
                </label>
                <select
                  value={taskWorkPackageId}
                  onChange={(event) => setTaskWorkPackageId(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
                >
                  <option value="">Unlinked</option>
                  {workPackages.map((workPackage) => (
                    <option key={workPackage.id} value={workPackage.id}>
                      {workPackage.name}
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
          <p className="text-xs text-slate-500">
            {selectedProject ? `Selected project: ${selectedProject.name}` : 'Select a project first.'}
          </p>
          <button
            type="button"
            onClick={createTaskHandler}
            disabled={!selectedProjectId || !canSubmit || isLoading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Create task
          </button>
        </div>
      </section>

      <section className="page-section">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="section-title">Board</h3>
          <p className="text-xs text-slate-500">Drag card to change task status</p>
        </div>

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
