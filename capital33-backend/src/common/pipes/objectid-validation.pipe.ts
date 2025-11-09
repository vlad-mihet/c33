import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

/**
 * Validates that a string parameter is a valid MongoDB ObjectId.
 * Prevents CastError exceptions from invalid IDs.
 * Usage: @Param('id', ObjectIdValidationPipe) id: string
 */
@Injectable()
export class ObjectIdValidationPipe implements PipeTransform<string> {
  transform(value: string): string {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ObjectId: ${value}`);
    }
    return value;
  }
}
