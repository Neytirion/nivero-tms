import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTasksPageController } from './useTasksPageController'
import { useEffect, useMemo, useState } from 'react'
import { TaskLogTimeModal } from '../../features/tasks/components'
import { TaskCommentsPanel } from '../../features/tasks/components/comments'
import { ConfirmDialog, UserProfileDialog, type UserProfilePreview } from '../../shared/components'

const TASK_DESCRIPTION_MAX_LENGTH = 250
const TASK_TITLE_MAX_LENGTH = 120

type ParsedAttachment = {
  name: string
  url: string
  isImage: boolean
}

type ParsedClientIntakePayload = {
  clientName: string | null
  clientEmail: string | null
  requestDetails: string
  attachments: ParsedAttachment[]
  internalDescription: string
}

function normalizeAttachmentUrl(value: string) {
  return value.trim().replace(/[),.;]+$/g, '')
}

function isImageAttachmentUrl(url: string) {
  const normalized = url.split('?')[0].toLowerCase()
  return /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif)$/.test(normalized)
}

function parseAttachmentLine(line: string): { name: string; url: string } | null {
  const namedPattern = /^\s*(?:\d+\.\s*)?(.+?)\s*\|\s*(https?:\/\/\S+)\s*$/i
  const namedMatch = line.match(namedPattern)
  if (namedMatch) {
    const name = namedMatch[1].trim()
    const url = normalizeAttachmentUrl(namedMatch[2])
    if (url) {
      return {
        name: name.length > 0 ? name : 'Attachment',
        url,
      }
    }
  }

  const legacyPattern = /^\s*(?:\d+\.\s*)?(https?:\/\/\S+)\s*$/i
  const legacyMatch = line.match(legacyPattern)
  if (legacyMatch) {
    const url = normalizeAttachmentUrl(legacyMatch[1])
    if (url) {
      return {
        name: 'Attachment',
        url,
      }
    }
  }

  return null
}

function extractClientAttachments(description: string | null | undefined): ParsedAttachment[] {
  if (!description) {
    return []
  }

  const lines = description.split('\n')
  const attachments: ParsedAttachment[] = []
  let inAttachmentsSection = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (/^attachments:?$/i.test(trimmed)) {
      inAttachmentsSection = true
      continue
    }

    if (!inAttachmentsSection) {
      continue
    }

    if (trimmed.length === 0) {
      continue
    }

    const parsed = parseAttachmentLine(trimmed)
    if (!parsed) {
      inAttachmentsSection = false
      continue
    }

    attachments.push({
      name: parsed.name,
      url: parsed.url,
      isImage: isImageAttachmentUrl(parsed.url),
    })
  }

  const uniqueByUrl = new Map<string, ParsedAttachment>()
  for (const item of attachments) {
    uniqueByUrl.set(item.url, item)
  }

  return Array.from(uniqueByUrl.values())
}

function parseClientIntakePayload(description: string | null | undefined): ParsedClientIntakePayload | null {
  if (!description) {
    return null
  }

  const normalized = description.replace(/\r\n/g, '\n')
  if (!/^\s*Client request submitted via public intake link\./i.test(normalized)) {
    return null
  }

  const clientNameMatch = normalized.match(/^Client name:\s*(.+)$/im)
  const clientEmailMatch = normalized.match(/^Client email:\s*(.+)$/im)
  const detailsMatch = normalized.match(/Request details:\s*\n([\s\S]*?)(?:\n\s*Attachments:\s*\n|\n\s*Internal description:\s*\n|$)/i)
  const attachmentsMatch = normalized.match(/\n\s*Attachments:\s*\n([\s\S]*?)(?:\n\s*Internal description:\s*\n|$)/i)
  const internalDescriptionMatch = normalized.match(/\n\s*Internal description:\s*\n([\s\S]*)$/i)

  const rawClientName = (clientNameMatch?.[1] ?? '').trim()
  const rawClientEmail = (clientEmailMatch?.[1] ?? '').trim()
  const requestDetails = (detailsMatch?.[1] ?? '').trim()
  const attachmentsSection = attachmentsMatch?.[1] ?? ''
  const internalDescription = (internalDescriptionMatch?.[1] ?? '').trim()

  const attachments: ParsedAttachment[] = []
  for (const line of attachmentsSection.split('\n')) {
    const parsed = parseAttachmentLine(line.trim())
    if (!parsed) {
      continue
    }

    attachments.push({
      name: parsed.name,
      url: parsed.url,
      isImage: isImageAttachmentUrl(parsed.url),
    })
  }

  const uniqueByUrl = new Map<string, ParsedAttachment>()
  for (const attachment of attachments) {
    uniqueByUrl.set(attachment.url, attachment)
  }

  return {
    clientName: rawClientName.toLowerCase() === 'not provided' || rawClientName.length === 0 ? null : rawClientName,
    clientEmail: rawClientEmail.toLowerCase() === 'not provided' || rawClientEmail.length === 0 ? null : rawClientEmail,
    requestDetails,
    attachments: Array.from(uniqueByUrl.values()),
    internalDescription,
  }
}

function formatClientIntakePayload(input: ParsedClientIntakePayload): string {
  const lines: string[] = []

  lines.push('Client request submitted via public intake link.')
  lines.push('')
  lines.push(`Client name: ${input.clientName?.trim() || 'Not provided'}`)
  lines.push(`Client email: ${input.clientEmail?.trim() || 'Not provided'}`)
  lines.push('')
  lines.push('Request details:')
  lines.push(input.requestDetails.trim() || 'Not provided')

  if (input.attachments.length > 0) {
    lines.push('')
    lines.push('Attachments:')
    for (const [index, attachment] of input.attachments.entries()) {
      const displayName = attachment.name?.trim() || `Attachment ${index + 1}`
      lines.push(`${index + 1}. ${displayName} | ${attachment.url}`)
    }
  }

  if (input.internalDescription.trim().length > 0) {
    lines.push('')
    lines.push('Internal description:')
    lines.push(input.internalDescription.trim())
  }

  return lines.join('\n')
}

function stripAttachmentSection(description: string | null | undefined): string {
  if (!description) {
    return ''
  }

  const lines = description.split('\n')
  const kept: string[] = []
  let inAttachmentsSection = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (/^attachments:?$/i.test(trimmed)) {
      inAttachmentsSection = true
      continue
    }

    if (!inAttachmentsSection) {
      kept.push(line)
      continue
    }

    if (trimmed.length === 0) {
      continue
    }

    const parsed = parseAttachmentLine(trimmed)
    if (parsed) {
      continue
    }

    inAttachmentsSection = false
    kept.push(line)
  }

  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function TaskDetailsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { taskId } = useParams<{ taskId: string }>()
  const [isCommentsOpen, setIsCommentsOpen] = useState(true)
  const [selectedProfile, setSelectedProfile] = useState<UserProfilePreview | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [estimateHoursDraft, setEstimateHoursDraft] = useState('0')
  const [taskStatusDraft, setTaskStatusDraft] = useState('todo')
  const [taskPriorityDraft, setTaskPriorityDraft] = useState('medium')
  const [taskDueDateDraft, setTaskDueDateDraft] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [clientNameDraft, setClientNameDraft] = useState('')
  const [clientEmailDraft, setClientEmailDraft] = useState('')
  const [clientRequestDetailsDraft, setClientRequestDetailsDraft] = useState('')
  const [clientAttachmentsDraft, setClientAttachmentsDraft] = useState<ParsedAttachment[]>([])
  const [titleDraft, setTitleDraft] = useState('')
  const [isTaskEditing, setIsTaskEditing] = useState(false)
  const [isTaskSaving, setIsTaskSaving] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState<ParsedAttachment | null>(null)

  const backTo =
    typeof location.state === 'object' &&
    location.state !== null &&
    'backTo' in location.state &&
    typeof location.state.backTo === 'string'
      ? location.state.backTo
      : '/app/tasks'

  const {
    isLoading,
    tasks,
    myRoleInSelectedProject,
    canTakeUnassignedTasks,
    canManageTask,
    canDeleteTaskInView,
    isWorkPackagesLoading,
    projectStartDate,
    projectEndDate,
    assigneeLabelByUserId,
    workPackageLabelById,
    dependencyLabelByTaskId,
    projectMembers,
    currentUserProfile,
    removeTask,
    logTimeTask,
    setLogTimeTask,
    submitTaskLogTime,
    editTask,
  } = useTasksPageController()

  const task = tasks.find((t) => t.id === taskId)
  const descriptionViewModel = useMemo(() => {
    const description = task?.description ?? ''
    const clientIntakePayload = parseClientIntakePayload(description)

    if (clientIntakePayload) {
      return {
        clientIntakePayload,
        attachments: clientIntakePayload.attachments,
        descriptionText: clientIntakePayload.internalDescription,
      }
    }

    return {
      clientIntakePayload: null,
      attachments: extractClientAttachments(description),
      descriptionText: stripAttachmentSection(description),
    }
  }, [task?.description])

  const clientIntakePayload = descriptionViewModel.clientIntakePayload
  const attachments = descriptionViewModel.attachments
  const descriptionText = descriptionViewModel.descriptionText

  useEffect(() => {
    if (!task && taskId) {
      navigate(backTo, { replace: true })
    }
  }, [task, taskId, navigate, backTo])

  useEffect(() => {
    if (!previewAttachment) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewAttachment(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [previewAttachment])

  if (!task) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-slate-500">Loading task...</div>
      </div>
    )
  }

  function getStatusLabel(status: string | null | undefined) {
    const value = (status ?? 'todo').replaceAll('_', ' ')
    return value.charAt(0).toUpperCase() + value.slice(1)
  }

  const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'
  const assigneeUserId = task.assigned_to ?? task.created_by
  const assigneeLabel = task.assigned_to
    ? assigneeLabelByUserId[task.assigned_to] ?? task.assigned_to
    : task.created_by
      ? `${assigneeLabelByUserId[task.created_by] ?? task.created_by} (creator)`
      : 'Unassigned'
  const hasWorkPackageLink = Boolean(task.work_package_id && task.work_package_id.trim().length > 0)
  const workPackageLabel = hasWorkPackageLink
    ? (workPackageLabelById[task.work_package_id as string] ?? null)
    : null
  const blockedByLabel = task.blocked_by_task_id ? dependencyLabelByTaskId[task.blocked_by_task_id] : undefined
  const isUnassigned = !task.assigned_to
  const isLocked = !canManageTask(task) || isUnassigned
  const canDelete = canDeleteTaskInView(task)

  const currentUserId = currentUserProfile?.userId ?? null
  const isAssignee = Boolean(currentUserId && task.assigned_to === currentUserId)
  const canTakeCurrentTask = Boolean(currentUserId && !task.assigned_to && canTakeUnassignedTasks)
  // Time logging is reserved for the assignee after task ownership is explicit.
  const canLogTime = isAssignee && !isLocked

  const estimateHours = task.estimate_hours ?? 0
  const actualHours = task.actual_hours ?? 0
  const remainingHours = Math.max(0, Math.round((estimateHours - actualHours) * 100) / 100)
  const isOverBudget = estimateHours > 0 && actualHours > estimateHours
  const normalizedRole = (myRoleInSelectedProject ?? '').toLowerCase()
  const isOwnerOrAdmin = normalizedRole === 'owner' || normalizedRole === 'admin'
  const canEditEstimateHours = !isLocked && isOwnerOrAdmin
  const isClientIntakeTask = Boolean(clientIntakePayload)
  const canEditClientRequest = isClientIntakeTask && !isLocked && isOwnerOrAdmin
  const canEditTask = !isLocked
  const canEditDescription = !isLocked
  const clientRequestAttachments = isTaskEditing && canEditClientRequest ? clientAttachmentsDraft : attachments
  const descriptionImageAttachments = attachments.filter((attachment) => attachment.isImage)
  const descriptionFileAttachments = attachments.filter((attachment) => !attachment.isImage)
  const clientRequestImageAttachments = clientRequestAttachments.filter((attachment) => attachment.isImage)
  const clientRequestFileAttachments = clientRequestAttachments.filter((attachment) => !attachment.isImage)
  const progressPct = estimateHours > 0
    ? Math.min(100, Math.round((actualHours / estimateHours) * 100))
    : 0

  const openUserProfile = (userId: string) => {
    if (currentUserProfile?.userId === userId) {
      setSelectedProfile(currentUserProfile)
      return
    }

    const member = projectMembers.find((candidate) => candidate.user_id === userId)

    if (member) {
      setSelectedProfile({
        userId: member.user_id,
        fullName: member.full_name,
        email: member.email,
        role: member.role,
        joinedAt: member.joined_at,
      })
      return
    }

    setSelectedProfile({
      userId,
      fullName: assigneeLabelByUserId[userId] ?? userId,
    })
  }

  const startTaskEditing = () => {
    if (!canEditTask) {
      return
    }

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
    setIsTaskEditing(true)
  }

  const cancelTaskEditing = () => {
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
    setIsTaskEditing(false)
  }

  const saveTaskEditsHandler = async (taskId: string) => {
    if (!canEditTask) {
      setIsTaskEditing(false)
      return
    }

    const nextTitle = titleDraft.trim()
    if (!nextTitle) {
      return
    }

    if (!canEditDescription) {
      setIsTaskEditing(false)
      return
    }

    const patch: {
      title?: string
      description?: string
      status?: string
      priority?: string
      dueDate?: string
      estimateHours?: number
    } = {}

    if (nextTitle !== task.title) {
      patch.title = nextTitle
    }

    if (isClientIntakeTask && clientIntakePayload) {
      const nextPayload: ParsedClientIntakePayload = {
        ...clientIntakePayload,
        internalDescription: descriptionDraft,
      }

      if (canEditClientRequest) {
        nextPayload.clientName = clientNameDraft.trim() || null
        nextPayload.clientEmail = clientEmailDraft.trim() || null
        nextPayload.requestDetails = clientRequestDetailsDraft
        nextPayload.attachments = clientAttachmentsDraft
      }

      const composedDescription = formatClientIntakePayload(nextPayload)
      const currentDescription = task.description ?? ''
      if (composedDescription !== currentDescription) {
        patch.description = composedDescription
      }
    } else {
      const currentDescription = task.description ?? ''
      if (descriptionDraft !== currentDescription) {
        patch.description = descriptionDraft
      }
    }

    const currentStatus = task.status ?? 'todo'
    if (taskStatusDraft !== currentStatus) {
      patch.status = taskStatusDraft
    }

    const currentPriority = task.priority ?? 'medium'
    if (taskPriorityDraft !== currentPriority) {
      patch.priority = taskPriorityDraft
    }

    const currentDueDate = task.due_date?.slice(0, 10) ?? ''
    if (taskDueDateDraft !== currentDueDate) {
      patch.dueDate = taskDueDateDraft || undefined
    }

    if (canEditEstimateHours) {
      const normalizedEstimateHours = estimateHoursDraft.trim()
      const parsedEstimateHours = Number.parseFloat(normalizedEstimateHours)
      if (!Number.isFinite(parsedEstimateHours) || parsedEstimateHours < 0) {
        return
      }

      const currentEstimateHours = task.estimate_hours ?? 0
      if (parsedEstimateHours !== currentEstimateHours) {
        patch.estimateHours = parsedEstimateHours
      }
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

  const takeTaskHandler = async () => {
    if (!currentUserId || task.assigned_to || !canTakeUnassignedTasks) {
      return
    }

    await editTask(task.id, { assignedTo: currentUserId })
  }

  const removeClientAttachmentHandler = (urlToRemove: string) => {
    setClientAttachmentsDraft((prev) => prev.filter((attachment) => attachment.url !== urlToRemove))
  }

  const getDaysUntilDue = (dueDateRaw: string | null | undefined) => {
    if (!dueDateRaw) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(dueDateRaw)
    dueDate.setHours(0, 0, 0, 0)
    const days = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000)
    return days
  }

  const daysUntilDue = getDaysUntilDue(task.due_date)
  const isDueSoon = daysUntilDue !== null && daysUntilDue <= 3 && daysUntilDue >= 0
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe_0%,#f8fafc_28%,#f8fafc_100%)]">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <button
          type="button"
          onClick={() => navigate(backTo)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {backTo.startsWith('/app/projects/') ? 'Project Details' : 'Tasks'}
        </button>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Header */}
        <header className="mb-8 rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Task details</p>
              {isTaskEditing ? (
                <div className="mt-2 max-w-2xl">
                  <input
                    value={titleDraft}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    maxLength={TASK_TITLE_MAX_LENGTH}
                    placeholder="Task title"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-2xl font-semibold text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />
                  <p className="text-right text-xs text-slate-500">
                    {titleDraft.length}/{TASK_TITLE_MAX_LENGTH}
                  </p>
                </div>
              ) : (
                <div className="mt-1 flex items-start justify-between gap-3">
                  <h1 className="text-3xl font-bold text-slate-900 break-words">{task.title}</h1>
                  {canEditTask ? (
                    <button
                      type="button"
                      onClick={startTaskEditing}
                      className="shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Edit
                    </button>
                  ) : null}
                </div>
              )}
            </div>
            {canTakeCurrentTask ? (
              <button
                type="button"
                onClick={() => void takeTaskHandler()}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-300 bg-cyan-100 px-3.5 py-2 text-sm font-semibold text-cyan-900 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Take task
              </button>
            ) : null}
          </div>

          {isTaskEditing ? (
            <div className="mb-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void saveTaskEditsHandler(task.id)}
                disabled={isTaskSaving}
                className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isTaskSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={cancelTaskEditing}
                disabled={isTaskSaving}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          ) : null}

          {/* Description */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">Description</label>
            </div>

            {isTaskEditing && canEditDescription ? (
              <div>
                <textarea
                  value={descriptionDraft}
                  onChange={(event) => setDescriptionDraft(event.target.value)}
                  placeholder="Add description..."
                  maxLength={TASK_DESCRIPTION_MAX_LENGTH}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-base leading-6 text-slate-900 outline-none shadow-sm transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-200"
                  rows={5}
                />
                <p className="mt-1 text-right text-xs text-slate-500">
                  {descriptionDraft.length}/{TASK_DESCRIPTION_MAX_LENGTH}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-base leading-6 text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg border border-slate-200 p-4">{descriptionText || 'No description'}</p>

                {!clientIntakePayload && attachments.length > 0 ? (
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Attachments ({attachments.length})</p>
                    <div className="space-y-3">
                      {descriptionImageAttachments.map((attachment, index) => (
                        <button
                          key={attachment.url}
                          type="button"
                          onClick={() => setPreviewAttachment(attachment)}
                          className="inline-block max-w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 hover:border-sky-300"
                        >
                          <img
                            src={attachment.url}
                            alt={`Attachment preview: ${attachment.name || `Image ${index + 1}`}`}
                            className="block h-auto max-h-80 max-w-[520px] object-left-top"
                            loading="lazy"
                          />
                          <div className="border-t border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">
                            {attachment.name || `Image ${index + 1}`}
                          </div>
                        </button>
                      ))}

                      {descriptionFileAttachments.map((attachment, index) => (
                        <a
                          key={attachment.url}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                        >
                          <span className="truncate pr-3 font-medium">{attachment.name || `Attachment ${index + 1}`}</span>
                          <span className="shrink-0 text-xs font-semibold text-sky-700">Open</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </header>

        {clientIntakePayload ? (
          <section className="mb-8 rounded-2xl border border-sky-200 bg-gradient-to-b from-sky-50 to-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">Client request</p>

            <div className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Client name</p>
                  {isTaskEditing && canEditClientRequest ? (
                    <input
                      value={clientNameDraft}
                      onChange={(event) => setClientNameDraft(event.target.value)}
                      placeholder="Client name"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                    />
                  ) : (
                    <p className="mt-1 text-sm font-medium text-slate-800">{clientIntakePayload.clientName ?? 'Not provided'}</p>
                  )}
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Client email</p>
                  {isTaskEditing && canEditClientRequest ? (
                    <input
                      value={clientEmailDraft}
                      onChange={(event) => setClientEmailDraft(event.target.value)}
                      placeholder="Client email"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                    />
                  ) : (
                    <p className="mt-1 text-sm font-medium text-slate-800">{clientIntakePayload.clientEmail ?? 'Not provided'}</p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Request details</p>
                {isTaskEditing && canEditClientRequest ? (
                  <textarea
                    value={clientRequestDetailsDraft}
                    onChange={(event) => setClientRequestDetailsDraft(event.target.value)}
                    rows={4}
                    placeholder="Client request details"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  />
                ) : (
                  <p className="text-base leading-6 whitespace-pre-wrap text-slate-700">
                    {clientIntakePayload.requestDetails || 'No details provided'}
                  </p>
                )}
              </div>

              {clientRequestAttachments.length > 0 ? (
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Attachments ({clientRequestAttachments.length})</p>
                  <div className="space-y-3">
                    {clientRequestImageAttachments.map((attachment, index) => (
                      <div key={attachment.url} className="inline-block max-w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        <button
                          type="button"
                          onClick={() => setPreviewAttachment(attachment)}
                          className="block hover:border-sky-300"
                        >
                          <img
                            src={attachment.url}
                            alt={`Attachment preview: ${attachment.name || `Image ${index + 1}`}`}
                            className="block h-auto max-h-80 max-w-[520px] object-left-top"
                            loading="lazy"
                          />
                        </button>
                        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">
                          <span className="truncate">{attachment.name || `Image ${index + 1}`}</span>
                          {isTaskEditing && canEditClientRequest ? (
                            <button
                              type="button"
                              onClick={() => removeClientAttachmentHandler(attachment.url)}
                              className="shrink-0 rounded border border-rose-300 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}

                    {clientRequestFileAttachments.map((attachment, index) => (
                      <div
                        key={attachment.url}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                      >
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate pr-3 font-medium text-slate-700 hover:text-sky-700"
                        >
                          {attachment.name || `Attachment ${index + 1}`}
                        </a>
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 text-xs font-semibold text-sky-700">Open</span>
                          {isTaskEditing && canEditClientRequest ? (
                            <button
                              type="button"
                              onClick={() => removeClientAttachmentHandler(attachment.url)}
                              className="shrink-0 rounded border border-rose-300 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Content Grid */}
        <div className="grid gap-6">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Details Section */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              {/* Quick Settings - Status and Priority */}
              <div className="mb-6 grid gap-4">
                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Status</label>
                  {isTaskEditing ? (
                    <select
                      value={taskStatusDraft}
                      onChange={(event) => setTaskStatusDraft(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                    >
                      <option value="backlog">Backlog</option>
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="done">Done</option>
                    </select>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-sm text-slate-700 font-medium">{getStatusLabel(task.status)}</p>
                    </div>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Priority</label>
                  {isTaskEditing ? (
                    <select
                      value={taskPriorityDraft}
                      onChange={(event) => setTaskPriorityDraft(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-sm text-slate-700 font-medium capitalize">{task.priority ?? 'medium'}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="mb-6 border-t border-dashed border-slate-200"></div>

              {/* Details - Other fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Due Date */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Due date</label>
                  {isTaskEditing ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="date"
                        value={taskDueDateDraft}
                        min={projectStartDate || undefined}
                        max={projectEndDate || undefined}
                        onChange={(event) => setTaskDueDateDraft(event.target.value)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                      />
                      {task.due_date && daysUntilDue !== null && (
                        <p className={`text-xs px-3 py-1.5 rounded-md inline-flex w-fit ${isOverdue ? 'bg-rose-50 text-rose-700 font-medium' : isDueSoon ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {isOverdue
                            ? `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'} overdue`
                            : `${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'} remaining`}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-sm text-slate-700 font-medium">{dueDate}</p>
                      {daysUntilDue !== null && (
                        <p className={`text-xs mt-2 ${isOverdue ? 'text-rose-600 font-medium' : isDueSoon ? 'text-amber-600' : 'text-slate-500'}`}>
                          {isOverdue
                            ? `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'} overdue`
                            : `${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'} remaining`}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Assignee */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Assignee</label>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    {assigneeUserId ? (
                      <button
                        type="button"
                        onClick={() => openUserProfile(assigneeUserId)}
                        className="text-sm font-medium text-sky-700 hover:text-sky-800"
                      >
                        {assigneeLabel}
                      </button>
                    ) : (
                      <p className="text-sm text-slate-500">Unassigned</p>
                    )}
                  </div>
                </div>

                {/* Work Package */}
                {hasWorkPackageLink ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Work package</label>
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-sm text-slate-700 font-medium">{workPackageLabel ?? (isWorkPackagesLoading ? 'Loading work package...' : 'Not linked')}</p>
                    </div>
                  </div>
                ) : null}

                {/* Blocked By */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Blocked by</label>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-sm text-slate-700 font-medium">{blockedByLabel ?? 'None'}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Time Tracking Section */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className="text-sm font-semibold text-slate-900">Time Tracking</h2>
                {canLogTime && (
                  <button
                    type="button"
                    onClick={() => setLogTimeTask(task)}
                    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    Log time
                  </button>
                )}
              </div>

              {/* Time Cards */}
              <div className="grid gap-3 sm:grid-cols-3 mb-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Estimate</p>
                  {canEditEstimateHours && isTaskEditing ? (
                    <div className="mt-2">
                      <label htmlFor="task-estimate-hours" className="sr-only">Estimate hours</label>
                      <div className="flex items-center gap-2">
                        <input
                          id="task-estimate-hours"
                          type="number"
                          min={0}
                          step={0.25}
                          inputMode="decimal"
                          value={estimateHoursDraft}
                          onChange={(event) => setEstimateHoursDraft(event.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                        />
                        <span className="text-sm text-slate-500">h</span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-2xl font-bold text-slate-900">{estimateHours}<span className="text-sm text-slate-500">h</span></p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Logged</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{actualHours}<span className="text-sm text-slate-500">h</span></p>
                </div>

                <div className={`rounded-xl border p-4 ${isOverBudget ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-slate-50'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${isOverBudget ? 'text-rose-700' : 'text-slate-600'}`}>
                    {isOverBudget ? 'Over budget' : 'Remaining'}
                  </p>
                  <p className={`mt-2 text-2xl font-bold ${isOverBudget ? 'text-rose-700' : 'text-slate-900'}`}>
                    {isOverBudget ? `+${Math.round((actualHours - estimateHours) * 100) / 100}` : remainingHours}
                    <span className="text-sm text-slate-500">h</span>
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              {estimateHours > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
                    <span>Progress</span>
                    <span className="font-semibold">{progressPct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className={`h-2 rounded-full transition-all ${isOverBudget ? 'bg-rose-500' : 'bg-sky-500'}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}

            </section>

            {/* Comments Section */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="text-sm font-semibold text-slate-900">Collaboration</h2>
                <button
                  type="button"
                  onClick={() => setIsCommentsOpen((prev) => !prev)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1"
                >
                  {isCommentsOpen ? 'Hide' : 'Show'}
                </button>
              </div>

              {isCommentsOpen && task.project_id && (
                <TaskCommentsPanel
                  projectId={task.project_id}
                  taskId={task.id}
                  readOnly={isLocked}
                />
              )}
            </section>

            {/* Delete Section */}
            {canDelete && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="inline-flex items-center rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-100"
                >
                  Delete task
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {previewAttachment ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-label="Attachment preview"
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="relative max-h-full max-w-[min(96vw,1400px)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewAttachment(null)}
              className="absolute right-2 top-2 z-10 rounded-md bg-slate-900/70 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-900"
            >
              Close
            </button>
            <img
              src={previewAttachment.url}
              alt={previewAttachment.name || 'Attachment image'}
              className="max-h-[90vh] max-w-[96vw] rounded-lg object-contain"
            />
          </div>
        </div>
      ) : null}

      <UserProfileDialog
        isOpen={Boolean(selectedProfile)}
        profile={selectedProfile}
        onClose={() => setSelectedProfile(null)}
      />

      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        tone="danger"
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={async () => {
          setIsDeleteConfirmOpen(false)
          await removeTask(task.id)
          navigate(backTo)
        }}
      />

      <TaskLogTimeModal
        isOpen={Boolean(logTimeTask)}
        taskTitle={task.title}
        onClose={() => setLogTimeTask(null)}
        onSubmit={submitTaskLogTime}
        isSubmitting={isLoading}
      />
    </div>
  )
}
