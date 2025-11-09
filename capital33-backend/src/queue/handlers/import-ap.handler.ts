import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { promises as fs } from 'fs';
import { IJobHandler } from '../queue.types';
import { JobDocument } from '../schemas/job.schema';
import {
  AccountsPayable,
  AccountsPayableDocument,
} from '../../import/schemas/accounts-payable.schema';
import {
  parseXlsxFile,
  loadManifest,
  normalizeRow,
} from '../../import/utils/xlsx.util';
import { accountsPayableSchema } from '../../import/dtos/accounts-payable.joi';

export interface ImportSummary {
  totalRows: number;
  valid: number;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
    hint?: string;
  }>;
}

@Injectable()
export class ImportApHandler implements IJobHandler {
  private readonly logger = new Logger(ImportApHandler.name);

  constructor(
    @InjectModel(AccountsPayable.name)
    private readonly model: Model<AccountsPayableDocument>,
  ) {}

  async handle(job: JobDocument): Promise<ImportSummary> {
    const { filePath } = job.payload;

    if (!filePath) {
      throw new Error('filePath is required in job payload');
    }

    this.logger.log(`Importing Accounts Payable from: ${filePath}`);

    const summary: ImportSummary = {
      totalRows: 0,
      valid: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    try {
      const manifest = loadManifest();
      const config = manifest.importTypes['ap'];

      // Parse XLSX file
      const rows = parseXlsxFile(filePath, config.sheet);
      summary.totalRows = rows.length;

      this.logger.log(`Parsed ${rows.length} rows from XLSX`);

      // Prepare bulk operations
      const bulkOps: any[] = [];

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const rowNumber = i + 2; // Excel row number (accounting for header)
        const row = rows[i];

        try {
          // Normalize the row based on manifest mapping
          const normalized = normalizeRow(row, config.mapping, rowNumber);

          // Validate with Joi schema
          const { error, value } = accountsPayableSchema.validate(normalized);
          if (error) {
            summary.failed++;
            summary.errors.push({
              row: rowNumber,
              message: error.details.map((d) => d.message).join(', '),
            });
            continue;
          }

          summary.valid++;

          // Add to bulk operations (upsert by apId)
          bulkOps.push({
            updateOne: {
              filter: { apId: value.apId },
              update: { $set: value },
              upsert: true,
            },
          });
        } catch (error) {
          summary.failed++;
          summary.errors.push({
            row: rowNumber,
            message: error.message || String(error),
          });
        }
      }

      // Execute bulk write
      if (bulkOps.length > 0) {
        const result = await this.model.bulkWrite(bulkOps);
        summary.inserted = result.upsertedCount || 0;
        summary.updated =
          result.modifiedCount || bulkOps.length - summary.inserted;
      }

      this.logger.log(
        `Import complete: ${summary.inserted} inserted, ${summary.updated} updated, ${summary.failed} failed`,
      );

      return summary;
    } catch (error) {
      this.logger.error(`Import failed: ${error.message}`, error.stack);
      throw error;
    } finally {
      // Clean up uploaded files
      if (filePath.includes('upload-')) {
        try {
          await fs.unlink(filePath);
          this.logger.log(`Cleaned up uploaded file: ${filePath}`);
        } catch (cleanupError) {
          this.logger.warn(
            `Failed to clean up file ${filePath}: ${cleanupError.message}`,
          );
        }
      }
    }
  }
}
