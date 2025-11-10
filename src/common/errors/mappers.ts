import type { ValidationError as JoiValidationError } from 'joi';
import { MongoError } from 'mongodb';
import { Error as MongooseError } from 'mongoose';

import { AppError } from './app-error';
import { ValidationError, ConflictError, DatabaseError } from './domain-errors';
import { ErrorCodes, type ErrorCode } from './error-codes';

/**
 * Type guard for MongoDB errors
 */
function isMongoError(error: unknown): error is MongoError {
  return (
    error instanceof MongoError ||
    (error as { code?: number }).code !== undefined
  );
}

/**
 * Type guard for Mongoose errors
 */
function isMongooseError(error: unknown): error is MongooseError {
  return error instanceof MongooseError;
}

/**
 * Type guard for Joi validation errors
 */
function isJoiValidationError(error: unknown): error is JoiValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isJoi' in error &&
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-boolean-literal-compare
    (error as JoiValidationError).isJoi === true
  );
}

/**
 * Type guard for Multer errors
 */
interface MulterError extends Error {
  code: string;
  field?: string;
  storageErrors?: Error[];
}

function isMulterError(error: unknown): error is MulterError {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as MulterError).code === 'string' &&
    [
      'LIMIT_PART_COUNT',
      'LIMIT_FILE_SIZE',
      'LIMIT_FILE_COUNT',
      'LIMIT_FIELD_KEY',
      'LIMIT_FIELD_VALUE',
      'LIMIT_FIELD_COUNT',
      'LIMIT_UNEXPECTED_FILE',
    ].includes((error as MulterError).code)
  );
}

/**
 * Map MongoDB error to AppError
 *
 * Handles common MongoDB errors:
 * - E11000: Duplicate key error → ConflictError
 * - CastError: Invalid ObjectId or type → ValidationError
 * - Other errors → DatabaseError
 *
 * @param error - MongoDB error
 * @returns AppError instance
 * */
export function mapMongoError(error: unknown): AppError {
  // Handle MongoDB errors
  if (isMongoError(error)) {
    // E11000 duplicate key error
    if (error.code === 11000) {
      const errorLike = error as { keyValue?: Record<string, unknown> };
      let field = 'unknown';
      let value: unknown;

      if (errorLike.keyValue && Object.keys(errorLike.keyValue).length > 0) {
        const keys = Object.keys(errorLike.keyValue);
        field = keys[0] ?? 'unknown';
        if (field !== 'unknown') {
          value = errorLike.keyValue[field];
        }
      }

      return new ConflictError(
        ErrorCodes.DB_DUPLICATE_KEY,
        `A record with this ${field} already exists`,
        { details: { field, value } },
      );
    }

    // Other MongoDB errors
    return new DatabaseError(
      ErrorCodes.DB_OPERATION_FAILED,
      500,
      error.message || 'Database operation failed',
      { cause: error as unknown as Error },
    );
  }

  // Handle Mongoose errors
  if (isMongooseError(error)) {
    // Cast error (invalid ObjectId, type mismatch)
    if (error.name === 'CastError') {
      const castError = error as MongooseError.CastError;
      return new ValidationError(
        ErrorCodes.DB_CAST_ERROR,
        `Invalid value for ${castError.path}: ${String(castError.value)}`,
        {
          details: {
            path: castError.path,
            value: castError.value as unknown,
            kind: castError.kind,
          },
        },
      );
    }

    // Validation error
    if (error.name === 'ValidationError') {
      const validationError = error as MongooseError.ValidationError;
      const errors = Object.entries(validationError.errors).map(
        ([field, err]) => ({
          field,
          message: err.message,
        }),
      );

      return new ValidationError(
        ErrorCodes.VALIDATION_FAILED,
        'Validation failed',
        {
          details: errors,
        },
      );
    }

    // Generic Mongoose error
    return new DatabaseError(
      ErrorCodes.DB_OPERATION_FAILED,
      500,
      error.message || 'Database operation failed',
      { cause: error },
    );
  }

  // Fallback for unknown errors with MongoDB-like structure
  const errorLike = error as {
    code?: number;
    message?: string;
    keyValue?: Record<string, unknown>;
  };
  if (errorLike.code === 11000) {
    let field = 'unknown';
    let value: unknown;

    if (errorLike.keyValue && Object.keys(errorLike.keyValue).length > 0) {
      const keys = Object.keys(errorLike.keyValue);
      field = keys[0] ?? 'unknown';
      if (field !== 'unknown') {
        value = errorLike.keyValue[field];
      }
    }

    return new ConflictError(
      ErrorCodes.DB_DUPLICATE_KEY,
      `A record with this ${field} already exists`,
      { details: { field, value } },
    );
  }

  // Complete fallback
  return AppError.wrapUnknown(error, ErrorCodes.DB_OPERATION_FAILED);
}

/**
 * Map Joi validation error to ValidationError
 *
 * @param error - Joi ValidationError
 * @param codeOverride - Optional error code override (defaults to VALIDATION_FAILED)
 * @returns ValidationError instance
 * */
export function mapJoiError(
  error: JoiValidationError,
  codeOverride?: ErrorCode,
): ValidationError {
  const errors = error.details.map((detail) => ({
    field: detail.path.join('.'),
    message: detail.message,
    type: detail.type,
  }));

  return new ValidationError(
    codeOverride || ErrorCodes.VALIDATION_FAILED,
    'One or more validation rules failed',
    { details: errors },
  );
}

/**
 * Map Multer file upload error to AppError
 *
 * Handles common Multer errors:
 * - LIMIT_FILE_SIZE → 413 Payload Too Large
 * - LIMIT_FILE_COUNT → 400 Bad Request
 * - LIMIT_UNEXPECTED_FILE → 400 Bad Request
 * - Other errors → 400 Bad Request
 *
 * @param error - Multer error
 * @returns AppError instance
 * */
export function mapMulterError(error: MulterError): AppError {
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
        `Unexpected file in field: ${error.field ?? 'unknown'}`,
        { details: { field: error.field } },
      );

    case 'LIMIT_PART_COUNT':
    case 'LIMIT_FIELD_KEY':
    case 'LIMIT_FIELD_VALUE':
    case 'LIMIT_FIELD_COUNT':
      return new AppError(
        ErrorCodes.VALIDATION_FAILED,
        400,
        'Invalid Request',
        error.message || 'Request exceeds limits',
        { details: { code: error.code, field: error.field } },
      );

    default:
      return new AppError(
        ErrorCodes.IMPORT_PARSE_FAILED,
        400,
        'File Upload Failed',
        error.message || 'File upload failed',
        { cause: error },
      );
  }
}

/**
 * Map unknown error to AppError
 *
 * Intelligently detects error type and maps to appropriate AppError.
 * Falls back to AppError.wrapUnknown for unrecognized errors.
 *
 * @param error - Unknown error
 * @param codeOverride - Optional error code override
 * @returns AppError instance
 * */
export function mapUnknown(error: unknown, codeOverride?: ErrorCode): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Joi validation error
  if (isJoiValidationError(error)) {
    return mapJoiError(error, codeOverride);
  }

  // MongoDB/Mongoose error
  if (isMongoError(error) || isMongooseError(error)) {
    return mapMongoError(error);
  }

  // Multer error
  if (isMulterError(error)) {
    return mapMulterError(error);
  }

  // Fallback to AppError.wrapUnknown
  return AppError.wrapUnknown(error, codeOverride);
}
