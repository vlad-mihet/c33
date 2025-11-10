import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model, AnyBulkWriteOperation } from 'mongoose';

import { createCustomerSchema } from '../../customer/dtos/create-customer.joi';
import {
  Customer,
  CustomerDocument,
} from '../../customer/schemas/customer.schema';
import type { ImportType, ImportConfig } from '../../import/types/import.types';
import { addImportError } from '../../import/utils/summary.util';
import type { XlsxRow } from '../../import/utils/xlsx.util';
import { XlsxService } from '../../import/xlsx.service';
import type { ImportSummaryResult } from '../queue.types';

import { BaseImportHandler } from './base-import.handler';

/**
 * Handler for XLSX customer import jobs.
 * Reads XLSX file, validates rows, and imports customers with deduplication by email.
 *
 * Note: This handler uses a custom processRows implementation because customer imports
 * use normalizeCustomerRow() instead of manifest-based normalization.
 */
@Injectable()
export class ImportXlsxHandler extends BaseImportHandler<CustomerDocument> {
  protected readonly logger = new Logger(ImportXlsxHandler.name);
  protected readonly importType: ImportType = 'customers';
  protected readonly schema = createCustomerSchema;

  constructor(
    @InjectModel(Customer.name)
    protected readonly model: Model<CustomerDocument>,
    protected readonly xlsxService: XlsxService,
  ) {
    super();
  }

  protected getUpsertFilter(
    value: Record<string, unknown>,
  ): Record<string, unknown> {
    const email = value['email'];
    const emailCanonical = typeof email === 'string' ? email.toLowerCase() : '';
    return { emailCanonical };
  }

  protected override getSheetName(): string {
    return 'Customers';
  }

  /**
   * Override processRows to use normalizeCustomerRow instead of manifest-based normalization
   */
  protected override processRows(
    rows: Array<Record<string, unknown>>,
    _config: ImportConfig,
    summary: ImportSummaryResult,
  ): Array<AnyBulkWriteOperation<CustomerDocument>> {
    const bulkOps: Array<AnyBulkWriteOperation<CustomerDocument>> = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // Excel row number (accounting for header)

      try {
        const normalized = this.normalizeCustomerRow(rows[i], rowNumber);

        if (!normalized) {
          addImportError(
            summary,
            rowNumber,
            'Missing required fields (name or email)',
          );
          continue;
        }

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
        if (
          typeof value !== 'object' ||
          !('email' in value) ||
          typeof value['email'] !== 'string'
        ) {
          addImportError(summary, rowNumber, 'Invalid validated value');
          continue;
        }

        summary.valid++;

        // Manually set emailCanonical since bulk operations don't trigger pre-save hooks
        const email = value['email'];
        const emailCanonical =
          typeof email === 'string' ? email.toLowerCase() : '';
        const customerData: Record<string, unknown> = {
          ...value,
          emailCanonical,
        };

        const bulkOp = this.createBulkOperation(customerData);
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
   * Override to handle the case where customers don't have a manifest entry
   */
  protected override getImportConfig(): ImportConfig {
    return {
      description: 'Customer import',
      filename: 'Customers.xlsx',
      sheet: 'Customers',
      collection: 'customers',
      mapping: {},
      indexes: [],
    };
  }

  /**
   * Validate and normalize a row for customer import.
   * Handles different column name variations (name, Name, NAME, etc.)
   *
   * @param row - Raw row from XLSX
   * @param rowNumber - Row number for error reporting
   * @returns Normalized customer data or null if invalid
   */
  private normalizeCustomerRow(
    row: XlsxRow | undefined,
    rowNumber: number,
  ): { name: string; email: string; balance: number } | null {
    try {
      if (!row) {
        this.logger.warn(`Row ${String(rowNumber)}: Empty row`);
        return null;
      }

      const name = this.getRowValue(
        row,
        'name',
        'Name',
        'NAME',
        'customer_name',
        'CustomerName',
      );
      const email = this.getRowValue(
        row,
        'email',
        'Email',
        'EMAIL',
        'customer_email',
        'CustomerEmail',
      );
      const balance =
        this.getRowValue(row, 'balance', 'Balance', 'BALANCE') ?? 0;

      if (!name || !email) {
        this.logger.warn(`Row ${String(rowNumber)}: Missing name or email`);
        return null;
      }

      const nameStr =
        typeof name === 'string'
          ? name
          : typeof name === 'number'
            ? name.toString()
            : '';
      const emailStr =
        typeof email === 'string'
          ? email
          : typeof email === 'number'
            ? email.toString()
            : '';
      const balanceNum =
        typeof balance === 'number'
          ? balance
          : typeof balance === 'string'
            ? parseFloat(balance) || 0
            : 0;

      return {
        name: nameStr.trim(),
        email: emailStr.trim().toLowerCase(),
        balance: balanceNum,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Row ${String(rowNumber)}: Normalization error - ${message}`,
      );
      return null;
    }
  }

  /**
   * Helper method to get a value from a row by trying multiple possible keys
   * @param row - The row object
   * @param keys - Possible keys to try
   * @returns The first found value or undefined
   */
  private getRowValue(row: XlsxRow, ...keys: string[]): unknown {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined) {
        return value;
      }
    }
    return undefined;
  }
}
