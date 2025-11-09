import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { IJobHandler } from '../queue.types';
import { JobDocument } from '../schemas/job.schema';
import { CustomerRepository } from '../../customer/customer.repository';
import {
  parseXlsxFile,
  normalizeCustomerRow,
} from '../../import/utils/xlsx.util';
import { createCustomerSchema } from '../../customer/dtos/create-customer.joi';

export interface ImportSummary {
  totalRows: number;
  valid: number;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; reason: string }>;
}

/**
 * Handler for XLSX customer import jobs.
 * Reads XLSX file, validates rows, and imports customers with deduplication.
 */
@Injectable()
export class ImportXlsxHandler implements IJobHandler {
  private readonly logger = new Logger(ImportXlsxHandler.name);

  constructor(private readonly customerRepository: CustomerRepository) {}

  async handle(job: JobDocument): Promise<ImportSummary> {
    const { filePath } = job.payload;

    if (!filePath) {
      throw new Error('filePath is required in job payload');
    }

    this.logger.log(`Importing customers from: ${filePath}`);

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
      // Parse XLSX file
      const rows = parseXlsxFile(filePath, 'Customers');
      summary.totalRows = rows.length;

      this.logger.log(`Parsed ${rows.length} rows from XLSX`);

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const rowNumber = i + 2; // Excel row number (accounting for header)
        const row = rows[i];

        try {
          // Normalize the row
          const normalized = normalizeCustomerRow(row, rowNumber);
          if (!normalized) {
            summary.failed++;
            summary.errors.push({
              row: rowNumber,
              reason: 'Missing required fields (name or email)',
            });
            continue;
          }

          // Validate with Joi schema
          const { error } = createCustomerSchema.validate(normalized);
          if (error) {
            summary.failed++;
            summary.errors.push({
              row: rowNumber,
              reason: error.details.map((d) => d.message).join(', '),
            });
            continue;
          }

          summary.valid++;

          // Upsert customer by email
          const result =
            await this.customerRepository.upsertByEmail(normalized);

          if (result.wasNew) {
            summary.inserted++;
          } else {
            summary.updated++;
          }
        } catch (error) {
          summary.failed++;
          summary.errors.push({
            row: rowNumber,
            reason: error.message || String(error),
          });
        }
      }

      this.logger.log(
        `Import complete: ${summary.inserted} inserted, ${summary.updated} updated, ${summary.failed} failed`,
      );

      return summary;
    } catch (error) {
      this.logger.error(`Import failed: ${error.message}`, error.stack);
      throw error;
    } finally {
      // Clean up uploaded files (files with 'upload-' prefix)
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
