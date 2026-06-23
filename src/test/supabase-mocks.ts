import { vi } from 'vitest'

/**
 * Mock helper for Supabase query builders
 * Reduces brittle nested vi.fn() chains to simple, maintainable mocks
 *
 * Instead of:
 *   const select = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(...) })
 *
 * Use:
 *   mockSupabaseQuery({ table: 'projects', rows: [...] })
 */

interface MockQueryOptions<T = Record<string, unknown>> {
  table?: string
  rows: T[]
  error?: { message: string } | null
}

interface MockQueryBuilder {
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  neq: ReturnType<typeof vi.fn>
  gt: ReturnType<typeof vi.fn>
  gte: ReturnType<typeof vi.fn>
  lt: ReturnType<typeof vi.fn>
  lte: ReturnType<typeof vi.fn>
  like: ReturnType<typeof vi.fn>
  ilike: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  range: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  then: (cb: (value: unknown) => void) => void
}

/**
 * Create a chainable mock query builder that resolves with the provided rows
 * Supports common Supabase query methods: select, eq, in, order, limit, maybeSingle, etc.
 */
export function mockSupabaseQuery<T = Record<string, unknown>>(
  options: MockQueryOptions<T>,
): MockQueryBuilder {
  const { rows, error = null } = options

  const createChainable = (): MockQueryBuilder => ({
    select: vi.fn().mockReturnValue(createChainable()),
    eq: vi.fn().mockReturnValue(createChainable()),
    in: vi.fn().mockReturnValue(createChainable()),
    neq: vi.fn().mockReturnValue(createChainable()),
    gt: vi.fn().mockReturnValue(createChainable()),
    gte: vi.fn().mockReturnValue(createChainable()),
    lt: vi.fn().mockReturnValue(createChainable()),
    lte: vi.fn().mockReturnValue(createChainable()),
    like: vi.fn().mockReturnValue(createChainable()),
    ilike: vi.fn().mockReturnValue(createChainable()),
    order: vi.fn().mockReturnValue(createChainable()),
    limit: vi.fn().mockReturnValue(createChainable()),
    range: vi.fn().mockReturnValue(createChainable()),
    maybeSingle: vi.fn().mockResolvedValue({ data: rows[0] || null, error }),
    single: vi.fn().mockResolvedValue({ data: rows[0], error }),
    then: (cb: (value: unknown) => void) => cb({ data: rows, error }),
  })

  return createChainable()
}

/**
 * Create mock Supabase client with common tables pre-configured
 * Useful for test setup with multiple table queries
 */
export function createMockSupabaseClient(tables: Record<string, unknown[]> = {}) {
  const mockTables: Record<string, MockQueryBuilder> = {}

  // Pre-create mocks for common tables
  const commonTables = ['projects', 'tasks', 'project_members', 'time_entries', 'estimates', 'work_packages', 'estimates_items']
  
  for (const table of commonTables) {
    mockTables[table] = mockSupabaseQuery({ table, rows: tables[table] || [] })
  }

  // Allow custom tables
  for (const [table, rows] of Object.entries(tables)) {
    if (!mockTables[table]) {
      mockTables[table] = mockSupabaseQuery({ table, rows: rows as Record<string, unknown>[] })
    }
  }

  return {
    from: vi.fn((table: string) => mockTables[table] || mockSupabaseQuery({ rows: [] })),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  }
}

/**
 * Helper to verify that a filter was applied in test
 * Usage: expectFilterApplied(mockQuery.eq, 'project_id', 'p1')
 */
export function expectFilterApplied(
  filterFn: ReturnType<typeof vi.fn>,
  field: string,
  value: unknown,
) {
  const calls = filterFn.mock.calls
  const found = calls.some(([callField, callValue]) => callField === field && callValue === value)
  if (!found) {
    throw new Error(
      `Expected filter ${field} = ${value}, but got calls: ${JSON.stringify(calls)}`,
    )
  }
}
