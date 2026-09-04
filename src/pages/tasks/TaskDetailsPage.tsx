import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTasksPageController } from '../../features/tasks/hooks/useTasksPageController'
import { useTaskDetailsEditState } from '../../features/tasks/hooks/useTaskDetailsEditState'
import { useEffect, useMemo, useState } from 'react'
import { useGlobalTaskTimer } from '../../features/time-tracking/global/GlobalTaskTimerContext'
import { getTimeEntries, createTimeEntry } from '../../lib/pm'
import { formatDurationFromSeconds, getEntryDurationSeconds, localDateTimeToISOString } from '../../features/time-tracking/utils/time-tracking.utils'
import type { TimeEntryPreview } from '../../lib/pm'
import {
  TaskDetailsHeader,
  TaskDescriptionSection,
  TaskClientIntakeSection,
  TaskInfoSection,
  TaskTimeTrackingSection,
} from '../../features/tasks/components/details'
import { TaskCommentsPanel, TaskLogTimeModal } from '../../features/tasks/components'
import { ConfirmDialog, UserProfileDialog, WorkspacePageHeader, type UserProfilePreview } from '../../shared/components'
import {
  parseClientIntakePayload,
  extractClientAttachments,
  stripAttachmentSection,
  type ParsedAttachment,
} from '../../features/tasks/utils/client-intake.utils'

export function TaskDetailsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { taskId } = useParams<{ taskId: string }>()
  const [isCommentsOpen, setIsCommentsOpen] = useState(true)
  const [isLogTimeModalOpen, setIsLogTimeModalOpen] = useState(false)
  const [isManualLogging, setIsManualLogging] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<UserProfilePreview | null>(null)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [previewAttachment, setPreviewAttachment] = useState<ParsedAttachment | null>(null)
  const [preciseLoggedByTaskId, setPreciseLoggedByTaskId] = useState<{ taskId: string; seconds: number } | null>(null)
  const [todayTimeEntries, setTodayTimeEntries] = useState<TimeEntryPreview[]>([])
  const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTimeMs(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [])

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
    editTask,
  } = useTasksPageController()

  const { startTimerForTask, timerTaskId, isRunning: isGlobalTimerRunning, lastSavedAt } = useGlobalTaskTimer()

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

  const { clientIntakePayload, attachments, descriptionText } = descriptionViewModel

  // Derived permissions (computed before hooks to keep hook call order stable)
  const isUnassigned = !task?.assigned_to
  const isLocked = !task || !canManageTask(task) || isUnassigned
  const normalizedRole = (myRoleInSelectedProject ?? '').toLowerCase()
  const isOwnerOrAdmin = normalizedRole === 'owner' || normalizedRole === 'admin'
  const canEditTask = !isLocked
  const canEditDescription = !isLocked
  const canEditEstimateHours = !isLocked && isOwnerOrAdmin
  const isClientIntakeTask = Boolean(clientIntakePayload)
  const canEditClientRequest = isClientIntakeTask && !isLocked && isOwnerOrAdmin

  const editState = useTaskDetailsEditState({
    task: task ?? { id: '', title: '', description: null, status: null, priority: null, due_date: null, estimate_hours: null },
    clientIntakePayload,
    descriptionText,
    canEditTask,
    canEditDescription,
    canEditClientRequest,
    canEditEstimateHours,
    editTask,
  })

  useEffect(() => {
    if (!task && taskId) {
      navigate(backTo, { replace: true })
    }
  }, [task, taskId, navigate, backTo])

  useEffect(() => {
    if (!previewAttachment) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewAttachment(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [previewAttachment])

  useEffect(() => {
    if (!task?.project_id || !task?.id) return

    const projectId = task.project_id
    const currentTaskId = task.id
    let cancelled = false

    const loadTaskTimeEntries = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const [entries, allTodayEntries] = await Promise.all([
          getTimeEntries({ projectId, taskId: currentTaskId }),
          currentUserProfile?.userId
            ? getTimeEntries({ userId: currentUserProfile.userId, fromDate: today, toDate: today })
            : Promise.resolve([]),
        ])
        if (cancelled) return
        const totalSeconds = entries.reduce((sum, entry) => sum + getEntryDurationSeconds(entry), 0)
        setPreciseLoggedByTaskId({ taskId: currentTaskId, seconds: totalSeconds })
        setTodayTimeEntries(allTodayEntries)
      } catch {
        if (!cancelled) {
          setPreciseLoggedByTaskId(null)
          setTodayTimeEntries([])
        }
      }
    }

    void loadTaskTimeEntries()
    return () => { cancelled = true }
  }, [task?.id, task?.project_id, currentUserProfile?.userId, lastSavedAt])

  if (!task) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-slate-500">Loading task...</div>
      </div>
    )
  }

  // Derived values
  const canDelete = canDeleteTaskInView(task)
  const assigneeUserId = task.assigned_to ?? task.created_by ?? null
  const assigneeLabel = task.assigned_to
    ? (assigneeLabelByUserId[task.assigned_to] ?? task.assigned_to)
    : task.created_by
      ? `${assigneeLabelByUserId[task.created_by] ?? task.created_by} (creator)`
      : 'Unassigned'
  const hasWorkPackageLink = Boolean(task.work_package_id?.trim())
  const workPackageLabel = hasWorkPackageLink ? (workPackageLabelById[task.work_package_id as string] ?? null) : null
  const blockedByLabel = task.blocked_by_task_id ? dependencyLabelByTaskId[task.blocked_by_task_id] : undefined

  const currentUserId = currentUserProfile?.userId ?? null
  const isAssignee = Boolean(currentUserId && task.assigned_to === currentUserId)
  const canTakeCurrentTask = Boolean(currentUserId && !task.assigned_to && canTakeUnassignedTasks)
  // Time logging is reserved for the assignee after task ownership is explicit.
  const canLogTime = isAssignee && !isLocked
  const isCurrentTaskInTimer = timerTaskId === task.id
  const isCurrentTimeLogged = todayTimeEntries.some((entry) => {
    if (!entry.started_at || !entry.ended_at) return false
    const startedAt = new Date(entry.started_at).getTime()
    const endedAt = new Date(entry.ended_at).getTime()
    return Number.isFinite(startedAt) && Number.isFinite(endedAt) && startedAt <= currentTimeMs && currentTimeMs < endedAt
  })
  const isTimerBlockedByExistingLog = isCurrentTimeLogged && !isGlobalTimerRunning

  const estimateHours = task.estimate_hours ?? 0
  const actualHours = task.actual_hours ?? 0
  const preciseLoggedSeconds = preciseLoggedByTaskId?.taskId === task.id ? preciseLoggedByTaskId.seconds : null
  const estimateSeconds = Math.max(0, Math.round(estimateHours * 3600))
  const actualSeconds = preciseLoggedSeconds ?? Math.max(0, Math.round(actualHours * 3600))
  const remainingSeconds = Math.max(0, estimateSeconds - actualSeconds)
  const overBudgetSeconds = Math.max(0, actualSeconds - estimateSeconds)
  const isOverBudget = estimateSeconds > 0 && actualSeconds > estimateSeconds
  const progressPct = estimateSeconds > 0 ? Math.min(100, Math.round((actualSeconds / estimateSeconds) * 100)) : 0

  const getDaysUntilDue = (dueDateRaw: string | null | undefined) => {
    if (!dueDateRaw) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDateRaw)
    due.setHours(0, 0, 0, 0)
    return Math.ceil((due.getTime() - today.getTime()) / 86400000)
  }

  const daysUntilDue = getDaysUntilDue(task.due_date)
  const isDueSoon = daysUntilDue !== null && daysUntilDue <= 3 && daysUntilDue >= 0
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0
  const dueDateFormatted = task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'
  const clientRequestAttachments = editState.isTaskEditing && canEditClientRequest
    ? editState.clientAttachmentsDraft
    : attachments

  const openUserProfile = (userId: string) => {
    if (currentUserProfile?.userId === userId) {
      setSelectedProfile(currentUserProfile)
      return
    }
    const member = projectMembers.find((m) => m.user_id === userId)
    if (member) {
      setSelectedProfile({ userId: member.user_id, fullName: member.full_name, email: member.email, role: member.role, joinedAt: member.joined_at })
      return
    }
    setSelectedProfile({ userId, fullName: assigneeLabelByUserId[userId] ?? userId })
  }

  const takeTaskHandler = async () => {
    if (!currentUserId || task.assigned_to || !canTakeUnassignedTasks) return
    await editTask(task.id, { assignedTo: currentUserId })
  }

  const handleLogTimeSubmit = async (startTime: string, endTime: string) => {
    if (!task.project_id) return
    setIsManualLogging(true)
    try {
      const [startH, startM] = startTime.split(':').map(Number)
      const [endH, endM] = endTime.split(':').map(Number)
      const durationMin = (endH * 60 + endM) - (startH * 60 + startM)
      const today = new Date().toISOString().split('T')[0]

      await createTimeEntry({
        projectId: task.project_id,
        taskId: task.id,
        entryDate: today,
        hoursSpent: durationMin / 60,
        isBillable: task.is_billable,
        startedAt: localDateTimeToISOString(today, startTime),
        endedAt: localDateTimeToISOString(today, endTime),
      })

      setIsLogTimeModalOpen(false)

      const entries = await getTimeEntries({ projectId: task.project_id, taskId: task.id })
      const totalSeconds = entries.reduce((sum, entry) => sum + getEntryDurationSeconds(entry), 0)
      setPreciseLoggedByTaskId({ taskId: task.id, seconds: totalSeconds })
    } finally {
      setIsManualLogging(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe_0%,#f8fafc_28%,#f8fafc_100%)]">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 space-y-5">
        <WorkspacePageHeader
          eyebrow="Tasks"
          title="Task Details"
          backButton={{
            label: backTo.startsWith('/app/projects/') ? '← Project Details' : '← Tasks',
            onClick: () => navigate(backTo),
          }}
          gradientClassName="bg-[linear-gradient(120deg,rgba(14,116,144,0.08),rgba(16,185,129,0.06))]"
        />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <TaskDetailsHeader
          taskTitle={task.title}
          isTaskEditing={editState.isTaskEditing}
          isTaskSaving={editState.isTaskSaving}
          canEditTask={canEditTask}
          canTakeCurrentTask={canTakeCurrentTask}
          isLoading={isLoading}
          titleDraft={editState.titleDraft}
          setTitleDraft={editState.setTitleDraft}
          onStartEditing={editState.startEditing}
          onSaveEdits={() => editState.saveEdits(task.id)}
          onCancelEditing={editState.cancelEditing}
          onTakeTask={takeTaskHandler}
        />

        <div className="mt-5">
          <TaskDescriptionSection
            isTaskEditing={editState.isTaskEditing}
            isTaskSaving={editState.isTaskSaving}
            canEditDescription={canEditDescription}
            descriptionDraft={editState.descriptionDraft}
            setDescriptionDraft={editState.setDescriptionDraft}
            descriptionText={descriptionText}
            attachments={clientIntakePayload ? [] : attachments}
            onPreviewAttachment={setPreviewAttachment}
          />
        </div>

        {clientIntakePayload ? (
          <TaskClientIntakeSection
            clientIntakePayload={clientIntakePayload}
            isTaskEditing={editState.isTaskEditing}
            canEditClientRequest={canEditClientRequest}
            clientNameDraft={editState.clientNameDraft}
            setClientNameDraft={editState.setClientNameDraft}
            clientEmailDraft={editState.clientEmailDraft}
            setClientEmailDraft={editState.setClientEmailDraft}
            clientRequestDetailsDraft={editState.clientRequestDetailsDraft}
            setClientRequestDetailsDraft={editState.setClientRequestDetailsDraft}
            clientRequestAttachments={clientRequestAttachments}
            onPreviewAttachment={setPreviewAttachment}
            onRemoveAttachment={editState.removeClientAttachment}
          />
        ) : null}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5 lg:col-start-2 lg:row-start-1">
            <TaskInfoSection
              isBillable={task.is_billable ?? false}
              status={task.status}
              priority={task.priority}
              dueDate={dueDateFormatted}
              daysUntilDue={daysUntilDue}
              isDueSoon={isDueSoon}
              isOverdue={isOverdue}
              assigneeUserId={assigneeUserId}
              assigneeLabel={assigneeLabel}
              hasWorkPackageLink={hasWorkPackageLink}
              workPackageLabel={workPackageLabel}
              isWorkPackagesLoading={isWorkPackagesLoading}
              blockedByLabel={blockedByLabel}
              projectStartDate={projectStartDate}
              projectEndDate={projectEndDate}
              isTaskEditing={editState.isTaskEditing}
              taskStatusDraft={editState.taskStatusDraft}
              setTaskStatusDraft={editState.setTaskStatusDraft}
              taskPriorityDraft={editState.taskPriorityDraft}
              setTaskPriorityDraft={editState.setTaskPriorityDraft}
              taskDueDateDraft={editState.taskDueDateDraft}
              setTaskDueDateDraft={editState.setTaskDueDateDraft}
              onOpenUserProfile={openUserProfile}
            />
          </div>

          <div className="space-y-5 lg:col-start-1 lg:row-start-1">
            <TaskTimeTrackingSection
              canLogTime={canLogTime}
              isTimerBlockedByExistingLog={isTimerBlockedByExistingLog}
              canEditEstimateHours={canEditEstimateHours}
              isTaskEditing={editState.isTaskEditing}
              isCurrentTaskInTimer={isCurrentTaskInTimer}
              isGlobalTimerRunning={isGlobalTimerRunning}
              estimateHoursDraft={editState.estimateHoursDraft}
              setEstimateHoursDraft={editState.setEstimateHoursDraft}
              estimateDurationLabel={formatDurationFromSeconds(estimateSeconds)}
              actualDurationLabel={formatDurationFromSeconds(actualSeconds)}
              remainingDurationLabel={formatDurationFromSeconds(remainingSeconds)}
              overBudgetDurationLabel={formatDurationFromSeconds(overBudgetSeconds)}
              estimateHours={estimateHours}
              isOverBudget={isOverBudget}
              progressPct={progressPct}
              onStartTimer={() => {
                if (isTimerBlockedByExistingLog) return
                startTimerForTask(task)
              }}
              onOpenLogTimeModal={() => setIsLogTimeModalOpen(true)}
              freeTimeEntries={todayTimeEntries}
              freeTimeDate={new Date().toISOString().split('T')[0]}
            />

            {/* Comments */}
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
              {isCommentsOpen && task.project_id ? (
                <TaskCommentsPanel projectId={task.project_id} taskId={task.id} readOnly={isLocked} />
              ) : null}
            </section>

            {canDelete ? (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="inline-flex items-center rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-100"
                >
                  Delete task
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Attachment preview overlay */}
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

      <TaskLogTimeModal
        isOpen={isLogTimeModalOpen}
        taskTitle={task.title}
        onClose={() => setIsLogTimeModalOpen(false)}
        onSubmit={handleLogTimeSubmit}
        isSubmitting={isManualLogging}
      />

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
    </div>
  )
}
