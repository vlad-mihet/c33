import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { QueueModule } from '../queue/queue.module';
import { SharedModule } from '../shared/shared.module';

import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import {
  AccountsPayable,
  AccountsPayableSchema,
} from './schemas/accounts-payable.schema';
import {
  AccountsReceivable,
  AccountsReceivableSchema,
} from './schemas/accounts-receivable.schema';
import {
  BudgetForecast,
  BudgetForecastSchema,
} from './schemas/budget-forecast.schema';
import {
  ExpenseClaims,
  ExpenseClaimsSchema,
} from './schemas/expense-claims.schema';
import {
  GeneralLedger,
  GeneralLedgerSchema,
} from './schemas/general-ledger.schema';

@Module({
  imports: [
    QueueModule,
    SharedModule,
    MongooseModule.forFeature([
      { name: AccountsPayable.name, schema: AccountsPayableSchema },
      { name: AccountsReceivable.name, schema: AccountsReceivableSchema },
      { name: GeneralLedger.name, schema: GeneralLedgerSchema },
      { name: ExpenseClaims.name, schema: ExpenseClaimsSchema },
      { name: BudgetForecast.name, schema: BudgetForecastSchema },
    ]),
  ],
  controllers: [ImportsController],
  providers: [ImportsService],
  exports: [],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- NestJS requires class for @Module decorator
export class ImportModule {}
