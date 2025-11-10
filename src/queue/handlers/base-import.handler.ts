import type { Logger } from '@nestjs/common';
import type { ObjectSchema } from 'joi';
import type { Model, AnyBulkWriteOperation } from 'mongoose';

import { ImportError } from '../../common/errors/domain-errors';
import { ErrorCodes } from '../../common/errors/error-codes';
import type {
  ImportType,
  ImportConfig,
  ImportManifest,
} from '../../import/types/import.types';
import { executeBulkWrite } from '../../import/utils/bulk-write.util';
import { cleanupImportFile } from '../../import/utils/file-cleanup.util';
import { validateXlsxImportPayload } from '../../import/utils/payload-validation.util';
import {
  createImportSummary,
  addImportError,
  logImportCompletion,
} from '../../import/utils/summary.util';
import { normalizeRow } from '../../import/utils/xlsx.util';
import type { XlsxService } from '../../import/xlsx.service';
import type { IJobHandler, ImportSummaryResult } from '../queue.types';
import type { JobDocument } from '../schemas/job.schema';

/**
 * Base handler for XLSX imports. Subclasses provide schema, model, and upsert filter.
 */
export abstract class BaseImportHandler<T>
  implements IJobHandler<ImportSummaryResult>
{
  protected abstract readonly logger: Logger;
  protected abstract readonly model: Model<T>;
  protected abstract readonly schema: ObjectSchema;
  protected abstract readonly importType: ImportType;
  protected abstract readonly xlsxService: XlsxService;

  /**
   * Return filter for upsert (e.g., {email} or {year, dept, quarter})
   */
  protected abstract getUpsertFilter(
    value: Record<string, unknown>,
  ): Record<string, unknown>;

  protected getSheetName(): string | undefined {
    return undefined;
  }

  /**
   * Main handler method - implements the import flow
   *
   * @param job - The job document containing the import payload
   * @returns Import summary with statistics and errors
   */
  async handle(job: JobDocument): Promise<ImportSummaryResult> {
    const { filePath } = validateXlsxImportPayload(job);

    this.logger.log(`Importing ${this.importType} from: ${filePath}`);

    const summary = createImportSummary();

    try {
      const manifest = this.xlsxService.loadManifest();
      const config = this.getImportConfig(manifest);

      const sheetName = this.getSheetName() || config.sheet;
      const rows = this.xlsxService.parseXlsxFile(filePath, sheetName);
      summary.totalRows = rows.length;

      this.logger.log(`Parsed ${String(rows.length)} rows from XLSX`);

      const bulkOps = this.processRows(rows, config, summary);

      await executeBulkWrite(this.model, bulkOps, summary);

      logImportCompletion(this.logger, summary);

      return summary;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Import failed: ${errorMessage}`, errorStack);
      throw error;
    } finally {
      await cleanupImportFile(filePath, this.logger);
    }
  }

  /**
   * Gets the import configuration from the manifest
   *
   * @param manifest - The loaded manifest
   * @returns Import configuration for this handler's type
   * @throws Error if configuration not found
   */
  protected getImportConfig(manifest: ImportManifest): ImportConfig {
    // Cast importTypes to a potentially undefined indexable type so the
    // subsequent lookup can legitimately be absent at runtime and the
    // null-check below is meaningful to the type checker.
    const importTypes = manifest.importTypes as
      | Partial<Record<string, ImportConfig>>
      | undefined;

    const config = importTypes?.[this.importType];

    if (!config) {
      throw new ImportError(
        ErrorCodes.IMPORT_CONFIG_NOT_FOUND,
        500,
        `Import configuration not found for type: ${this.importType}`,
      );
    }

    return config;
  }

  /**
   * Processes all rows and creates bulk write operations
   *
   * @param rows - Parsed XLSX rows
   * @param config - Import configuration
   * @param summary - Summary to update with results
   * @returns Array of bulk write operations
   */
  protected processRows(
    rows: Array<Record<string, unknown>>,
    config: ImportConfig,
    summary: ImportSummaryResult,
  ): Array<AnyBulkWriteOperation<T>> {
    const bulkOps: Array<AnyBulkWriteOperation<T>> = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // Excel row number (accounting for header)
      const row = rows[i];
      if (!row) continue;

      try {
        const normalized = normalizeRow(
          row,
          config.mapping,
          config.valueTransformations,
        );

        const validationResult = this.schema.validate(normalized);

        if (validationResult.error) {
          addImportError(
            summary,
            rowNumber,
            validationResult.error.details.map((d) => d.message).join(', '),
          );
          continue;
        }

        const value = validationResult.value as Record<string, unknown>;
        if (typeof value !== 'object') {
          addImportError(summary, rowNumber, 'Invalid validated value');
          continue;
        }

        summary.valid++;

        const bulkOp = this.createBulkOperation(value);
        bulkOps.push(bulkOp);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addImportError(summary, rowNumber, errorMessage);
      }
    }

    return bulkOps;
  }

  /**
   * Creates a bulk write operation for a validated row
   *
   * @param value - Validated row data (already validated by Joi)
   * @returns Bulk write operation
   * @throws Error if value is invalid or missing required fields
   */
  protected createBulkOperation(
    value: Record<string, unknown>,
  ): AnyBulkWriteOperation<T> {
    const filter = this.getUpsertFilter(value);

    return {
      updateOne: {
        filter,
        update: { $set: value as Partial<T> },
        upsert: true,
      },
    };
  }
}
