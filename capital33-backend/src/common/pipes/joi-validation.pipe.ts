import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import type { ObjectSchema } from 'joi';

/**
 * Reusable Joi validation pipe for request payloads and data validation.
 * Usage: @UsePipes(new JoiValidationPipe(schema))
 */
@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private schema: ObjectSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    console.log('[DEBUG] Validating', metadata.type, 'with Joi schema');
    console.log('[DEBUG] Incoming value:', value);

    const { error, value: validatedValue } = this.schema.validate(value, {
      abortEarly: false, // Collect all errors
      stripUnknown: true, // Remove unknown properties
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors,
      });
    }

    return validatedValue;
  }
}
