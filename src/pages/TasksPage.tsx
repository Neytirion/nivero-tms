import { useEffect, useMemo, useState } from 'react'
import { useWorkspace } from '../features/dashboard/workspace-context.tsx'
import type { TaskStatus } from '../features/tasks/constants.ts'
import { TaskLogTimeModal } from '../features/tasks/components'
import { useTaskForm } from '../features/tasks/hooks/useTaskForm.ts'
import {
  createTimeEntry,
  getProjectTaskWorkPackages,
  hasProjectEstimateVersion,
  type TaskPreview,
  type WorkPackagePreview,
} from '../lib/pm'
import { buildCalendarMeta, shiftMonthValue } from './tasks-page.utils'
import { CreateTaskSection, TaskViewsSection, type TaskViewMode } from './tasks'

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
  const canDeleteTaskInView = (task: TaskPreview) => {
    if (isMemberInSelectedProject) {
      return false
    }

    return canDeleteTask(task)
  }
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

  useEffect(() => {
    if (!selectedProjectId) {
      return
    }

    void selectProject(selectedProjectId)
    // Intentionally track selected project only to refresh tasks/members snapshot on page entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId])

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
  const workPackageLabelById = workPackages.reduce<Record<string, string>>((acc, workPackage) => {
    acc[workPackage.id] = workPackage.name
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
    setCalendarMonth((prev) => shiftMonthValue(prev, direction))
  }

  const calendarMeta = useMemo(() => {
    return buildCalendarMeta(calendarMonth, tasks)
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
