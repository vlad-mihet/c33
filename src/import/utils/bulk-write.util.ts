import type { Model, AnyBulkWriteOperation } from 'mongoose';

import type { ImportSummary } from '../types/import.types';

/**
 * Executes bulk write operations and updates import summary
 *
 * @param model - Mongoose model to perform bulk write on
 * @param operations - Array of bulk write operations to execute
 * @param summary - Import summary to update with results
 * @returns Promise<void>
 *
 * @remarks
 * Updates the summary.inserted and summary.updated counts based on the
 * bulk write results. Only executes if there are operations to perform.
 */
export async function executeBulkWrite<T>(
  model: Model<T>,
  operations: Array<AnyBulkWriteOperation<T>>,
  summary: ImportSummary,
): Promise<void> {
  if (operations.length === 0) {
    return;
  }

  const result = await model.bulkWrite(operations);

  // Update summary with results
  summary.inserted = result.upsertedCount || 0;
  summary.updated = result.matchedCount || 0;
}
