import type { AppError } from '../errors/app-error';
import type {
  ApiSuccessResponse,
  ApiErrorResponse,
} from '../types/api-response.type';

/**
 * Create a successful API response envelope
 */
export function ok<T>(
  data: T,
  meta?: Record<string, unknown>,
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(meta && { meta }),
  };
}

/**
 * Create an error API response envelope
 *
 * Can accept either an AppError instance or individual parameters.
 *
 */
export function problem(
  errorOrParams:
    | AppError
    | { code: string; message: string; title?: string; details?: unknown },
): ApiErrorResponse {
  // Handle AppError instance
  if ('isOperational' in errorOrParams && errorOrParams.isOperational) {
    const appError = errorOrParams;

    const error: ApiErrorResponse['error'] = {
      code: appError.code,
      message: appError.detail,
    };

    if (appError.title) error.title = appError.title;

    if (appError.details !== undefined) error.details = appError.details;

    return { success: false, error };
  }

  // Handle raw params
  const params = errorOrParams as {
    code: string;
    message: string;
    title?: string;
    details?: unknown;
  };

  const error: ApiErrorResponse['error'] = {
    code: params.code,
    message: params.message,
  };

  if (params.title) error.title = params.title;

  if (params.details !== undefined) error.details = params.details;

  return { success: false, error };
}
