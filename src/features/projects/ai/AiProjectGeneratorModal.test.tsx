import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AiProjectGeneratorModal } from './AiProjectGeneratorModal'
import { useGenerateProject } from './useGenerateProject'

vi.mock('./useGenerateProject', () => ({
  useGenerateProject: vi.fn(),
}))

const mockUseGenerateProject = vi.mocked(useGenerateProject)

describe('AiProjectGeneratorModal', () => {
  const generate = vi.fn(async () => undefined)
  const reset = vi.fn()

  beforeEach(() => {
    generate.mockClear()
    reset.mockClear()

    mockUseGenerateProject.mockReturnValue({
      isLoading: false,
      error: null,
      preview: null,
      validationErrors: null,
      generate,
      reset,
    })
  })

  it('does not render when closed', () => {
    render(
      <AiProjectGeneratorModal
        isOpen={false}
        onClose={() => undefined}
        onConfirm={async () => undefined}
      />,
    )

    expect(screen.queryByText(/generate project with ai/i)).not.toBeInTheDocument()
  })

  it('renders input step without cancel button and calls generate', async () => {
    render(
      <AiProjectGeneratorModal
        isOpen
        variant="inline"
        onClose={() => undefined}
        onConfirm={async () => undefined}
      />,
    )

    fireEvent.change(screen.getByPlaceholderText(/create a mobile app for time tracking/i), {
      target: { value: 'Build a CRM for internal sales team with dashboards' },
    })

    fireEvent.click(screen.getByRole('button', { name: /generate with ai/i }))

    expect(generate).toHaveBeenCalledWith('Build a CRM for internal sales team with dashboards')
    expect(screen.queryByRole('button', { name: /^cancel$/i })).not.toBeInTheDocument()
  })

  it('uses overlay only in modal variant', () => {
    const inlineRender = render(
      <AiProjectGeneratorModal
        isOpen
        variant="inline"
        onClose={() => undefined}
        onConfirm={async () => undefined}
      />,
    )

    expect(inlineRender.container.querySelector('.fixed.inset-0')).toBeNull()
    inlineRender.unmount()

    const modalRender = render(
      <AiProjectGeneratorModal
        isOpen
        variant="modal"
        onClose={() => undefined}
        onConfirm={async () => undefined}
      />,
    )

    expect(modalRender.container.querySelector('.fixed.inset-0')).not.toBeNull()
  })
})
