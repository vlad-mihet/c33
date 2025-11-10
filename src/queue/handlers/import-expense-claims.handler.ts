import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';

import { expenseClaimsSchema } from '../../import/dtos/expense-claims.joi';
import {
  ExpenseClaims,
  ExpenseClaimsDocument,
} from '../../import/schemas/expense-claims.schema';
import type { ImportType } from '../../import/types/import.types';
import { XlsxService } from '../../import/xlsx.service';

import { BaseImportHandler } from './base-import.handler';

/**
 * Handler for importing Expense Claims data from XLSX files
 */
@Injectable()
export class ImportExpenseClaimsHandler extends BaseImportHandler<ExpenseClaimsDocument> {
  protected readonly logger = new Logger(ImportExpenseClaimsHandler.name);
  protected readonly importType: ImportType = 'expenseClaims';
  protected readonly schema = expenseClaimsSchema;

  constructor(
    @InjectModel(ExpenseClaims.name)
    protected readonly model: Model<ExpenseClaimsDocument>,
    protected readonly xlsxService: XlsxService,
  ) {
    super();
  }

  protected getUpsertFilter(
    value: Record<string, unknown>,
  ): Record<string, unknown> {
    return { claimId: value['claimId'] };
  }
}
