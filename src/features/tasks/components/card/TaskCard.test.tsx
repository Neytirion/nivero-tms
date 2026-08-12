import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TaskCard } from './TaskCard'

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
    vi.clearAllMocks()
  })

  it('renders compact summary with priority marker', () => {
    render(
      <TaskCard
        task={baseTask}
        assigneeLabel="Alice"
        isLocked={false}
      />,
    )

    const priorityBadge = screen.getByText('high')
    expect(priorityBadge.getAttribute('data-priority')).toBe('high')
    expect(screen.getByText('Implement API')).toBeInTheDocument()
  })

  it('navigates when card is clicked', () => {
    const onTaskClick = vi.fn()

    render(
      <TaskCard
        task={baseTask}
        assigneeLabel="Alice"
        onTaskClick={onTaskClick}
        isLocked={false}
      />,
    )

    fireEvent.click(screen.getByText('Implement API'))
    expect(onTaskClick).toHaveBeenCalledWith('t1')
  })

  it('opens user profile from assignee link without triggering card click', () => {
    const onOpenUserProfile = vi.fn()
    const onTaskClick = vi.fn()

    render(
      <TaskCard
        task={baseTask}
        assigneeLabel="Alice"
        assigneeUserId="u1"
        onOpenUserProfile={onOpenUserProfile}
        onTaskClick={onTaskClick}
        isLocked={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Alice' }))
    expect(onOpenUserProfile).toHaveBeenCalledWith('u1')
    expect(onTaskClick).not.toHaveBeenCalled()
  })
})
