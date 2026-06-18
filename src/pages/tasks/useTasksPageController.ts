import { useEffect, useMemo, useState } from 'react'
import { useTaskForm } from '../../features/tasks/hooks/useTaskForm.ts'
import {
  type TaskPreview,
} from '../../lib/pm'
import { useWorkspace } from '../../features/dashboard/workspace-context.tsx'
import { useTaskCalendarMeta } from './useTaskCalendarMeta'
import { useTaskControllerActions } from './useTaskControllerActions'
import { useTaskCreationRequirements } from './useTaskCreationRequirements'
import { useTaskWorkPackagesLoader } from './useTaskWorkPackagesLoader'
import type { TaskViewMode } from './index'

export function useTasksPageController() {
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
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
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

  const { workPackages, hasEstimateVersion } = useTaskWorkPackagesLoader({
    selectedProjectId,
    setTaskWorkPackageId,
  })

  const {
    isProjectMissing,
    isTaskTitleMissing,
    isEstimateHoursMissingOrInvalid,
    isWorkPackageMissing,
    missingRequiredFields,
  } = useTaskCreationRequirements({
    selectedProjectId,
    taskTitle,
    taskEstimateHours,
    taskWorkPackageId,
  })

  const canDeleteTaskInView = (task: TaskPreview) => {
    if (isMemberInSelectedProject) {
      return false
    }

    return canDeleteTask(task)
  }

  const projectStartDate = selectedProject?.start_date ?? ''
  const projectEndDate = selectedProject?.end_date ?? ''

  useEffect(() => {
    if (!selectedProjectId) {
      return
    }

    void selectProject(selectedProjectId)
    // Intentionally track selected project only to refresh tasks/members snapshot on page entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId])

  const canAssignAssignee = selectedProject ? canAssignTasksInProject(selectedProject.id) : false

  const { createTaskHandler, moveTaskToStatus, assignTaskHandler, submitTaskLogTime } =
    useTaskControllerActions({
      selectedProjectId,
      hasEstimateVersion,
      isMemberInSelectedProject,
      canSubmit,
      isWorkPackageMissing,
      taskEstimateHours,
      taskDueDate,
      projectStartDate,
      projectEndDate,
      taskTitle,
      taskDescription,
      taskPriority,
      taskWorkPackageId,
      canAssignAssignee,
      taskAssigneeId,
      taskBlockedByTaskId,
      reset,
      addTask,
      editTask,
      setStatus,
      setHasAttemptedSubmit,
      logTimeTask,
      setLogTimeTask,
      selectProject,
    })

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

  const dependencyOptions = useMemo(
    () => tasks.map((task) => ({ id: task.id, label: task.title })),
    [tasks],
  )

  const { calendarMeta, shiftCalendarMonthValue } = useTaskCalendarMeta({
    calendarMonth,
    tasks,
  })

  const shiftCalendarMonth = (direction: -1 | 1) => {
    setCalendarMonth((prev) => shiftCalendarMonthValue(prev, direction))
  }

  return {
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
  }
}
