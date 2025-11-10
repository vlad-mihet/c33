import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';

import { budgetForecastSchema } from '../../import/dtos/budget-forecast.joi';
import {
  BudgetForecast,
  BudgetForecastDocument,
} from '../../import/schemas/budget-forecast.schema';
import type { ImportType } from '../../import/types/import.types';
import { XlsxService } from '../../import/xlsx.service';

import { BaseImportHandler } from './base-import.handler';

/**
 * Handler for importing Budget Forecast data from XLSX files
 */
@Injectable()
export class ImportBudgetForecastHandler extends BaseImportHandler<BudgetForecastDocument> {
  protected readonly logger = new Logger(ImportBudgetForecastHandler.name);
  protected readonly importType: ImportType = 'budgetForecast';
  protected readonly schema = budgetForecastSchema;

  constructor(
    @InjectModel(BudgetForecast.name)
    protected readonly model: Model<BudgetForecastDocument>,
    protected readonly xlsxService: XlsxService,
  ) {
    super();
  }

  protected getUpsertFilter(
    value: Record<string, unknown>,
  ): Record<string, unknown> {
    // Composite key upsert
    return {
      fiscalYear: value['fiscalYear'],
      dept: value['dept'],
      quarter: value['quarter'],
    };
  }
}
