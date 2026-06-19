import type { TaskStatus } from '../../shared/utils/task-status'

export const KANBAN_COLUMNS = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
] as const satisfies ReadonlyArray<{ key: TaskStatus; label: string }>

export type { TaskStatus }
