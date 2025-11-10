import { PipeTransform, Injectable } from '@nestjs/common';
import type { ObjectSchema, ValidationResult } from 'joi';

import { ValidationError } from '../errors/domain-errors';
import { ErrorCodes } from '../errors/error-codes';

/**
 * Reusable Joi validation pipe for request payloads and data validation.
 * Usage: @UsePipes(new JoiValidationPipe(schema))
 */
@Injectable()
export class JoiValidationPipe implements PipeTransform<unknown, unknown> {
  constructor(private schema: ObjectSchema) {}

  transform(value: unknown): unknown {
    const result: ValidationResult = this.schema.validate(value, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (result.error) {
      const errors = result.error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));
      throw new ValidationError(
        ErrorCodes.VALIDATION_FAILED,
        'Validation failed',
        { details: errors },
      );
    }

    return result.value as unknown;
  }
}
