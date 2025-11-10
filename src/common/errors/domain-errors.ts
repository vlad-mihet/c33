import { AppError, type AppErrorOptions } from './app-error';
import type { ErrorCode } from './error-codes';

export class ValidationError extends AppError {
  constructor(code: ErrorCode, detail?: string, options?: AppErrorOptions) {
    super(
      code,
      400,
      'Validation Failed',
      detail || 'Validation failed',
      options,
    );
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthError extends AppError {
  constructor(
    code: ErrorCode,
    detail?: string,
    isAuthentication: boolean = true,
    options?: AppErrorOptions,
  ) {
    const status = isAuthentication ? 401 : 403;
    const title = isAuthentication
      ? 'Authentication Failed'
      : 'Authorization Failed';
    super(code, status, title, detail || title, options);
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(code: ErrorCode, detail?: string, options?: AppErrorOptions) {
    super(code, 404, 'Not Found', detail || 'Resource not found', options);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(code: ErrorCode, detail?: string, options?: AppErrorOptions) {
    super(code, 409, 'Conflict', detail || 'Resource conflict', options);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class PreconditionFailedError extends AppError {
  constructor(code: ErrorCode, detail?: string, options?: AppErrorOptions) {
    super(
      code,
      412,
      'Precondition Failed',
      detail || 'Precondition failed',
      options,
    );
    Object.setPrototypeOf(this, PreconditionFailedError.prototype);
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor(code: ErrorCode, detail?: string, options?: AppErrorOptions) {
    super(
      code,
      415,
      'Unsupported Media Type',
      detail || 'Unsupported media type',
      options,
    );
    Object.setPrototypeOf(this, UnsupportedMediaTypeError.prototype);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(code: ErrorCode, detail?: string, options?: AppErrorOptions) {
    super(
      code,
      422,
      'Unprocessable Entity',
      detail || 'Unprocessable entity',
      options,
    );
    Object.setPrototypeOf(this, UnprocessableEntityError.prototype);
  }
}

export class RateLimitError extends AppError {
  constructor(
    code: ErrorCode,
    detail?: string,
    options?: AppErrorOptions & { retryAfter?: number },
  ) {
    super(
      code,
      429,
      'Too Many Requests',
      detail || 'Too many requests',
      options,
    );
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(code: ErrorCode, detail?: string, options?: AppErrorOptions) {
    super(
      code,
      503,
      'Service Unavailable',
      detail || 'Service unavailable',
      options,
    );
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

// ============================================================================
// DOMAIN-SPECIFIC ERRORS
// ============================================================================

/**
 * CustomerError
 *
 * Domain-specific error for customer module.
 * Inherits status code from provided ErrorCode.
 * */
export class CustomerError extends AppError {
  constructor(
    code: ErrorCode,
    status: number,
    detail?: string,
    options?: AppErrorOptions,
  ) {
    super(code, status, 'Customer Error', detail || 'Customer error', options);
    Object.setPrototypeOf(this, CustomerError.prototype);
  }
}

/**
 * ImportError
 *
 * Domain-specific error for import module.
 * Inherits status code from provided ErrorCode.
 * */
export class ImportError extends AppError {
  constructor(
    code: ErrorCode,
    status: number,
    detail?: string,
    options?: AppErrorOptions,
  ) {
    super(code, status, 'Import Error', detail || 'Import error', options);
    Object.setPrototypeOf(this, ImportError.prototype);
  }
}

/**
 * QueueError
 *
 * Domain-specific error for queue module.
 * Inherits status code from provided ErrorCode.
 * */
export class QueueError extends AppError {
  constructor(
    code: ErrorCode,
    status: number,
    detail?: string,
    options?: AppErrorOptions,
  ) {
    super(code, status, 'Queue Error', detail || 'Queue error', options);
    Object.setPrototypeOf(this, QueueError.prototype);
  }
}

/**
 * DatabaseError
 *
 * Domain-specific error for database operations.
 * Inherits status code from provided ErrorCode.
 * */
export class DatabaseError extends AppError {
  constructor(
    code: ErrorCode,
    status: number,
    detail?: string,
    options?: AppErrorOptions,
  ) {
    super(code, status, 'Database Error', detail || 'Database error', options);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}
