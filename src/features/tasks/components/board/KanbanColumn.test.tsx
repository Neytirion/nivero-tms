import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { KanbanColumn } from './KanbanColumn'

const capturedTaskCardProps: Array<Record<string, unknown>> = []

vi.mock('../card', () => ({
  TaskCard: (props: Record<string, unknown>) => {
    capturedTaskCardProps.push(props)
    return <div data-testid="task-card-mock" />
  },
}))

describe('KanbanColumn', () => {
  beforeEach(() => {
    capturedTaskCardProps.length = 0
  })

  it('prefers task embedded work package color and label over fallback maps', () => {
    render(
      <KanbanColumn
        status="todo"
        label="To Do"
        tasks={[
          {
            id: 't1',
            work_package_id: 'wp1',
            title: 'Task with embedded package',
            description: null,
            status: 'todo',
            priority: 'medium',
            assigned_to: 'u1',
            created_by: 'u1',
            estimate_hours: 2,
            actual_hours: 0,
            blocked_by_task_id: null,
            due_date: null,
            project_id: 'p1',
            created_at: '2026-08-19T00:00:00.000Z',
            work_package: { name: 'Embedded WP', color: '#ef4444' },
          },
        ] as never}
        assigneeLabelByUserId={{ u1: 'Alice' }}
        assigneeAvatarUrlByUserId={{}}
        workPackageLabelById={{ wp1: 'Fallback WP' }}
        workPackageColorById={{ wp1: '#3b82f6' }}
        onOpenUserProfile={() => undefined}
        onDropTask={() => undefined}
        onDragOver={(event) => event.preventDefault()}
        onDragTaskStart={() => undefined}
        canManageTask={() => true}
      />,
    )

    expect(capturedTaskCardProps).toHaveLength(1)
    expect(capturedTaskCardProps[0].workPackageLabel).toBe('Embedded WP')
    expect(capturedTaskCardProps[0].workPackageColor).toBe('#ef4444')
  })

  it('falls back to map values when embedded work package is missing', () => {
    render(
      <KanbanColumn
        status="todo"
        label="To Do"
        tasks={[
          {
            id: 't2',
            work_package_id: 'wp2',
            title: 'Task with fallback package',
            description: null,
            status: 'todo',
            priority: 'medium',
            assigned_to: null,
            created_by: 'u2',
            estimate_hours: 3,
            actual_hours: 0,
            blocked_by_task_id: null,
            due_date: null,
            project_id: 'p1',
            created_at: '2026-08-19T00:00:00.000Z',
            work_package: null,
          },
        ] as never}
        assigneeLabelByUserId={{ u2: 'Bob' }}
        assigneeAvatarUrlByUserId={{}}
        workPackageLabelById={{ wp2: 'Fallback WP 2' }}
        workPackageColorById={{ wp2: '#10b981' }}
        onOpenUserProfile={() => undefined}
        onDropTask={() => undefined}
        onDragOver={(event) => event.preventDefault()}
        onDragTaskStart={() => undefined}
        canManageTask={() => true}
      />,
    )

    expect(capturedTaskCardProps).toHaveLength(1)
    expect(capturedTaskCardProps[0].workPackageLabel).toBe('Fallback WP 2')
    expect(capturedTaskCardProps[0].workPackageColor).toBe('#10b981')
  })
})
