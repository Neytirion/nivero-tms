import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
  assertProjectEditable: vi.fn(),
}))

vi.mock('./supabase', () => ({
  supabase: {
    from: mocks.from,
    auth: {
      getUser: mocks.getUser,
    },
  },
}))

vi.mock('./pm.helpers', () => ({
  assertProjectEditable: mocks.assertProjectEditable,
}))

import { approveEstimate, getProjectEstimates } from './pm.estimates'

describe('pm.estimates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never)
    mocks.assertProjectEditable.mockResolvedValue(undefined)
  })

  it('allows manager to load draft estimate versions', async () => {
    const estimateEqCalls: Array<[string, string]> = []

    const projectMaybeSingle = vi.fn().mockResolvedValue({ data: { owner_id: 'owner-1' }, error: null })
    const projectEq = vi.fn().mockReturnValue({ maybeSingle: projectMaybeSingle })
    const projectSelect = vi.fn().mockReturnValue({ eq: projectEq })

    const membershipMaybeSingle = vi.fn().mockResolvedValue({ data: { role: 'manager' }, error: null })
    const membershipEqUser = vi.fn().mockReturnValue({ maybeSingle: membershipMaybeSingle })
    const membershipEqProject = vi.fn().mockReturnValue({ eq: membershipEqUser })
    const membershipSelect = vi.fn().mockReturnValue({ eq: membershipEqProject })

    const estimatesRows = [
      { id: 'e2', project_id: 'p1', version_number: 2, status: 'draft' },
      { id: 'e1', project_id: 'p1', version_number: 1, status: 'approved' },
    ]

    const estimatesQuery: {
      eq: ReturnType<typeof vi.fn>
      order: ReturnType<typeof vi.fn>
      then: (resolve: (value: { data: unknown[]; error: null }) => void) => void
    } = {
      eq: vi.fn((field: string, value: string) => {
        estimateEqCalls.push([field, value])
        return estimatesQuery
      }),
      order: vi.fn(() => estimatesQuery),
      then: (resolve) => resolve({ data: estimatesRows, error: null }),
    }
    const estimatesSelect = vi.fn().mockReturnValue(estimatesQuery)

    const packagesRows = [
      { id: 'wp1', estimate_id: 'e2', name: 'Backend', estimated_hours: 10, sort_order: 0, is_active: true, created_at: '2026-01-01' },
      { id: 'wp2', estimate_id: 'e1', name: 'Frontend', estimated_hours: 8, sort_order: 0, is_active: true, created_at: '2026-01-01' },
    ]
    const packagesQuery: {
      in: ReturnType<typeof vi.fn>
      order: ReturnType<typeof vi.fn>
      then: (resolve: (value: { data: unknown[]; error: null }) => void) => void
    } = {
      in: vi.fn(() => packagesQuery),
      order: vi.fn(() => packagesQuery),
      then: (resolve) => resolve({ data: packagesRows, error: null }),
    }
    const packagesSelect = vi.fn().mockReturnValue(packagesQuery)

    mocks.from.mockImplementation((table: string) => {
      if (table === 'projects') {
        return { select: projectSelect }
      }
      if (table === 'project_members') {
        return { select: membershipSelect }
      }
      if (table === 'estimates') {
        return { select: estimatesSelect }
      }
      if (table === 'work_packages') {
        return { select: packagesSelect }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const estimates = await getProjectEstimates('p1')

    expect(estimates).toHaveLength(2)
    expect(estimates[0].status).toBe('draft')
    expect(estimateEqCalls).not.toContainEqual(['status', 'approved'])
  })

  it('limits non-manager members to approved estimate versions', async () => {
    const estimateEqCalls: Array<[string, string]> = []

    const projectMaybeSingle = vi.fn().mockResolvedValue({ data: { owner_id: 'owner-1' }, error: null })
    const projectEq = vi.fn().mockReturnValue({ maybeSingle: projectMaybeSingle })
    const projectSelect = vi.fn().mockReturnValue({ eq: projectEq })

    const membershipMaybeSingle = vi.fn().mockResolvedValue({ data: { role: 'member' }, error: null })
    const membershipEqUser = vi.fn().mockReturnValue({ maybeSingle: membershipMaybeSingle })
    const membershipEqProject = vi.fn().mockReturnValue({ eq: membershipEqUser })
    const membershipSelect = vi.fn().mockReturnValue({ eq: membershipEqProject })

    const estimatesRows = [{ id: 'e1', project_id: 'p1', version_number: 1, status: 'approved' }]
    const estimatesQuery: {
      eq: ReturnType<typeof vi.fn>
      order: ReturnType<typeof vi.fn>
      then: (resolve: (value: { data: unknown[]; error: null }) => void) => void
    } = {
      eq: vi.fn((field: string, value: string) => {
        estimateEqCalls.push([field, value])
        return estimatesQuery
      }),
      order: vi.fn(() => estimatesQuery),
      then: (resolve) => resolve({ data: estimatesRows, error: null }),
    }
    const estimatesSelect = vi.fn().mockReturnValue(estimatesQuery)

    const packagesQuery: {
      in: ReturnType<typeof vi.fn>
      order: ReturnType<typeof vi.fn>
      then: (resolve: (value: { data: unknown[]; error: null }) => void) => void
    } = {
      in: vi.fn(() => packagesQuery),
      order: vi.fn(() => packagesQuery),
      then: (resolve) => resolve({ data: [], error: null }),
    }
    const packagesSelect = vi.fn().mockReturnValue(packagesQuery)

    mocks.from.mockImplementation((table: string) => {
      if (table === 'projects') {
        return { select: projectSelect }
      }
      if (table === 'project_members') {
        return { select: membershipSelect }
      }
      if (table === 'estimates') {
        return { select: estimatesSelect }
      }
      if (table === 'work_packages') {
        return { select: packagesSelect }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    await getProjectEstimates('p1')

    expect(estimateEqCalls).toContainEqual(['status', 'approved'])
  })

  it('blocks approving non-latest estimate versions', async () => {
    let estimatesCallCount = 0

    const updateEq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ eq: updateEq })

    mocks.from.mockImplementation((table: string) => {
      if (table !== 'estimates') {
        return { update }
      }

      estimatesCallCount += 1

      if (estimatesCallCount === 1) {
        const maybeSingle = vi.fn().mockResolvedValue({
          data: { id: 'e1', project_id: 'p1', version_number: 1, status: 'draft' },
          error: null,
        })
        const eq = vi.fn().mockReturnValue({ maybeSingle })
        const select = vi.fn().mockReturnValue({ eq })
        return { select }
      }

      const maybeSingle = vi.fn().mockResolvedValue({
        data: { version_number: 2 },
        error: null,
      })
      const limit = vi.fn().mockReturnValue({ maybeSingle })
      const order = vi.fn().mockReturnValue({ limit })
      const eq = vi.fn().mockReturnValue({ order })
      const select = vi.fn().mockReturnValue({ eq })
      return { select }
    })

    await expect(approveEstimate('e1')).rejects.toThrow(
      'Cannot approve estimate: previous estimate versions are read-only',
    )
  })
})
