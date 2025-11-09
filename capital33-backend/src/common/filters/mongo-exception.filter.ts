import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { MongoError } from 'mongodb';

/**
 * Global exception filter to handle MongoDB-specific errors.
 * Maps duplicate key errors (E11000) to 409 Conflict.
 */
@Catch(MongoError)
export class MongoExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MongoExceptionFilter.name);

  catch(exception: MongoError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error(`MongoDB Error: ${exception.message}`, exception.stack);

    // Handle duplicate key error (E11000)
    if (
      exception.message.includes('E11000') ||
      exception.message.includes('duplicate key')
    ) {
      const field = this.extractDuplicateField(exception.message);
      return response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: `Duplicate entry${field ? ` for field: ${field}` : ''}`,
        error: 'Conflict',
      });
    }

    // Default to internal server error for other MongoDB errors
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database operation failed',
      error: 'Internal Server Error',
    });
  }

  private extractDuplicateField(message: string): string | null {
    // Extract field name from error message like: "E11000 duplicate key error collection: test.customers index: email_1 dup key: { email: \"test@example.com\" }"
    const match = message.match(/index: (\w+)_\d+/);
    return match ? match[1] : null;
  }
}
