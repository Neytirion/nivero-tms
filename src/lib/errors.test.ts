import { describe, expect, it } from 'vitest'
import {
  DomainError,
  authRequired,
  conflictError,
  databaseError,
  domainErrorFromUnknown,
  isDomainError,
  permissionDenied,
  validationError,
} from './errors'

describe('DomainError', () => {
  it('preserves a stable error code and message', () => {
    const error = permissionDenied('You cannot update this task')

    expect(error).toBeInstanceOf(DomainError)
    expect(error.code).toBe('PERMISSION_DENIED')
    expect(error.message).toBe('You cannot update this task')
    expect(isDomainError(error)).toBe(true)
  })

  it('supports common domain error categories', () => {
    expect(authRequired().code).toBe('AUTH_REQUIRED')
    expect(validationError('Invalid input').code).toBe('VALIDATION_ERROR')
    expect(databaseError('Database failed').code).toBe('DATABASE_ERROR')
    expect(conflictError('Already exists').code).toBe('CONFLICT')
  })

  it('normalizes unknown failures without losing the original cause', () => {
    const cause = new Error('network failed')
    const normalized = domainErrorFromUnknown(cause, 'NETWORK_ERROR')

    expect(normalized.code).toBe('NETWORK_ERROR')
    expect(normalized.message).toBe('network failed')
    expect(normalized.cause).toBe(cause)
  })
})
