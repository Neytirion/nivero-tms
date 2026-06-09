import type { TaskPreview } from '../../../lib/pm'

export type AssigneeOption = {
  userId: string
  label: string
}

export type CalendarCell = {
  dayNumber: number
  dateKey: string
  tasks: TaskPreview[]
}

export type CalendarMeta = {
  cells: Array<CalendarCell | null>
  monthTitle: string
} | null
