import { describe, expect, it } from 'vitest'
import type { ProjectPreview, TaskPreview } from '../../../lib/pm'
import { buildClientBriefHtml } from './client-brief'

function createProject(overrides: Partial<ProjectPreview> = {}): ProjectPreview {
  return {
    id: 'project-1',
    name: 'Northwind Revamp',
    description: 'Rebuild customer portal with role-based access and project analytics.',
    owner_id: 'owner-1',
    customer_name: 'Northwind',
    project_manager_id: 'manager-1',
    start_date: '2026-06-01',
    end_date: '2026-10-01',
    estimated_hours: 320,
    actual_hours: 80,
    budget_amount: 125000,
    progress_percent: 25,
    risk_status: 'green',
    status: 'active',
    completed_at: null,
    deadline_at: '2026-10-15',
    created_at: '2026-05-20T09:00:00Z',
    ...overrides,
  }
}

function createTask(overrides: Partial<TaskPreview> = {}): TaskPreview {
  return {
    id: 'task-1',
    work_package_id: null,
    title: 'Finalize information architecture',
    description: null,
    status: 'in_progress',
    priority: 'high',
    assigned_to: null,
    created_by: 'owner-1',
    estimate_hours: 14,
    actual_hours: 3,
    blocked_by_task_id: null,
    due_date: '2026-06-20',
    project_id: 'project-1',
    created_at: '2026-06-05T11:00:00Z',
    ...overrides,
  }
}

describe('buildClientBriefHtml', () => {
  it('renders project narrative and priority task table', () => {
    const html = buildClientBriefHtml({
      project: createProject(),
      tasks: [
        createTask({ title: 'Kickoff workshop' }),
        createTask({ id: 'task-2', title: 'UI kit draft', due_date: '2026-06-22' }),
      ],
      teamMemberNames: ['Alex', 'Sam'],
      projectManagerName: 'Taylor',
      generatedAt: new Date('2026-06-19T12:00:00Z'),
    })

    expect(html).toContain('Northwind Revamp')
    expect(html).toContain('Prepared for Northwind')
    expect(html).toContain('Kickoff workshop')
    expect(html).toContain('UI kit draft')
    expect(html).toContain('Taylor')
    expect(html).toContain('Alex')
    expect(html).toContain('Sam')
  })

  it('escapes HTML-sensitive content from project and task names', () => {
    const html = buildClientBriefHtml({
      project: createProject({
        name: '<script>alert(1)</script>',
        customer_name: 'A&B',
      }),
      tasks: [createTask({ title: '<b>Task</b>' })],
      teamMemberNames: ['<Admin>'],
      generatedAt: new Date('2026-06-19T12:00:00Z'),
    })

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('A&amp;B')
    expect(html).toContain('&lt;b&gt;Task&lt;/b&gt;')
    expect(html).toContain('&lt;Admin&gt;')
    expect(html).not.toContain('<script>alert(1)</script>')
  })
})
