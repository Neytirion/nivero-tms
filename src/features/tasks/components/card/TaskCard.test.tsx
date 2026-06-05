import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TaskCard } from './TaskCard'
import { getTaskCommentsCount } from '../../../../lib/pm'

vi.mock('../../../../lib/pm', () => ({
  getTaskCommentsCount: vi.fn(),
}))

vi.mock('../comments', () => ({
  TaskCommentsPanel: ({ taskId }: { taskId: string }) => <div>Comments panel for {taskId}</div>,
}))

const mockGetTaskCommentsCount = vi.mocked(getTaskCommentsCount)

const baseTask = {
  id: 't1',
  title: 'Implement API',
  description: 'Connect backend endpoints',
  priority: 'high',
  due_date: '2026-06-10',
  estimate_hours: 8,
  actual_hours: 2,
  project_id: 'p1',
  assigned_to: 'u1',
} as never

describe('TaskCard', () => {
  beforeEach(() => {
    mockGetTaskCommentsCount.mockResolvedValue(3)
  })

  it('renders priority styling and comments count', async () => {
    render(
      <TaskCard
        task={baseTask}
        assigneeLabel="Alice"
        onDelete={vi.fn()}
        onLogTime={vi.fn()}
        isLocked={false}
        canDelete={true}
      />,
    )

    const priorityBadge = screen.getByText('Priority: high')
  expect(priorityBadge.getAttribute('data-priority')).toBe('high')

    await waitFor(() => {
      expect(screen.getByText('Comments (3)')).toBeTruthy()
    })
  })

  it('opens comments panel and handles actions', async () => {
    const onDelete = vi.fn()
    const onLogTime = vi.fn()

    render(
      <TaskCard
        task={baseTask}
        assigneeLabel="Alice"
        onDelete={onDelete}
        onLogTime={onLogTime}
        isLocked={false}
        canDelete={true}
      />,
    )

    fireEvent.click(screen.getByText('Log time'))
    expect(onLogTime).toHaveBeenCalledWith(baseTask)

    fireEvent.click(screen.getByText('Delete'))
    expect(onDelete).toHaveBeenCalledWith('t1')

    fireEvent.click(await screen.findByText('Comments (3)'))
    expect(screen.getByText('Comments panel for t1')).toBeTruthy()
    expect(screen.getByText('Hide comments')).toBeTruthy()
  })
})
