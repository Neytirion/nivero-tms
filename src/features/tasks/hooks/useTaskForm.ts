import { useState } from 'react'

export function useTaskForm() {
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskPriority, setTaskPriority] = useState('medium')
  const [taskEstimateHours, setTaskEstimateHours] = useState('')
  const [taskWorkPackageId, setTaskWorkPackageId] = useState('')
  const [taskAssigneeId, setTaskAssigneeId] = useState('')
  const [taskBlockedByTaskId, setTaskBlockedByTaskId] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')

  const parsedEstimateHours = Number.parseFloat(taskEstimateHours)
  const canSubmit =
    taskTitle.trim().length > 0 &&
    taskEstimateHours.trim().length > 0 &&
    taskWorkPackageId.trim().length > 0 &&
    Number.isFinite(parsedEstimateHours) &&
    parsedEstimateHours >= 0

  const reset = () => {
    setTaskTitle('')
    setTaskDescription('')
    setTaskDueDate('')
    setTaskPriority('medium')
    setTaskEstimateHours('')
    setTaskWorkPackageId('')
    setTaskAssigneeId('')
    setTaskBlockedByTaskId('')
  }

  return {
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
  }
}
