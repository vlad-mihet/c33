/**
 * Centralized error code registry
 *
 * Error codes follow the pattern: <MODULE>_<CONTEXT>_<REASON>
 * All codes are in SCREAMING_SNAKE_CASE for consistency and machine-readability.
 *
 * @module error-codes
 */

export const ErrorCodes = {
  // ============================================================================
  // CUSTOMER MODULE
  // ============================================================================
  CUSTOMER_DUPLICATE_EMAIL: 'CUSTOMER_DUPLICATE_EMAIL',
  CUSTOMER_INVALID_ID: 'CUSTOMER_INVALID_ID',
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
  CUSTOMER_ETAG_MISMATCH: 'CUSTOMER_ETAG_MISMATCH',
  CUSTOMER_UPDATE_EMPTY: 'CUSTOMER_UPDATE_EMPTY',
  CUSTOMER_MISSING_EMAIL: 'CUSTOMER_MISSING_EMAIL',

  // ============================================================================
  // QUEUE MODULE
  // ============================================================================
  QUEUE_INVALID_TYPE: 'QUEUE_INVALID_TYPE',
  QUEUE_INVALID_PAYLOAD: 'QUEUE_INVALID_PAYLOAD',
  QUEUE_JOB_NOT_FOUND: 'QUEUE_JOB_NOT_FOUND',
  QUEUE_HANDLER_FAILED: 'QUEUE_HANDLER_FAILED',
  QUEUE_DLQ_NOT_FOUND: 'QUEUE_DLQ_NOT_FOUND',
  QUEUE_DLQ_MOVE_FAILED: 'QUEUE_DLQ_MOVE_FAILED',

  // ============================================================================
  // IMPORT MODULE
  // ============================================================================
  IMPORT_INVALID_TYPE: 'IMPORT_INVALID_TYPE',
  IMPORT_PATH_TRAVERSAL: 'IMPORT_PATH_TRAVERSAL',
  IMPORT_FILE_NOT_FOUND: 'IMPORT_FILE_NOT_FOUND',
  IMPORT_UNSUPPORTED_MEDIA_TYPE: 'IMPORT_UNSUPPORTED_MEDIA_TYPE',
  IMPORT_FILE_TOO_LARGE: 'IMPORT_FILE_TOO_LARGE',
  IMPORT_TYPE_INFERENCE_FAILED: 'IMPORT_TYPE_INFERENCE_FAILED',
  IMPORT_ROW_INVALID: 'IMPORT_ROW_INVALID',
  IMPORT_PARSE_FAILED: 'IMPORT_PARSE_FAILED',
  IMPORT_MANIFEST_NOT_FOUND: 'IMPORT_MANIFEST_NOT_FOUND',
  IMPORT_SHEET_NOT_FOUND: 'IMPORT_SHEET_NOT_FOUND',
  IMPORT_NO_SHEETS: 'IMPORT_NO_SHEETS',
  IMPORT_CONFIG_NOT_FOUND: 'IMPORT_CONFIG_NOT_FOUND',
  IMPORT_MISSING_FILE: 'IMPORT_MISSING_FILE',
  IMPORT_MISSING_FILENAME: 'IMPORT_MISSING_FILENAME',

  // ============================================================================
  // DATABASE
  // ============================================================================
  DB_DUPLICATE_KEY: 'DB_DUPLICATE_KEY',
  DB_OPERATION_FAILED: 'DB_OPERATION_FAILED',
  DB_CAST_ERROR: 'DB_CAST_ERROR',

  // ============================================================================
  // VALIDATION
  // ============================================================================
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_INVALID_OBJECTID: 'VALIDATION_INVALID_OBJECTID',

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  CONFIG_MONGODB_URI_MISSING: 'CONFIG_MONGODB_URI_MISSING',

  // ============================================================================
  // GENERIC
  // ============================================================================
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Type-safe error code type
 * Ensures only valid error codes from the ErrorCodes object can be used
 */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Error code metadata for documentation and client usage
 */
export interface ErrorCodeMetadata {
  code: ErrorCode;
  title: string;
  description: string;
  httpStatus: number;
  category:
    | 'customer'
    | 'queue'
    | 'import'
    | 'database'
    | 'validation'
    | 'config'
    | 'generic';
}

/**
 * Error code registry with metadata
 * Useful for generating documentation and providing context to clients
 */
export const ERROR_CODE_METADATA: Record<
  ErrorCode,
  Omit<ErrorCodeMetadata, 'code'>
> = {
  // Customer
  [ErrorCodes.CUSTOMER_DUPLICATE_EMAIL]: {
    title: 'Duplicate Email',
    description: 'A customer with this email already exists',
    httpStatus: 409,
    category: 'customer',
  },
  [ErrorCodes.CUSTOMER_INVALID_ID]: {
    title: 'Invalid Customer ID',
    description: 'The provided customer ID is not a valid ObjectId',
    httpStatus: 400,
    category: 'customer',
  },
  [ErrorCodes.CUSTOMER_NOT_FOUND]: {
    title: 'Customer Not Found',
    description: 'No customer found with the specified ID',
    httpStatus: 404,
    category: 'customer',
  },
  [ErrorCodes.CUSTOMER_ETAG_MISMATCH]: {
    title: 'Version Conflict',
    description:
      'The resource has been modified by another request (If-Match header mismatch)',
    httpStatus: 412,
    category: 'customer',
  },
  [ErrorCodes.CUSTOMER_UPDATE_EMPTY]: {
    title: 'Empty Update',
    description: 'At least one field must be provided for update',
    httpStatus: 400,
    category: 'customer',
  },
  [ErrorCodes.CUSTOMER_MISSING_EMAIL]: {
    title: 'Missing Email',
    description: 'Email is required for this operation',
    httpStatus: 400,
    category: 'customer',
  },

  // Queue
  [ErrorCodes.QUEUE_INVALID_TYPE]: {
    title: 'Invalid Job Type',
    description: 'The specified job type is not recognized',
    httpStatus: 400,
    category: 'queue',
  },
  [ErrorCodes.QUEUE_INVALID_PAYLOAD]: {
    title: 'Invalid Job Payload',
    description:
      'The job payload is missing required fields or contains invalid data',
    httpStatus: 400,
    category: 'queue',
  },
  [ErrorCodes.QUEUE_JOB_NOT_FOUND]: {
    title: 'Job Not Found',
    description: 'No job found with the specified ID',
    httpStatus: 404,
    category: 'queue',
  },
  [ErrorCodes.QUEUE_HANDLER_FAILED]: {
    title: 'Job Handler Failed',
    description: 'The job handler encountered an error during processing',
    httpStatus: 500,
    category: 'queue',
  },
  [ErrorCodes.QUEUE_DLQ_NOT_FOUND]: {
    title: 'DLQ Job Not Found',
    description: 'No dead letter queue job found with the specified ID',
    httpStatus: 404,
    category: 'queue',
  },
  [ErrorCodes.QUEUE_DLQ_MOVE_FAILED]: {
    title: 'DLQ Move Failed',
    description: 'Failed to move job to dead letter queue',
    httpStatus: 500,
    category: 'queue',
  },

  // Import
  [ErrorCodes.IMPORT_INVALID_TYPE]: {
    title: 'Invalid Import Type',
    description: 'The specified import type is not recognized',
    httpStatus: 400,
    category: 'import',
  },
  [ErrorCodes.IMPORT_PATH_TRAVERSAL]: {
    title: 'Path Traversal Detected',
    description:
      'The filename contains invalid characters or path traversal sequences',
    httpStatus: 400,
    category: 'import',
  },
  [ErrorCodes.IMPORT_FILE_NOT_FOUND]: {
    title: 'File Not Found',
    description: 'The specified file does not exist',
    httpStatus: 404,
    category: 'import',
  },
  [ErrorCodes.IMPORT_UNSUPPORTED_MEDIA_TYPE]: {
    title: 'Unsupported Media Type',
    description: 'Only .xlsx and .xls files are supported',
    httpStatus: 415,
    category: 'import',
  },
  [ErrorCodes.IMPORT_FILE_TOO_LARGE]: {
    title: 'File Too Large',
    description: 'The uploaded file exceeds the maximum allowed size',
    httpStatus: 413,
    category: 'import',
  },
  [ErrorCodes.IMPORT_TYPE_INFERENCE_FAILED]: {
    title: 'Type Inference Failed',
    description: 'Unable to determine import type from filename',
    httpStatus: 400,
    category: 'import',
  },
  [ErrorCodes.IMPORT_ROW_INVALID]: {
    title: 'Invalid Row Data',
    description: 'One or more rows contain invalid data',
    httpStatus: 400,
    category: 'import',
  },
  [ErrorCodes.IMPORT_PARSE_FAILED]: {
    title: 'Parse Failed',
    description: 'Failed to parse the XLSX file',
    httpStatus: 400,
    category: 'import',
  },
  [ErrorCodes.IMPORT_MANIFEST_NOT_FOUND]: {
    title: 'Manifest Not Found',
    description: 'Import manifest configuration file not found',
    httpStatus: 500,
    category: 'import',
  },
  [ErrorCodes.IMPORT_SHEET_NOT_FOUND]: {
    title: 'Sheet Not Found',
    description: 'The specified sheet does not exist in the workbook',
    httpStatus: 400,
    category: 'import',
  },
  [ErrorCodes.IMPORT_NO_SHEETS]: {
    title: 'No Sheets Found',
    description: 'The workbook contains no sheets',
    httpStatus: 400,
    category: 'import',
  },
  [ErrorCodes.IMPORT_CONFIG_NOT_FOUND]: {
    title: 'Config Not Found',
    description: 'Import configuration not found for the specified import type',
    httpStatus: 500,
    category: 'import',
  },
  [ErrorCodes.IMPORT_MISSING_FILE]: {
    title: 'Missing File',
    description: 'No file was provided in the request',
    httpStatus: 400,
    category: 'import',
  },
  [ErrorCodes.IMPORT_MISSING_FILENAME]: {
    title: 'Missing Filename',
    description: 'Filename parameter is required',
    httpStatus: 400,
    category: 'import',
  },

  // Database
  [ErrorCodes.DB_DUPLICATE_KEY]: {
    title: 'Duplicate Key',
    description: 'A record with this unique key already exists',
    httpStatus: 409,
    category: 'database',
  },
  [ErrorCodes.DB_OPERATION_FAILED]: {
    title: 'Database Operation Failed',
    description: 'A database operation failed',
    httpStatus: 500,
    category: 'database',
  },
  [ErrorCodes.DB_CAST_ERROR]: {
    title: 'Invalid Data Type',
    description: 'Failed to cast value to expected type',
    httpStatus: 400,
    category: 'database',
  },

  // Validation
  [ErrorCodes.VALIDATION_FAILED]: {
    title: 'Validation Failed',
    description: 'One or more validation rules failed',
    httpStatus: 400,
    category: 'validation',
  },
  [ErrorCodes.VALIDATION_INVALID_OBJECTID]: {
    title: 'Invalid ObjectId',
    description: 'The provided value is not a valid MongoDB ObjectId',
    httpStatus: 400,
    category: 'validation',
  },

  // Configuration
  [ErrorCodes.CONFIG_MONGODB_URI_MISSING]: {
    title: 'MongoDB URI Missing',
    description: 'MongoDB connection URI is required but not configured',
    httpStatus: 500,
    category: 'config',
  },

  // Generic
  [ErrorCodes.INTERNAL_SERVER_ERROR]: {
    title: 'Internal Server Error',
    description: 'An unexpected error occurred',
    httpStatus: 500,
    category: 'generic',
  },
  [ErrorCodes.UNKNOWN_ERROR]: {
    title: 'Unknown Error',
    description: 'An unknown error occurred',
    httpStatus: 500,
    category: 'generic',
  },
};
