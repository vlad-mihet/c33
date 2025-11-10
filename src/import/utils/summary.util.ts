import type { Logger } from '@nestjs/common';

import type { ImportSummary, ImportError } from '../types/import.types';

/**
 * Creates a new import summary with default values
 *
 * @returns Initialized ImportSummary object with zero counts and empty error array
 */
export function createImportSummary(): ImportSummary {
  return {
    totalRows: 0,
    valid: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };
}

/**
 * Adds a validation error to the import summary
 *
 * @param summary - The import summary to update
 * @param rowNumber - The Excel row number (1-indexed, accounting for header)
 * @param message - Error message describing what went wrong
 * @param field - Optional field name that caused the error
 * @param hint - Optional hint for fixing the error
 */
export function addImportError(
  summary: ImportSummary,
  rowNumber: number,
  message: string,
  field?: string,
  hint?: string,
): void {
  summary.failed++;

  const error: ImportError = {
    row: rowNumber,
    message,
  };

  if (field) {
    error.field = field;
  }

  if (hint) {
    error.hint = hint;
  }

  summary.errors.push(error);
}

/**
 * Logs import completion with summary statistics
 *
 * @param logger - Logger instance
 * @param summary - Import summary with final statistics
 */
export function logImportCompletion(
  logger: Logger,
  summary: ImportSummary,
): void {
  logger.log(
    `Import complete: ${String(summary.inserted)} inserted, ${String(summary.updated)} updated, ${String(summary.failed)} failed`,
  );
}
