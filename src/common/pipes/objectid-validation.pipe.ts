import { PipeTransform, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';

import { ValidationError } from '../errors/domain-errors';
import { ErrorCodes } from '../errors/error-codes';

/**
 * Validates that a string parameter is a valid MongoDB ObjectId.
 * Prevents CastError exceptions from invalid IDs.
 * Usage: @Param('id', ObjectIdValidationPipe) id: string
 */
@Injectable()
export class ObjectIdValidationPipe implements PipeTransform<string> {
  transform(value: string): string {
    if (!Types.ObjectId.isValid(value)) {
      throw new ValidationError(
        ErrorCodes.VALIDATION_INVALID_OBJECTID,
        `Invalid ObjectId: ${value}`,
        { details: { value } },
      );
    }
    return value;
  }
}
