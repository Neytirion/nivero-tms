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

  it('shows progress, duration, estimated, and actual in delivery health', () => {
    render(
      <ProjectOverviewTab
        selectedProject={createProjectPreview({
          start_date: '2026-09-01',
          end_date: '2026-09-10',
          baseline_hours: 100,
          actual_hours: 38,
          progress_percent: 40,
          forecast_at_completion_percent: 110,
          risk_status: 'green',
        })}
        tasks={[]}
        teamMemberNames={[]}
        projectMembers={[]}
        currentUserProfile={null}
      />,
    )

    expect(screen.getByRole('button', { name: 'Explain Progress' })).toHaveTextContent('40.0%')
    expect(screen.getByRole('button', { name: 'Explain Duration' })).toHaveTextContent('10d')
    expect(screen.getByRole('button', { name: 'Explain Duration' })).toHaveTextContent('9/1/2026 → 9/10/2026')
    expect(screen.getByRole('button', { name: 'Explain Estimated' })).toHaveTextContent('100.0h')
    expect(screen.getByRole('button', { name: 'Explain Actual' })).toHaveTextContent('38.0h')
    expect(screen.getByRole('button', { name: 'Explain Forecast at completion' })).toHaveTextContent('110.0% · 110.0h')
    expect(screen.getByRole('heading', { name: 'Schedule' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Effort' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Outlook' })).toBeInTheDocument()
    expect(screen.queryByText('Baseline')).not.toBeInTheDocument()
  })
})