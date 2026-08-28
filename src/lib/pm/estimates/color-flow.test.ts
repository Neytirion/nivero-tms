import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WORK_PACKAGE_COLOR_PALETTE } from '../work-package-colors'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  assertProjectEditable: vi.fn(),
  getEstimateWithProjectById: vi.fn(),
  getLatestEstimateVersion: vi.fn(),
  getExistingDraftPackages: vi.fn(),
  updateExistingPackage: vi.fn(),
  insertDraftPackage: vi.fn(),
  archivePackages: vi.fn(),
  deletePackages: vi.fn(),
  markEstimateAsDraft: vi.fn(),
  insertEstimateVersion: vi.fn(),
}))

vi.mock('../../supabase', () => ({
  supabase: {
    auth: {
      getUser: mocks.getUser,
    },
  },
}))

vi.mock('../helpers', () => ({
  assertProjectEditable: mocks.assertProjectEditable,
}))

vi.mock('./queries', () => ({
  getEstimateWithProjectById: mocks.getEstimateWithProjectById,
  getLatestEstimateVersion: mocks.getLatestEstimateVersion,
  getProjectEstimatePreviews: vi.fn(),
  getProjectMembershipRole: vi.fn(),
  getProjectOwner: vi.fn(),
  getWorkPackagesByEstimateIds: vi.fn(),
}))

vi.mock('./mutations', () => ({
  archivePackages: mocks.archivePackages,
  deletePackages: mocks.deletePackages,
  cloneEstimateWorkPackages: vi.fn(),
  getEstimateTotalHours: vi.fn(),
  getExistingDraftPackages: mocks.getExistingDraftPackages,
  insertDraftPackage: mocks.insertDraftPackage,
  insertEstimateVersion: mocks.insertEstimateVersion,
  markEstimateAsApproved: vi.fn(),
  markEstimateAsDraft: mocks.markEstimateAsDraft,
  updateExistingPackage: mocks.updateExistingPackage,
  updateEstimatePricePerHour: vi.fn(),
  updateProjectEstimatedHours: vi.fn(),
}))

import { createInitialEstimateVersion, saveEstimateDraft } from './index'

describe('pm.estimates color flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.getUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never)
    mocks.assertProjectEditable.mockResolvedValue(undefined)
    mocks.getEstimateWithProjectById.mockResolvedValue({
      id: 'e1',
      project_id: 'p1',
      version_number: 2,
      status: 'draft',
    } as never)
    mocks.getLatestEstimateVersion.mockResolvedValue({ version_number: 2 } as never)
    mocks.getExistingDraftPackages.mockResolvedValue([] as never)
    mocks.updateExistingPackage.mockResolvedValue(undefined)
    mocks.insertDraftPackage.mockResolvedValue(undefined)
    mocks.archivePackages.mockResolvedValue(undefined)
    mocks.markEstimateAsDraft.mockResolvedValue(undefined)
    mocks.insertEstimateVersion.mockResolvedValue({
      id: 'e-new',
      project_id: 'p1',
      version_number: 1,
      status: 'draft',
      created_by: 'u1',
      approved_at: null,
      created_at: '2026-08-19T00:00:00.000Z',
      updated_at: '2026-08-19T00:00:00.000Z',
    } as never)
  })

  it('saveEstimateDraft applies deterministic default colors and keeps explicit valid color', async () => {
    await saveEstimateDraft({
      estimateId: 'e1',
      workPackages: [
        { name: ' Discovery ', estimatedHours: 5, color: undefined },
        { name: 'Build', estimatedHours: 8, color: '#ABCDEF' },
        { name: 'QA', estimatedHours: 3, color: 'invalid-color' },
      ],
      isFirstVersion: true,
    })

    expect(mocks.insertDraftPackage).toHaveBeenNthCalledWith(
      1,
      'e1',
      'Discovery',
      5,
      0,
      WORK_PACKAGE_COLOR_PALETTE[0],
    )
    expect(mocks.insertDraftPackage).toHaveBeenNthCalledWith(
      2,
      'e1',
      'Build',
      8,
      1,
      '#abcdef',
    )
    expect(mocks.insertDraftPackage).toHaveBeenNthCalledWith(
      3,
      'e1',
      'QA',
      3,
      2,
      WORK_PACKAGE_COLOR_PALETTE[2],
    )
    expect(mocks.markEstimateAsDraft).toHaveBeenCalledWith('e1')
  })

  it('saveEstimateDraft updates existing package with normalized explicit color', async () => {
    mocks.getExistingDraftPackages.mockResolvedValue([
      { id: 'wp1', name: 'backend', is_active: true },
    ] as never)

    await saveEstimateDraft({
      estimateId: 'e1',
      workPackages: [
        { name: 'Backend', estimatedHours: 4, color: '#FF00FF' },
      ],
      isFirstVersion: true,
    })

    expect(mocks.updateExistingPackage).toHaveBeenCalledWith('wp1', 'Backend', 4, 0, '#ff00ff')
    expect(mocks.insertDraftPackage).not.toHaveBeenCalled()
  })

  it('createInitialEstimateVersion assigns palette defaults by index', async () => {
    await createInitialEstimateVersion('p1', [
      { name: 'Phase A', estimatedHours: '5' },
      { name: 'Phase B', estimatedHours: '2', color: 'bad' },
      { name: 'Phase C', estimatedHours: '1', color: '#123456' },
      { name: '', estimatedHours: '7' },
    ])

    expect(mocks.insertDraftPackage).toHaveBeenNthCalledWith(
      1,
      'e-new',
      'Phase A',
      5,
      0,
      WORK_PACKAGE_COLOR_PALETTE[0],
    )
    expect(mocks.insertDraftPackage).toHaveBeenNthCalledWith(
      2,
      'e-new',
      'Phase B',
      2,
      1,
      WORK_PACKAGE_COLOR_PALETTE[1],
    )
    expect(mocks.insertDraftPackage).toHaveBeenNthCalledWith(
      3,
      'e-new',
      'Phase C',
      1,
      2,
      '#123456',
    )
    expect(mocks.markEstimateAsDraft).toHaveBeenCalledWith('e-new')
  })

  it('createInitialEstimateVersion rejects duplicate work package names (case-insensitive)', async () => {
    await expect(
      createInitialEstimateVersion('p1', [
        { name: 'Backend', estimatedHours: '5' },
        { name: ' backend ', estimatedHours: '2' },
      ]),
    ).rejects.toThrow('Duplicate work package name: "backend" appears more than once')

    expect(mocks.insertEstimateVersion).not.toHaveBeenCalled()
    expect(mocks.insertDraftPackage).not.toHaveBeenCalled()
  })
})
