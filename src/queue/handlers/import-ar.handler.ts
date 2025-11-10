import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';

import { accountsReceivableSchema } from '../../import/dtos/accounts-receivable.joi';
import {
  AccountsReceivable,
  AccountsReceivableDocument,
} from '../../import/schemas/accounts-receivable.schema';
import type { ImportType } from '../../import/types/import.types';
import { XlsxService } from '../../import/xlsx.service';

import { BaseImportHandler } from './base-import.handler';

/**
 * Handler for importing Accounts Receivable data from XLSX files
 */
@Injectable()
export class ImportArHandler extends BaseImportHandler<AccountsReceivableDocument> {
  protected readonly logger = new Logger(ImportArHandler.name);
  protected readonly importType: ImportType = 'ar';
  protected readonly schema = accountsReceivableSchema;

  constructor(
    @InjectModel(AccountsReceivable.name)
    protected readonly model: Model<AccountsReceivableDocument>,
    protected readonly xlsxService: XlsxService,
  ) {
    super();
  }

  protected getUpsertFilter(
    value: Record<string, unknown>,
  ): Record<string, unknown> {
    return { arId: value['arId'] };
  }
}
