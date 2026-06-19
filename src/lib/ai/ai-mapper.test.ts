import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AiProjectDraft } from './ai.types'

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    rpc: vi.fn(),
  },
}))

vi.mock('../supabase', () => ({
  supabase: mockSupabase,
}))

import { createProjectFromAiDraft } from './ai-mapper'

function createDraft(overrides: Partial<AiProjectDraft> = {}): AiProjectDraft {
  return {
    project: {
      name: 'AI Draft Project',
      customer_name: 'Example Customer',
      start_date: '2026-06-01',
      end_date: '2026-08-01',
      estimated_hours: 120,
      budget_amount: 45000,
    },
    estimates: {
      version_number: 1,
      work_packages: [
        {
          name: 'Discovery',
          estimated_hours: 24,
          tasks: [
            {
              title: 'Kickoff',
              description: 'Run kickoff workshop',
              priority: 'high',
              status: 'todo',
              estimate_hours: 4,
            },
          ],
        },
      ],
    },
    ...overrides,
  }
}

describe('createProjectFromAiDraft', () => {
  beforeEach(() => {
    mockSupabase.rpc.mockReset()
  })

  it('calls supabase.rpc with intact method context', async () => {
    mockSupabase.rpc.mockImplementation(function rpc(this: unknown) {
      expect(this).toBe(mockSupabase)

      return Promise.resolve({
        data: {
          success: true,
          project_id: 'project-123',
          estimate_id: 'estimate-123',
          task_count: 1,
          work_package_count: 1,
        },
        error: null,
      })
    })

    const result = await createProjectFromAiDraft(createDraft())

    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      success: true,
      projectId: 'project-123',
      estimateId: 'estimate-123',
      taskCount: 1,
    })
  })

  it('bubbles up rpc errors with feature-specific message', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: { message: 'RPC failed' },
    })

    await expect(createProjectFromAiDraft(createDraft())).rejects.toThrow(
      'Failed to create project from AI draft: RPC failed',
    )
  })
})
