import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock('../supabase', () => ({
  supabase: {
    from: mocks.from,
    auth: { getUser: mocks.getUser },
  },
}))

import {
  DEFAULT_TASK_CARD_FIELD_PREFERENCES,
  getProjectTaskCardColorSettings,
  getProjectTaskCardFieldPreferences,
  getProjectWorkPackageDisplayProfileById,
  updateProjectTaskCardColor,
  updateProjectTaskCardFieldPreferences,
} from './work-packages'

const estimates = [
  { id: 'e1', version_number: 1 },
  { id: 'e2', version_number: 2 },
]

const packages = [
  { id: 'old-ux', estimate_id: 'e1', name: 'Old UX', color: '#111111', sort_order: 0, is_active: true, created_at: '2026-01-01' },
  { id: 'new-ux', estimate_id: 'e2', name: 'UX/UI', color: '#ABCDEF', sort_order: 0, is_active: true, created_at: '2026-02-01' },
  { id: 'api', estimate_id: 'e2', name: 'API', color: null, sort_order: 1, is_active: true, created_at: '2026-02-01' },
]

function selectRows(rows: unknown[]) {
  const query = {
    eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
    in: vi.fn().mockResolvedValue({ data: rows, error: null }),
  }
  return { select: vi.fn().mockReturnValue(query), query }
}

function mockPackageQueries() {
  const estimatesQuery = selectRows(estimates)
  const packagesQuery = selectRows(packages)
  mocks.from.mockImplementation((table: string) => {
    if (table === 'estimates') return estimatesQuery
    if (table === 'work_packages') return packagesQuery
    throw new Error(`Unexpected table: ${table}`)
  })
  return { estimatesQuery, packagesQuery }
}

describe('project work package presentation settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  })

  it('uses the latest estimate package as canonical profile for the same slot', async () => {
    mockPackageQueries()

    const profiles = await getProjectWorkPackageDisplayProfileById('p1')

    expect(profiles['old-ux']).toEqual({ settingKey: 'slot:0', displayName: 'UX/UI', color: '#abcdef' })
    expect(profiles['new-ux']).toEqual(profiles['old-ux'])
    expect(profiles.api).toEqual({ settingKey: 'slot:1', displayName: 'API', color: '#94a3b8' })
  })

  it('groups historical package versions and reports linked counts', async () => {
    mockPackageQueries()

    await expect(getProjectTaskCardColorSettings('p1')).resolves.toEqual([
      { settingKey: 'slot:1', displayName: 'API', color: '#94a3b8', linkedPackageCount: 1 },
      { settingKey: 'slot:0', displayName: 'UX/UI', color: '#abcdef', linkedPackageCount: 2 },
    ])
  })

  it('returns empty package settings when a project has no estimates', async () => {
    const estimateQuery = selectRows([])
    mocks.from.mockReturnValue(estimateQuery)

    await expect(getProjectTaskCardColorSettings('p1')).resolves.toEqual([])
    expect(mocks.from).toHaveBeenCalledTimes(1)
  })

  it('updates all historical packages sharing a slot', async () => {
    const estimatesQuery = selectRows(estimates)
    const packagesQuery = selectRows(packages)
    const inFilter = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn().mockReturnValue({ in: inFilter })
    let workPackageCalls = 0
    mocks.from.mockImplementation((table: string) => {
      if (table === 'estimates') return estimatesQuery
      if (table === 'work_packages') {
        workPackageCalls += 1
        return workPackageCalls === 1 ? packagesQuery : { update }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    await updateProjectTaskCardColor('p1', 'slot:0', '#00FF00')

    expect(update).toHaveBeenCalledWith({ color: '#00ff00' })
    expect(inFilter).toHaveBeenCalledWith('id', ['old-ux', 'new-ux'])
  })

  it('rejects invalid color and unknown package groups before writing', async () => {
    await expect(updateProjectTaskCardColor('p1', 'slot:0', 'green')).rejects.toThrow('valid hex')
    expect(mocks.from).not.toHaveBeenCalled()

    mockPackageQueries()
    await expect(updateProjectTaskCardColor('p1', 'slot:99', '#123456')).rejects.toThrow('group not found')
  })

  it('returns default field preferences when no project row exists', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    mocks.from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq }) })

    await expect(getProjectTaskCardFieldPreferences('p1')).resolves.toEqual(DEFAULT_TASK_CARD_FIELD_PREFERENCES)
  })

  it('maps stored field preferences and attributes updates to the current user', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        show_description: false,
        show_priority: true,
        show_due_state: false,
        show_due_date: true,
        show_assignee: false,
        show_work_package: true,
      },
      error: null,
    })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const upsert = vi.fn().mockResolvedValue({ error: null })
    mocks.from
      .mockReturnValueOnce({ select: vi.fn().mockReturnValue({ eq }) })
      .mockReturnValueOnce({ upsert })

    const preferences = await getProjectTaskCardFieldPreferences('p1')
    expect(preferences).toEqual({
      showDescription: false,
      showPriority: true,
      showDueState: false,
      showDueDate: true,
      showAssignee: false,
      showWorkPackage: true,
    })

    await updateProjectTaskCardFieldPreferences('p1', preferences)
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      project_id: 'p1',
      updated_by: 'u1',
      show_description: false,
      show_assignee: false,
    }))
  })
})