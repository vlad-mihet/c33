import type { ValidationError as JoiValidationError } from 'joi';

import { ErrorCodes, type ErrorCode } from './error-codes';

export interface AppErrorOptions {
  details?: unknown;
  cause?: Error;
}

/**
 * Base error class. All operational errors extend this.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly title: string;
  readonly detail: string;
  readonly details?: unknown;
  override readonly cause?: Error;
  readonly isOperational: boolean = true;

  constructor(
    code: ErrorCode,
    status: number,
    title: string,
    detail?: string,
    options?: AppErrorOptions,
  ) {
    super(detail || title);

    // Maintain proper stack trace for where error was thrown (V8 only)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.title = title;
    this.detail = detail || title;
    this.details = options?.details;
    if (options?.cause) {
      this.cause = options.cause;
    }

    // Set prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Convert this error to a JSON representation
   */
  toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = {
      code: this.code,
      title: this.title,
      message: this.detail,
      status: this.status,
    };
    if (this.details !== undefined) {
      result['details'] = this.details;
    }
    return result;
  }

  /**
   * Factory: Create AppError from Joi validation error
   *
   * @param error - Joi ValidationError
   * @param codeOverride - Optional error code override (defaults to VALIDATION_FAILED)
   * @returns ValidationError instance
   *
   */
  static fromJoi(
    error: JoiValidationError,
    codeOverride?: ErrorCode,
  ): AppError {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    return new AppError(
      codeOverride || ErrorCodes.VALIDATION_FAILED,
      400,
      'Validation Failed',
      'One or more validation rules failed',
      { details: errors },
    );
  }

  /**
   * Factory: Create AppError from MongoDB error
   *
   * @param error - MongoDB error (any with code property)
   * @returns AppError instance
   *
   */
  static fromMongo(error: {
    code?: number;
    message: string;
    keyValue?: Record<string, unknown>;
  }): AppError {
    // E11000 duplicate key error
    if (error.code === 11000) {
      let field = 'unknown';
      let value: unknown;

      if (error.keyValue && Object.keys(error.keyValue).length > 0) {
        const keys = Object.keys(error.keyValue);
        field = keys[0] ?? 'unknown';
        if (field !== 'unknown') {
          value = error.keyValue[field];
        }
      }

      return new AppError(
        ErrorCodes.DB_DUPLICATE_KEY,
        409,
        'Duplicate Key',
        `A record with this ${field} already exists`,
        { details: { field, value } },
      );
    }

    // Cast error (invalid ObjectId, type mismatch)
    if (
      error.message.includes('Cast to ObjectId failed') ||
      error.message.includes('CastError')
    ) {
      return new AppError(
        ErrorCodes.DB_CAST_ERROR,
        400,
        'Invalid Data Type',
        'Failed to cast value to expected type',
        { details: { cause: error.message } },
      );
    }

    // Generic database error
    return new AppError(
      ErrorCodes.DB_OPERATION_FAILED,
      500,
      'Database Operation Failed',
      'A database operation failed',
      { cause: error as unknown as Error },
    );
  }

  /**
   * Factory: Create AppError from Multer file upload error
   *
   * @param error - Multer error
   * @returns AppError instance
   *
   */
  static fromMulter(error: {
    code?: string;
    message: string;
    field?: string;
  }): AppError {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return new AppError(
          ErrorCodes.IMPORT_FILE_TOO_LARGE,
          413,
          'File Too Large',
          'The uploaded file exceeds the maximum allowed size',
          { details: { field: error.field } },
        );

      case 'LIMIT_FILE_COUNT':
        return new AppError(
          ErrorCodes.IMPORT_MISSING_FILE,
          400,
          'Too Many Files',
          'Too many files uploaded',
          { details: { field: error.field } },
        );

      case 'LIMIT_UNEXPECTED_FILE':
        return new AppError(
          ErrorCodes.IMPORT_MISSING_FILE,
          400,
          'Unexpected File',
          'Unexpected file field',
          { details: { field: error.field } },
        );

      default:
        return new AppError(
          ErrorCodes.IMPORT_PARSE_FAILED,
          400,
          'File Upload Failed',
          error.message || 'File upload failed',
          { cause: error as unknown as Error },
        );
    }
  }

  /**
   * Factory: Wrap unknown error as AppError
   *
   * @param error - Unknown error (any type)
   * @param codeOverride - Optional error code override
   * @returns AppError instance
   *
   */
  static wrapUnknown(error: unknown, codeOverride?: ErrorCode): AppError {
    // Already an AppError
    if (error instanceof AppError) {
      return error;
    }

    // Standard Error
    if (error instanceof Error) {
      return new AppError(
        codeOverride || ErrorCodes.UNKNOWN_ERROR,
        500,
        'Unknown Error',
        error.message,
        { cause: error },
      );
    }

    // String error
    if (typeof error === 'string') {
      return new AppError(
        codeOverride || ErrorCodes.UNKNOWN_ERROR,
        500,
        'Unknown Error',
        error,
      );
    }

    // Completely unknown
    return new AppError(
      codeOverride || ErrorCodes.UNKNOWN_ERROR,
      500,
      'Unknown Error',
      'An unexpected error occurred',
      { details: { rawError: error } },
    );
  }
}
