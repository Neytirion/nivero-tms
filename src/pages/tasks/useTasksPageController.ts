import { useEffect, useMemo, useRef, useState } from 'react'
import { useTaskForm } from '../../features/tasks/hooks/useTaskForm.ts'
import type { TaskStatus } from '../../features/tasks/constants.ts'
import {
  type TaskPreview,
} from '../../lib/pm'
import { useWorkspace } from '../../features/dashboard/workspace-context.tsx'
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
    canSubmit: baseCanSubmit,
    reset,
  } = useTaskForm()

  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [logTimeTask, setLogTimeTask] = useState<TaskPreview | null>(null)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [taskViewMode, setTaskViewMode] = useState<TaskViewMode>('board')
  const [optimisticStatusByTaskId, setOptimisticStatusByTaskId] = useState<Record<string, TaskStatus>>({})
  const optimisticResetTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const {
    status,
    setStatus,
    isLoading,
    projects,
    tasks,
    projectMembers,
    selectedProjectId,
    getProjectRole,
    currentUserProfile,
    selectProject,
    addTask,
    editTask,
    removeTask,
    canAssignTasksInProject,
    canManageTask,
    canDeleteTask,
    reloadCurrentTasks,
    hasMoreTasks,
    tasksTotalCount,
    loadMoreTasks,
  } = useWorkspace()

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )
  const myRoleInSelectedProject = selectedProject ? getProjectRole(selectedProject.id) : null
  const isMemberInSelectedProject = myRoleInSelectedProject === 'member'

  const { workPackages, hasEstimateVersion, useEstimates } = useTaskWorkPackagesLoader({
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
    useEstimates,
    taskTitle,
    taskEstimateHours,
    taskWorkPackageId,
  })

  const canSubmit = useEstimates ? baseCanSubmit : taskTitle.trim().length > 0

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

  const { createTaskHandler, moveTaskToStatus: moveTaskToStatusRemote, assignTaskHandler, updateTaskDueDateHandler, submitTaskLogTime } =
    useTaskControllerActions({
      selectedProjectId,
      useEstimates,
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
      reloadCurrentTasks,
    })

  const tasksWithOptimisticStatus = useMemo(
    () => tasks.map((task) => {
      const optimisticStatus = optimisticStatusByTaskId[task.id]
      if (!optimisticStatus || optimisticStatus === task.status) {
        return task
      }

      return {
        ...task,
        status: optimisticStatus,
      }
    }),
    [tasks, optimisticStatusByTaskId],
  )

  useEffect(() => {
    return () => {
      Object.values(optimisticResetTimersRef.current).forEach((timerId) => {
        clearTimeout(timerId)
      })
      optimisticResetTimersRef.current = {}
    }
  }, [])

  const moveTaskToStatus = async (taskId: string, status: TaskStatus) => {
    setOptimisticStatusByTaskId((prev) => ({
      ...prev,
      [taskId]: status,
    }))

    const existingTimer = optimisticResetTimersRef.current[taskId]
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    optimisticResetTimersRef.current[taskId] = setTimeout(() => {
      setOptimisticStatusByTaskId((prev) => {
        const next = { ...prev }
        delete next[taskId]
        return next
      })
      delete optimisticResetTimersRef.current[taskId]
    }, 3000)

    await moveTaskToStatusRemote(taskId, status)
  }

  const assigneeLabelByUserId = projectMembers.reduce<Record<string, string>>((acc, member) => {
    if (member.user_id) {
      const name = member.full_name || member.email || member.user_id
      acc[member.user_id] = name
    }
    return acc
  }, {})
  const assigneeAvatarUrlByUserId = projectMembers.reduce<Record<string, string>>((acc, member) => {
    if (member.user_id && member.avatar_url) {
      acc[member.user_id] = member.avatar_url
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
    () => tasksWithOptimisticStatus.map((task) => ({ id: task.id, label: task.title })),
    [tasksWithOptimisticStatus],
  )

  const resetPageState = () => {
    reset()
    setTaskViewMode('board')
    setDragTaskId(null)
    setLogTimeTask(null)
    setHasAttemptedSubmit(false)
  }

  return {
    status,
    isLoading,
    selectedProject,
    selectedProjectId,
    currentUserProfile,
    myRoleInSelectedProject,
    isMemberInSelectedProject,
    projects,
    tasks: tasksWithOptimisticStatus,
    projectMembers,
    hasEstimateVersion,
    useEstimates,
    taskViewMode,
    setTaskViewMode,
    dragTaskId,
    setDragTaskId,
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
    taskWorkPackageId,
    setTaskWorkPackageId,
    taskBlockedByTaskId,
    setTaskBlockedByTaskId,
    taskAssigneeId,
    setTaskAssigneeId,
    workPackages,
    dependencyOptions,
    assigneeLabelByUserId,
    assigneeAvatarUrlByUserId,
    dependencyLabelByTaskId,
    workPackageLabelById,
    assigneeOptions,
    canSubmit,
    logTimeTask,
    setLogTimeTask,
    createTaskHandler,
    moveTaskToStatus,
    assignTaskHandler,
    updateTaskDueDateHandler,
    removeTask,
    submitTaskLogTime,
    selectProject,
    hasMoreTasks,
    tasksTotalCount,
    loadMoreTasks,
    resetPageState,
    editTask,
  }
}
