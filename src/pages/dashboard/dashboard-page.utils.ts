import type { TaskPreview } from '../../lib/pm'

export function formatDueDate(value: string | null | undefined) {
  if (!value) {
    return 'No due date'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  })
}

export function compareDueDateAsc(left: string | null | undefined, right: string | null | undefined) {
  if (!left && !right) {
    return 0
  }

  if (!left) {
    return 1
  }

  if (!right) {
    return -1
  }

  return left.localeCompare(right)
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function countTasksDueThisWeek(tasks: TaskPreview[]) {
  const now = new Date()
  const day = now.getDay()
  const daysFromMonday = (day + 6) % 7
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(now.getDate() - daysFromMonday)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return tasks.filter((task) => {
    if (!task.due_date) {
      return false
    }

    const dueDate = new Date(task.due_date)

    if (Number.isNaN(dueDate.getTime())) {
      return false
    }

    return dueDate >= monday && dueDate <= sunday
  }).length
}
