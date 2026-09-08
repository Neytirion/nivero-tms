import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createProjectPreview } from '../../../../../test/workspace-factory'
import { ProjectOverviewTab } from './ProjectOverviewTab'

const mocks = vi.hoisted(() => ({
  getProjectMemberDisplayRoles: vi.fn(),
}))

vi.mock('../../../../../lib/pm', () => ({
  getProjectMemberDisplayRoles: mocks.getProjectMemberDisplayRoles,
}))

vi.mock('../../../utils/client-brief', () => ({
  downloadClientBrief: vi.fn(),
}))

describe('ProjectOverviewTab delivery health explanations', () => {
  beforeEach(() => {
    mocks.getProjectMemberDisplayRoles.mockResolvedValue([])
  })

  it('opens a metric explanation and closes it with Escape', () => {
    render(
      <ProjectOverviewTab
        selectedProject={createProjectPreview({
          baseline_hours: 100,
          actual_hours: 90,
          progress_percent: 70,
          hours_consumed_percent: 90,
          hours_variance_percent: 20,
          expected_progress_percent: 65,
          forecast_at_completion_percent: 128.6,
          risk_status: 'red',
          risk_reason: 'Current efficiency forecasts 128.6% of baseline hours at completion',
        })}
        tasks={[]}
        teamMemberNames={[]}
        projectMembers={[]}
        currentUserProfile={null}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Explain Hours variance' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Hours variance' })).toBeInTheDocument()
    expect(screen.getByText('Hours used − Progress')).toBeInTheDocument()
    expect(screen.getByText('Hours consumption is 20.0 percentage points ahead of delivery.')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})