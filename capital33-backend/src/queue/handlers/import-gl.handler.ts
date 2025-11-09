import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { promises as fs } from 'fs';
import { IJobHandler } from '../queue.types';
import { JobDocument } from '../schemas/job.schema';
import {
  GeneralLedger,
  GeneralLedgerDocument,
} from '../../import/schemas/general-ledger.schema';
import {
  parseXlsxFile,
  loadManifest,
  normalizeRow,
} from '../../import/utils/xlsx.util';
import { generalLedgerSchema } from '../../import/dtos/general-ledger.joi';

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
export class ImportGlHandler implements IJobHandler {
  private readonly logger = new Logger(ImportGlHandler.name);

  constructor(
    @InjectModel(GeneralLedger.name)
    private readonly model: Model<GeneralLedgerDocument>,
  ) {}

  async handle(job: JobDocument): Promise<ImportSummary> {
    const { filePath } = job.payload;

    if (!filePath) {
      throw new Error('filePath is required in job payload');
    }

    this.logger.log(`Importing General Ledger from: ${filePath}`);

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
      const config = manifest.importTypes['gl'];

      const rows = parseXlsxFile(filePath, config.sheet);
      summary.totalRows = rows.length;

      this.logger.log(`Parsed ${rows.length} rows from XLSX`);

      const bulkOps: any[] = [];

      for (let i = 0; i < rows.length; i++) {
        const rowNumber = i + 2;
        const row = rows[i];

        try {
          const normalized = normalizeRow(row, config.mapping, rowNumber);

          const { error, value } = generalLedgerSchema.validate(normalized);
          if (error) {
            summary.failed++;
            summary.errors.push({
              row: rowNumber,
              message: error.details.map((d) => d.message).join(', '),
            });
            continue;
          }

          summary.valid++;

          bulkOps.push({
            updateOne: {
              filter: { glId: value.glId },
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
