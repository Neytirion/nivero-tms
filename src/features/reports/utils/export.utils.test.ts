import { afterEach, describe, expect, it, vi } from 'vitest'
import { utils, writeFile } from 'xlsx'
import { exportToXLSX } from './export.utils'
import type { TimeEntryReport } from '../types/reports'

vi.mock('xlsx', async () => {
  const actual = await vi.importActual<typeof import('xlsx')>('xlsx')
  return {
    ...actual,
    writeFile: vi.fn(),
  }
})

const mockedWriteFile = vi.mocked(writeFile)

const entry: TimeEntryReport = {
  id: 'entry-1',
  userId: 'user-1',
  memberName: 'Danylo',
  projectId: 'project-1',
  projectName: 'Apollo',
  clientName: 'Acme',
  taskId: null,
  entryDate: '2026-09-03',
  minutesSpent: 240,
  isBillable: true,
  startedAt: null,
  endedAt: null,
  createdAt: '2026-09-03T10:00:00Z',
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('exportToXLSX', () => {
  it('creates one contiguous table without duplicate empty columns', () => {
    exportToXLSX([entry])

    const workbook = mockedWriteFile.mock.calls[0]?.[0]
    expect(workbook).toBeDefined()

    const worksheet = workbook!.Sheets['Time Entries']
    expect(utils.sheet_to_json(worksheet, { header: 1 })).toEqual([
      ['Date', 'Member', 'Project', 'Client', 'Duration', 'Type'],
      ['Thu, Sep 3', 'Danylo', 'Apollo', 'Acme', '4h', 'Billable'],
    ])
  })
})
