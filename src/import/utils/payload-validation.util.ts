import { QueueError } from '../../common/errors/domain-errors';
import { ErrorCodes } from '../../common/errors/error-codes';
import { hasProperty, isString } from '../../common/types/guards';
import type { JobDocument } from '../../queue/schemas/job.schema';
import type { XlsxImportPayload } from '../types/import.types';

/**
 * Validates and extracts XLSX import payload from a job document
 *
 * @param job - The job document containing the payload
 * @returns Validated XlsxImportPayload with filePath
 * @throws QueueError if filePath is missing or invalid
 *
 * @remarks
 * Uses type guards to ensure type-safe extraction of the payload.
 * This prevents runtime errors from invalid payload structures.
 */
export function validateXlsxImportPayload(
  job: JobDocument,
): Pick<XlsxImportPayload, 'filePath'> {
  // Check if payload has filePath property
  if (!hasProperty(job.payload, 'filePath')) {
    throw new QueueError(
      ErrorCodes.QUEUE_INVALID_PAYLOAD,
      400,
      'filePath is required in job payload',
    );
  }

  const rawFilePath = job.payload['filePath'] as string;

  // Verify filePath is a string
  if (!isString(rawFilePath)) {
    throw new QueueError(
      ErrorCodes.QUEUE_INVALID_PAYLOAD,
      400,
      'filePath must be a string',
    );
  }

  return {
    filePath: rawFilePath,
  };
}
