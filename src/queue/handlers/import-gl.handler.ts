import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';

import { generalLedgerSchema } from '../../import/dtos/general-ledger.joi';
import {
  GeneralLedger,
  GeneralLedgerDocument,
} from '../../import/schemas/general-ledger.schema';
import type { ImportType } from '../../import/types/import.types';
import { XlsxService } from '../../import/xlsx.service';

import { BaseImportHandler } from './base-import.handler';

/**
 * Handler for importing General Ledger data from XLSX files
 */
@Injectable()
export class ImportGlHandler extends BaseImportHandler<GeneralLedgerDocument> {
  protected readonly logger = new Logger(ImportGlHandler.name);
  protected readonly importType: ImportType = 'gl';
  protected readonly schema = generalLedgerSchema;

  constructor(
    @InjectModel(GeneralLedger.name)
    protected readonly model: Model<GeneralLedgerDocument>,
    protected readonly xlsxService: XlsxService,
  ) {
    super();
  }

  protected getUpsertFilter(
    value: Record<string, unknown>,
  ): Record<string, unknown> {
    return { glId: value['glId'] };
  }
}
