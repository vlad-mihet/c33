import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ModuleRef } from '@nestjs/core';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { QueueWorkerService } from './queue.worker';
import { JobRepository } from './job.repository';
import { Job, JobSchema } from './schemas/job.schema';
import { ImportXlsxHandler } from './handlers/import-xlsx.handler';
import { ImportApHandler } from './handlers/import-ap.handler';
import { ImportArHandler } from './handlers/import-ar.handler';
import { ImportGlHandler } from './handlers/import-gl.handler';
import { ImportExpenseClaimsHandler } from './handlers/import-expense-claims.handler';
import { ImportBudgetForecastHandler } from './handlers/import-budget-forecast.handler';
import { CustomerModule } from '../customer/customer.module';
import { JobType } from './queue.constants';
import {
  AccountsPayable,
  AccountsPayableSchema,
} from '../import/schemas/accounts-payable.schema';
import {
  AccountsReceivable,
  AccountsReceivableSchema,
} from '../import/schemas/accounts-receivable.schema';
import {
  GeneralLedger,
  GeneralLedgerSchema,
} from '../import/schemas/general-ledger.schema';
import {
  ExpenseClaims,
  ExpenseClaimsSchema,
} from '../import/schemas/expense-claims.schema';
import {
  BudgetForecast,
  BudgetForecastSchema,
} from '../import/schemas/budget-forecast.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: AccountsPayable.name, schema: AccountsPayableSchema },
      { name: AccountsReceivable.name, schema: AccountsReceivableSchema },
      { name: GeneralLedger.name, schema: GeneralLedgerSchema },
      { name: ExpenseClaims.name, schema: ExpenseClaimsSchema },
      { name: BudgetForecast.name, schema: BudgetForecastSchema },
    ]),
    CustomerModule, // Import CustomerModule for CustomerRepository
  ],
  controllers: [QueueController],
  providers: [
    QueueService,
    QueueWorkerService,
    JobRepository,
    ImportXlsxHandler,
    ImportApHandler,
    ImportArHandler,
    ImportGlHandler,
    ImportExpenseClaimsHandler,
    ImportBudgetForecastHandler,
  ],
  exports: [QueueService, QueueWorkerService], // Export for use in other modules
})
export class QueueModule implements OnModuleInit {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly worker: QueueWorkerService,
  ) {}

  onModuleInit() {
    // Register job handlers
    const importHandler = this.moduleRef.get(ImportXlsxHandler, {
      strict: false,
    });
    this.worker.registerHandler(JobType.IMPORT_XLSX_CUSTOMERS, importHandler);

    // Register new import handlers
    const importApHandler = this.moduleRef.get(ImportApHandler, {
      strict: false,
    });
    this.worker.registerHandler(JobType.IMPORT_XLSX_AP, importApHandler);

    const importArHandler = this.moduleRef.get(ImportArHandler, {
      strict: false,
    });
    this.worker.registerHandler(JobType.IMPORT_XLSX_AR, importArHandler);

    const importGlHandler = this.moduleRef.get(ImportGlHandler, {
      strict: false,
    });
    this.worker.registerHandler(JobType.IMPORT_XLSX_GL, importGlHandler);

    const importExpenseClaimsHandler = this.moduleRef.get(
      ImportExpenseClaimsHandler,
      { strict: false },
    );
    this.worker.registerHandler(
      JobType.IMPORT_XLSX_EXPENSE_CLAIMS,
      importExpenseClaimsHandler,
    );

    const importBudgetForecastHandler = this.moduleRef.get(
      ImportBudgetForecastHandler,
      { strict: false },
    );
    this.worker.registerHandler(
      JobType.IMPORT_XLSX_BUDGET_FORECAST,
      importBudgetForecastHandler,
    );
  }
}
