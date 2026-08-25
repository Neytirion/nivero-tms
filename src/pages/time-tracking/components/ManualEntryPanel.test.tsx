import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ManualEntryPanel } from './ManualEntryPanel'

describe('ManualEntryPanel', () => {
  it('disables submit until a task is selected', () => {
    render(
      <ManualEntryPanel
        activeProjectId="p1"
        projectTasks={[{ id: 't1', title: 'Implement API' } as never]}
        manualTaskId=""
        manualDate="2026-06-10"
        manualDateMin="2026-06-01"
        manualDateMax="2026-06-30"
        manualHours="1"
        manualIsBillable
        manualNotes=""
        editingEntryId={null}
        isLoading={false}
        onManualTaskIdChange={vi.fn()}
        onManualDateChange={vi.fn()}
        onManualHoursChange={vi.fn()}
        onManualIsBillableChange={vi.fn()}
        onManualNotesChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole('combobox', { name: 'Task' })).toHaveDisplayValue('Select a task')
    expect(screen.getByRole('button', { name: 'Save manual entry' })).toBeDisabled()
    expect(screen.getByText('Allowed range: 2026-06-01 - 2026-06-30')).toBeInTheDocument()
  })

  it('enables submit and propagates changes when a task is selected', () => {
    const onManualTaskIdChange = vi.fn()
    const onSubmit = vi.fn()

    const { rerender } = render(
      <ManualEntryPanel
        activeProjectId="p1"
        projectTasks={[
          { id: 't1', title: 'Implement API' } as never,
          { id: 't2', title: 'Write docs' } as never,
        ]}
        manualTaskId=""
        manualDate="2026-06-10"
        manualHours="1"
        manualIsBillable
        manualNotes=""
        editingEntryId={null}
        isLoading={false}
        onManualTaskIdChange={onManualTaskIdChange}
        onManualDateChange={vi.fn()}
        onManualHoursChange={vi.fn()}
        onManualIsBillableChange={vi.fn()}
        onManualNotesChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(screen.getByRole('combobox', { name: 'Task' }), {
      target: { value: 't2' },
    })

    expect(onManualTaskIdChange).toHaveBeenCalledWith('t2')

    rerender(
      <ManualEntryPanel
        activeProjectId="p1"
        projectTasks={[
          { id: 't1', title: 'Implement API' } as never,
          { id: 't2', title: 'Write docs' } as never,
        ]}
        manualTaskId="t2"
        manualDate="2026-06-10"
        manualHours="1"
        manualIsBillable
        manualNotes=""
        editingEntryId={null}
        isLoading={false}
        onManualTaskIdChange={onManualTaskIdChange}
        onManualDateChange={vi.fn()}
        onManualHoursChange={vi.fn()}
        onManualIsBillableChange={vi.fn()}
        onManualNotesChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    const submitButton = screen.getByRole('button', { name: 'Save manual entry' })
    expect(submitButton).toBeEnabled()

    fireEvent.click(submitButton)

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})