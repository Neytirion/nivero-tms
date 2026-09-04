export type DomainErrorCode =
  | 'AUTH_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'DATABASE_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'

export class DomainError extends Error {
  readonly code: DomainErrorCode
  readonly cause?: unknown

  constructor(code: DomainErrorCode, message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = 'DomainError'
    this.code = code
    this.cause = options?.cause
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError
}

export function domainErrorFromUnknown(
  error: unknown,
  fallbackCode: DomainErrorCode = 'UNKNOWN_ERROR',
  fallbackMessage = 'Something went wrong',
) {
  if (isDomainError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new DomainError(fallbackCode, error.message, { cause: error })
  }

  return new DomainError(fallbackCode, fallbackMessage, { cause: error })
}

export function databaseError(message: string, cause?: unknown) {
  return new DomainError('DATABASE_ERROR', message, { cause })
}

export function authRequired(message = 'User is not authenticated') {
  return new DomainError('AUTH_REQUIRED', message)
}

export function permissionDenied(message: string) {
  return new DomainError('PERMISSION_DENIED', message)
}

export function validationError(message: string) {
  return new DomainError('VALIDATION_ERROR', message)
}

export function notFound(message: string) {
  return new DomainError('NOT_FOUND', message)
}

export function conflictError(message: string, cause?: unknown) {
  return new DomainError('CONFLICT', message, { cause })
}
