import { randomUUID } from 'crypto';

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response, Request } from 'express';

import { AppError } from '../errors/app-error';
import type { ErrorCode } from '../errors/error-codes';
import { ErrorCodes } from '../errors/error-codes';
import { mapUnknown } from '../errors/mappers';
import { problem } from '../utils/response.util';

/**
 * Catches exceptions and transforms to problem() response envelopes.
 * Adds correlationId, logs errors, maps Mongo/Joi/Multer/HttpException to AppError.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly isDevelopment = process.env['NODE_ENV'] === 'development';

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Generate or extract correlationId
    const correlationId = this.getCorrelationId(request);

    // Transform exception to AppError
    const appError = this.transformException(exception);

    // Log error with correlation ID and stack trace
    this.logError(request, appError, correlationId, exception);

    // Build error response envelope
    const errorResponse = problem(appError);

    // Add correlationId to error details
    errorResponse.error.correlationId = correlationId;

    // In development, optionally include stack trace
    if (this.isDevelopment && exception instanceof Error && exception.stack) {
      (errorResponse.error as { stack?: string }).stack = exception.stack;
    }

    // Send response
    response.status(appError.status).json(errorResponse);
  }

  /**
   * Get or generate correlation ID for request tracing
   */
  private getCorrelationId(request: Request): string {
    // Try to get from request headers
    const headerValue =
      request.headers['x-correlation-id'] || request.headers['x-request-id'];
    if (typeof headerValue === 'string') {
      return headerValue;
    }

    // Generate new UUID
    return randomUUID();
  }

  private transformException(exception: unknown): AppError {
    // Already an AppError
    if (exception instanceof AppError) {
      return exception;
    }

    // Legacy NestJS HttpException (backward compatibility)
    if (exception instanceof HttpException) {
      return this.transformHttpException(exception);
    }

    // Try intelligent mapping (Mongo, Joi, Multer, etc.)
    try {
      return mapUnknown(exception);
    } catch (error) {
      // Fallback if mapping fails
      this.logger.error('Failed to map exception', error);
      return AppError.wrapUnknown(exception);
    }
  }

  private transformHttpException(exception: HttpException): AppError {
    const status = exception.getStatus();
    const responseData = exception.getResponse();

    // Extract message and code from response
    let message = 'An error occurred';
    let code: ErrorCode = this.getDefaultCodeForStatus(status);
    let details: unknown;

    if (typeof responseData === 'string') {
      message = responseData;
    } else if (typeof responseData === 'object') {
      // TypeScript getResponse() returns string | object, where object excludes null
      const responseObj = responseData as {
        message?: string | string[];
        code?: string;
        error?: string;
        [key: string]: unknown;
      };

      // Extract message
      if (Array.isArray(responseObj.message)) {
        message = responseObj.message.join(', ');
      } else if (typeof responseObj.message === 'string') {
        message = responseObj.message;
      } else if (typeof responseObj.error === 'string') {
        message = responseObj.error;
      }

      // Extract code (validate it's a known ErrorCode, otherwise use default)
      if (
        typeof responseObj.code === 'string' &&
        this.isValidErrorCode(responseObj.code)
      ) {
        code = responseObj.code as ErrorCode;
      }

      // Extract additional details (exclude standard fields from details)
      const standardFields = new Set([
        'message',
        'code',
        'error',
        'statusCode',
      ]);

      const additionalDetails: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(responseObj)) {
        if (!standardFields.has(key)) {
          additionalDetails[key] = value;
        }
      }

      if (Object.keys(additionalDetails).length > 0) {
        details = additionalDetails;
      }
    }

    return new AppError(code, status, this.getTitleForStatus(status), message, {
      details,
    });
  }

  private isValidErrorCode(code: string): boolean {
    return Object.values(ErrorCodes).includes(code as ErrorCode);
  }

  private getDefaultCodeForStatus(status: number): ErrorCode {
    switch (status) {
      case 400:
        return ErrorCodes.VALIDATION_FAILED;
      case 404:
        return ErrorCodes.CUSTOMER_NOT_FOUND; // Generic not found
      case 409:
        return ErrorCodes.DB_DUPLICATE_KEY;
      case 500:
      default:
        return ErrorCodes.INTERNAL_SERVER_ERROR;
    }
  }

  private getTitleForStatus(status: number): string {
    switch (status) {
      case 400:
        return 'Bad Request';
      case 401:
        return 'Unauthorized';
      case 403:
        return 'Forbidden';
      case 404:
        return 'Not Found';
      case 409:
        return 'Conflict';
      case 412:
        return 'Precondition Failed';
      case 413:
        return 'Payload Too Large';
      case 415:
        return 'Unsupported Media Type';
      case 422:
        return 'Unprocessable Entity';
      case 429:
        return 'Too Many Requests';
      case 500:
        return 'Internal Server Error';
      case 503:
        return 'Service Unavailable';
      default:
        return 'Error';
    }
  }

  private logError(
    request: Request,
    appError: AppError,
    correlationId: string,
    originalException: unknown,
  ): void {
    const logContext = {
      correlationId,
      method: request.method,
      url: request.url,
      statusCode: appError.status,
      errorCode: appError.code,
      errorTitle: appError.title,
      errorMessage: appError.detail,
    };

    // Log error level based on status code
    const logLevel = appError.status >= 500 ? 'error' : 'warn';

    if (logLevel === 'error') {
      this.logger.error(
        `[${request.method}] ${request.url} - ${String(appError.status)} ${appError.code}`,
        originalException instanceof Error
          ? originalException.stack
          : JSON.stringify(logContext),
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - ${String(appError.status)} ${appError.code}: ${appError.detail}`,
      );
    }
  }
}
