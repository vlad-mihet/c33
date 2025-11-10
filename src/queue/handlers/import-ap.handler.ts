import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';

import { accountsPayableSchema } from '../../import/dtos/accounts-payable.joi';
import {
  AccountsPayable,
  AccountsPayableDocument,
} from '../../import/schemas/accounts-payable.schema';
import type { ImportType } from '../../import/types/import.types';
import { XlsxService } from '../../import/xlsx.service';

import { BaseImportHandler } from './base-import.handler';

/**
 * Handler for importing Accounts Payable data from XLSX files
 */
@Injectable()
export class ImportApHandler extends BaseImportHandler<AccountsPayableDocument> {
  protected readonly logger = new Logger(ImportApHandler.name);
  protected readonly importType: ImportType = 'ap';
  protected readonly schema = accountsPayableSchema;

  constructor(
    @InjectModel(AccountsPayable.name)
    protected readonly model: Model<AccountsPayableDocument>,
    protected readonly xlsxService: XlsxService,
  ) {
    super();
  }

  protected getUpsertFilter(
    value: Record<string, unknown>,
  ): Record<string, unknown> {
    return { apId: value['apId'] };
  }
}
