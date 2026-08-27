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
  const [taskIsBillable, setTaskIsBillable] = useState(true)

  const canSubmit = taskTitle.trim().length > 0

  const reset = () => {
    setTaskTitle('')
    setTaskDescription('')
    setTaskDueDate('')
    setTaskPriority('medium')
    setTaskEstimateHours('')
    setTaskWorkPackageId('')
    setTaskAssigneeId('')
    setTaskBlockedByTaskId('')
    setTaskIsBillable(true)
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
    taskIsBillable,
    setTaskIsBillable,
    canSubmit,
    reset,
  }
}
