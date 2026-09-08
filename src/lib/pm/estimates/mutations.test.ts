import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('../../supabase', () => ({
  supabase: { from: mocks.from },
}))

import {
  archivePackages,
  cloneEstimateWorkPackages,
  deletePackages,
  getEstimateTotalHours,
  getExistingDraftPackages,
  insertDraftPackage,
  insertEstimateVersion,
  markEstimateAsApproved,
  markEstimateAsDraft,
  updateEstimatePricePerHour,
  updateExistingPackage,
  updateProjectEstimatedHours,
} from './mutations'

function mutationQuery(result: { error: { message: string } | null } = { error: null }) {
  const query = {
    eq: vi.fn(),
    in: vi.fn(),
  }
  query.eq.mockResolvedValue(result)
  query.in.mockResolvedValue(result)
  return query
}

describe('estimate mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts a draft estimate version and returns the selected row', async () => {
    const row = { id: 'e2', project_id: 'p1', version_number: 2, status: 'draft', created_by: 'u1' }
    const single = vi.fn().mockResolvedValue({ data: row, error: null })
    const select = vi.fn().mockReturnValue({ single })
    const insert = vi.fn().mockReturnValue({ select })
    mocks.from.mockReturnValue({ insert })

    await expect(insertEstimateVersion('p1', 2, 'u1')).resolves.toEqual(row)
    expect(mocks.from).toHaveBeenCalledWith('estimates')
    expect(insert).toHaveBeenCalledWith({
      project_id: 'p1',
      version_number: 2,
      status: 'draft',
      created_by: 'u1',
    })
  })

  it('clones packages with stable order and normalized fallback colors', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    mocks.from.mockReturnValue({ insert })

    await cloneEstimateWorkPackages('e2', [
      { id: 'wp1', estimate_id: 'e1', name: 'UX', estimated_hours: 4, color: '#ABCDEF', is_active: true } as never,
      { id: 'wp2', estimate_id: 'e1', name: 'API', estimated_hours: 6, color: 'invalid', is_active: false } as never,
    ])

    expect(insert).toHaveBeenCalledWith([
      expect.objectContaining({ estimate_id: 'e2', name: 'UX', color: '#abcdef', sort_order: 0, is_active: true }),
      expect.objectContaining({ estimate_id: 'e2', name: 'API', sort_order: 1, is_active: false }),
    ])
  })

  it('does not query Supabase when cloning, deleting, or archiving empty package lists', async () => {
    await cloneEstimateWorkPackages('e1', [])
    await deletePackages([])
    await archivePackages([])

    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('loads existing draft package identities', async () => {
    const rows = [{ id: 'wp1', name: 'UX', is_active: true }]
    const eq = vi.fn().mockResolvedValue({ data: rows, error: null })
    const select = vi.fn().mockReturnValue({ eq })
    mocks.from.mockReturnValue({ select })

    await expect(getExistingDraftPackages('e1')).resolves.toEqual(rows)
    expect(eq).toHaveBeenCalledWith('estimate_id', 'e1')
  })

  it('updates and inserts draft packages with the complete persistence payload', async () => {
    const updateQuery = mutationQuery()
    const update = vi.fn().mockReturnValue(updateQuery)
    const insert = vi.fn().mockResolvedValue({ error: null })
    mocks.from.mockReturnValue({ update, insert })

    await updateExistingPackage('wp1', 'UX', 12, 1, '#123456')
    await insertDraftPackage('e1', 'QA', 8, 2, '#abcdef')

    expect(update).toHaveBeenCalledWith({
      name: 'UX', estimated_hours: 12, color: '#123456', sort_order: 1, is_active: true,
    })
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'wp1')
    expect(insert).toHaveBeenCalledWith({
      estimate_id: 'e1', name: 'QA', estimated_hours: 8, color: '#abcdef', sort_order: 2, is_active: true,
    })
  })

  it('deletes first-version leftovers and archives later-version leftovers', async () => {
    const deleteQuery = mutationQuery()
    const archiveQuery = mutationQuery()
    const deleteFn = vi.fn().mockReturnValue(deleteQuery)
    const update = vi.fn().mockReturnValue(archiveQuery)
    mocks.from.mockReturnValue({ delete: deleteFn, update })

    await deletePackages(['wp1', 'wp2'])
    await archivePackages(['wp3'])

    expect(deleteQuery.in).toHaveBeenCalledWith('id', ['wp1', 'wp2'])
    expect(update).toHaveBeenCalledWith({ is_active: false })
    expect(archiveQuery.in).toHaveBeenCalledWith('id', ['wp3'])
  })

  it('persists draft, approved, pricing, and project-hour state', async () => {
    const queries = [mutationQuery(), mutationQuery(), mutationQuery(), mutationQuery()]
    const update = vi.fn()
      .mockReturnValueOnce(queries[0])
      .mockReturnValueOnce(queries[1])
      .mockReturnValueOnce(queries[2])
      .mockReturnValueOnce(queries[3])
    mocks.from.mockReturnValue({ update })

    await markEstimateAsDraft('e1')
    await updateEstimatePricePerHour('e1', 1250)
    await markEstimateAsApproved('e1')
    await updateProjectEstimatedHours('p1', 42)

    expect(update.mock.calls[0][0]).toMatchObject({ status: 'draft' })
    expect(update.mock.calls[1][0]).toMatchObject({ price_per_hour: 1250 })
    expect(update.mock.calls[2][0]).toMatchObject({ status: 'approved' })
    expect(update.mock.calls[2][0].approved_at).toEqual(expect.any(String))
    expect(update.mock.calls[3][0]).toEqual({ estimated_hours: 42 })
  })

  it('does not update pricing when it was omitted', async () => {
    await updateEstimatePricePerHour('e1')
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('sums nullable package hours', async () => {
    const eq = vi.fn().mockResolvedValue({
      data: [{ estimated_hours: 10 }, { estimated_hours: null }, { estimated_hours: 2.5 }],
      error: null,
    })
    mocks.from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq }) })

    await expect(getEstimateTotalHours('e1')).resolves.toBe(12.5)
  })

  it('surfaces Supabase mutation errors', async () => {
    const query = mutationQuery({ error: { message: 'write failed' } })
    mocks.from.mockReturnValue({ update: vi.fn().mockReturnValue(query) })

    await expect(updateProjectEstimatedHours('p1', 10)).rejects.toThrow('write failed')
  })
})