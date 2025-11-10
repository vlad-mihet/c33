import { Module, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';

import { CustomerModule } from '../customer/customer.module';
import {
  AccountsPayable,
  AccountsPayableSchema,
} from '../import/schemas/accounts-payable.schema';
import {
  AccountsReceivable,
  AccountsReceivableSchema,
} from '../import/schemas/accounts-receivable.schema';
import {
  BudgetForecast,
  BudgetForecastSchema,
} from '../import/schemas/budget-forecast.schema';
import {
  ExpenseClaims,
  ExpenseClaimsSchema,
} from '../import/schemas/expense-claims.schema';
import {
  GeneralLedger,
  GeneralLedgerSchema,
} from '../import/schemas/general-ledger.schema';
import { SharedModule } from '../shared/shared.module';

import { DeadLetterController } from './dead-letter.controller';
import { DeadLetterRepository } from './dead-letter.repository';
import { DeadLetterService } from './dead-letter.service';
import { ImportApHandler } from './handlers/import-ap.handler';
import { ImportArHandler } from './handlers/import-ar.handler';
import { ImportBudgetForecastHandler } from './handlers/import-budget-forecast.handler';
import { ImportExpenseClaimsHandler } from './handlers/import-expense-claims.handler';
import { ImportGlHandler } from './handlers/import-gl.handler';
import { ImportXlsxHandler } from './handlers/import-xlsx.handler';
import { JobRepository } from './job.repository';
import { JobType } from './queue.constants';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { QueueWorkerService } from './queue.worker';
import {
  DeadLetterJob,
  DeadLetterJobSchema,
} from './schemas/dead-letter-job.schema';
import { Job, JobSchema } from './schemas/job.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: DeadLetterJob.name, schema: DeadLetterJobSchema },
      { name: AccountsPayable.name, schema: AccountsPayableSchema },
      { name: AccountsReceivable.name, schema: AccountsReceivableSchema },
      { name: GeneralLedger.name, schema: GeneralLedgerSchema },
      { name: ExpenseClaims.name, schema: ExpenseClaimsSchema },
      { name: BudgetForecast.name, schema: BudgetForecastSchema },
    ]),
    CustomerModule, // Import CustomerModule for CustomerRepository
    SharedModule, // Import SharedModule for XlsxService
  ],
  controllers: [QueueController, DeadLetterController],
  providers: [
    QueueService,
    QueueWorkerService,
    JobRepository,
    DeadLetterRepository,
    DeadLetterService,
    ImportXlsxHandler,
    ImportApHandler,
    ImportArHandler,
    ImportGlHandler,
    ImportExpenseClaimsHandler,
    ImportBudgetForecastHandler,
  ],
  exports: [QueueService, QueueWorkerService, DeadLetterService],
})
export class QueueModule implements OnModuleInit {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly worker: QueueWorkerService,
  ) {}

  onModuleInit(): void {
    const handlers = [
      { type: JobType.IMPORT_XLSX_CUSTOMERS, handler: ImportXlsxHandler },
      { type: JobType.IMPORT_XLSX_AP, handler: ImportApHandler },
      { type: JobType.IMPORT_XLSX_AR, handler: ImportArHandler },
      { type: JobType.IMPORT_XLSX_GL, handler: ImportGlHandler },
      {
        type: JobType.IMPORT_XLSX_EXPENSE_CLAIMS,
        handler: ImportExpenseClaimsHandler,
      },
      {
        type: JobType.IMPORT_XLSX_BUDGET_FORECAST,
        handler: ImportBudgetForecastHandler,
      },
    ];

    for (const { type, handler } of handlers) {
      const handlerInstance = this.moduleRef.get(handler, { strict: false });
      this.worker.registerHandler(type, (job) => handlerInstance.handle(job));
    }
  }
}
