import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Global logging interceptor for request/response logging.
 * Logs method, URL, status code, and response time.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          const { statusCode } = response;
          const responseTime = Date.now() - now;
          this.logger.log(
            `${method} ${url} ${String(statusCode)} - ${String(responseTime)}ms`,
          );
        },
        error: (error: unknown) => {
          const responseTime = Date.now() - now;
          const status =
            error && typeof error === 'object' && 'status' in error
              ? (error.status as number)
              : 500;
          this.logger.error(
            `${method} ${url} ${String(status)} - ${String(responseTime)}ms`,
          );
        },
      }),
    );
  }
}
