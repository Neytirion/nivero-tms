import type { TaskPreview } from '../../../lib/pm'
import { toCanonicalTaskStatus } from '../../../shared/utils/task-status.ts'
import type { TaskStatus } from '../../../features/tasks/constants.ts'

export function normalizeTaskStatus(value: string | null | undefined): TaskStatus {
  return toCanonicalTaskStatus(value)
}

export function getTaskPriorityBadgeClass(priority: string | null | undefined) {
  const normalized = (priority ?? 'medium').toLowerCase()

  if (normalized === 'high') {
    return 'bg-rose-50 text-rose-700 border border-rose-100'
  }

  if (normalized === 'low') {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-100'
  }

  return 'bg-amber-50 text-amber-700 border border-amber-100'
}

const PRIORITY_RANK: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

function getPriorityRank(priority: string | null | undefined) {
  const normalized = (priority ?? 'medium').toLowerCase()
  return PRIORITY_RANK[normalized] ?? PRIORITY_RANK.medium
}

function toDateValue(value: string | null | undefined) {
  if (!value) {
    return Number.POSITIVE_INFINITY
  }

  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) {
    return Number.POSITIVE_INFINITY
  }

  return parsed
}

export function sortTasksForBoardColumn(
  tasks: TaskPreview[],
  canManageTask: (task: TaskPreview) => boolean,
) {
  return [...tasks].sort((left, right) => {
    const leftManageRank = canManageTask(left) ? 0 : 1
    const rightManageRank = canManageTask(right) ? 0 : 1
    if (leftManageRank !== rightManageRank) {
      return leftManageRank - rightManageRank
    }

    const priorityDelta = getPriorityRank(left.priority) - getPriorityRank(right.priority)
    if (priorityDelta !== 0) {
      return priorityDelta
    }

    const dueDateDelta = toDateValue(left.due_date) - toDateValue(right.due_date)
    if (dueDateDelta !== 0) {
      return dueDateDelta
    }

    return Date.parse(right.created_at ?? '') - Date.parse(left.created_at ?? '')
  })
}

export function shiftMonthValue(calendarMonth: string, direction: -1 | 1) {
  const [yearText, monthText] = calendarMonth.split('-')
  const year = Number.parseInt(yearText, 10)
  const month = Number.parseInt(monthText, 10)

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return calendarMonth
  }

  const nextDate = new Date(year, month - 1 + direction, 1)
  const nextYear = nextDate.getFullYear()
  const nextMonth = String(nextDate.getMonth() + 1).padStart(2, '0')

  return `${nextYear}-${nextMonth}`
}

export function buildCalendarMeta(calendarMonth: string, tasks: TaskPreview[]) {
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
}
