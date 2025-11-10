/**
 * Error handling module
 *
 * Centralized error management with:
 * - AppError base class for operational errors
 * - Domain-specific error subclasses
 * - Library error mappers (MongoDB, Joi, Multer)
 * - Type-safe error codes
 *
 * @module errors
 */

// Error codes
export {
  ErrorCodes,
  ERROR_CODE_METADATA,
  type ErrorCode,
  type ErrorCodeMetadata,
} from './error-codes';

// Base error class
export { AppError, type AppErrorOptions } from './app-error';

// Domain-specific errors
export {
  ValidationError,
  AuthError,
  NotFoundError,
  ConflictError,
  PreconditionFailedError,
  UnsupportedMediaTypeError,
  UnprocessableEntityError,
  RateLimitError,
  ServiceUnavailableError,
  CustomerError,
  ImportError,
  QueueError,
  DatabaseError,
} from './domain-errors';

// Error mappers
export {
  mapMongoError,
  mapJoiError,
  mapMulterError,
  mapUnknown,
} from './mappers';
