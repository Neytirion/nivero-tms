import { useState } from 'react'
import {
  type ParsedAttachment,
  type ParsedClientIntakePayload,
  formatClientIntakePayload,
} from '../utils/client-intake.utils'

interface TaskEditPatch {
  title?: string
  description?: string
  status?: string
  priority?: string
  estimateHours?: number
  dueDate?: string
}

interface TaskSnapshot {
  id: string
  title: string
  description?: string | null
  status?: string | null
  priority?: string | null
  due_date?: string | null
  estimate_hours?: number | null
}

interface UseTaskDetailsEditStateInput {
  task: TaskSnapshot
  clientIntakePayload: ParsedClientIntakePayload | null
  descriptionText: string
  canEditTask: boolean
  canEditDescription: boolean
  canEditClientRequest: boolean
  canEditEstimateHours: boolean
  editTask: (taskId: string, patch: TaskEditPatch) => Promise<void>
}

export function useTaskDetailsEditState({
  task,
  clientIntakePayload,
  descriptionText,
  canEditTask,
  canEditDescription,
  canEditClientRequest,
  canEditEstimateHours,
  editTask,
}: UseTaskDetailsEditStateInput) {
  const [isTaskEditing, setIsTaskEditing] = useState(false)
  const [isTaskSaving, setIsTaskSaving] = useState(false)
  const [titleDraft, setTitleDraft] = useState(task.title)
  const [descriptionDraft, setDescriptionDraft] = useState(descriptionText)
  const [taskStatusDraft, setTaskStatusDraft] = useState(task.status ?? 'todo')
  const [taskPriorityDraft, setTaskPriorityDraft] = useState(task.priority ?? 'medium')
  const [taskDueDateDraft, setTaskDueDateDraft] = useState(task.due_date?.slice(0, 10) ?? '')
  const [estimateHoursDraft, setEstimateHoursDraft] = useState(String(task.estimate_hours ?? 0))
  const [clientNameDraft, setClientNameDraft] = useState(clientIntakePayload?.clientName ?? '')
  const [clientEmailDraft, setClientEmailDraft] = useState(clientIntakePayload?.clientEmail ?? '')
  const [clientRequestDetailsDraft, setClientRequestDetailsDraft] = useState(clientIntakePayload?.requestDetails ?? '')
  const [clientAttachmentsDraft, setClientAttachmentsDraft] = useState<ParsedAttachment[]>(
    clientIntakePayload?.attachments ?? [],
  )

  const resetDrafts = () => {
    setTitleDraft(task.title)
    setDescriptionDraft(descriptionText)
    setTaskStatusDraft(task.status ?? 'todo')
    setTaskPriorityDraft(task.priority ?? 'medium')
    setTaskDueDateDraft(task.due_date?.slice(0, 10) ?? '')
    setEstimateHoursDraft(String(task.estimate_hours ?? 0))
    setClientNameDraft(clientIntakePayload?.clientName ?? '')
    setClientEmailDraft(clientIntakePayload?.clientEmail ?? '')
    setClientRequestDetailsDraft(clientIntakePayload?.requestDetails ?? '')
    setClientAttachmentsDraft(clientIntakePayload?.attachments ?? [])
  }

  const startEditing = () => {
    if (!canEditTask) return
    resetDrafts()
    setIsTaskEditing(true)
  }

  const cancelEditing = () => {
    resetDrafts()
    setIsTaskEditing(false)
  }

  const saveEdits = async (taskId: string) => {
    if (!canEditTask) {
      setIsTaskEditing(false)
      return
    }

    const nextTitle = titleDraft.trim()
    if (!nextTitle) return

    if (!canEditDescription) {
      setIsTaskEditing(false)
      return
    }

    const patch: TaskEditPatch = {}

    if (nextTitle !== task.title) patch.title = nextTitle

    if (clientIntakePayload) {
      const nextPayload: ParsedClientIntakePayload = { ...clientIntakePayload, internalDescription: descriptionDraft }
      if (canEditClientRequest) {
        nextPayload.clientName = clientNameDraft.trim() || null
        nextPayload.clientEmail = clientEmailDraft.trim() || null
        nextPayload.requestDetails = clientRequestDetailsDraft
        nextPayload.attachments = clientAttachmentsDraft
      }
      const composed = formatClientIntakePayload(nextPayload)
      if (composed !== (task.description ?? '')) patch.description = composed
    } else if (descriptionDraft !== (task.description ?? '')) {
      patch.description = descriptionDraft
    }

    if (taskStatusDraft !== (task.status ?? 'todo')) patch.status = taskStatusDraft
    if (taskPriorityDraft !== (task.priority ?? 'medium')) patch.priority = taskPriorityDraft

    const currentDueDate = task.due_date?.slice(0, 10) ?? ''
    if (taskDueDateDraft !== currentDueDate) patch.dueDate = taskDueDateDraft || undefined

    if (canEditEstimateHours) {
      const parsed = Number.parseFloat(estimateHoursDraft.trim())
      if (!Number.isFinite(parsed) || parsed < 0) return
      if (parsed !== (task.estimate_hours ?? 0)) patch.estimateHours = parsed
    }

    if (Object.keys(patch).length === 0) {
      setIsTaskEditing(false)
      return
    }

    setIsTaskSaving(true)
    try {
      await editTask(taskId, patch)
      setIsTaskEditing(false)
    } finally {
      setIsTaskSaving(false)
    }
  }

  const removeClientAttachment = (urlToRemove: string) => {
    setClientAttachmentsDraft((prev) => prev.filter((a) => a.url !== urlToRemove))
  }

  return {
    isTaskEditing,
    isTaskSaving,
    titleDraft,
    setTitleDraft,
    descriptionDraft,
    setDescriptionDraft,
    taskStatusDraft,
    setTaskStatusDraft,
    taskPriorityDraft,
    setTaskPriorityDraft,
    taskDueDateDraft,
    setTaskDueDateDraft,
    estimateHoursDraft,
    setEstimateHoursDraft,
    clientNameDraft,
    setClientNameDraft,
    clientEmailDraft,
    setClientEmailDraft,
    clientRequestDetailsDraft,
    setClientRequestDetailsDraft,
    clientAttachmentsDraft,
    startEditing,
    cancelEditing,
    saveEdits,
    removeClientAttachment,
  }
}
