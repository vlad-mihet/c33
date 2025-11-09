import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { QueueModule } from '../queue/queue.module';
import {
  AccountsPayable,
  AccountsPayableSchema,
} from './schemas/accounts-payable.schema';
import {
  AccountsReceivable,
  AccountsReceivableSchema,
} from './schemas/accounts-receivable.schema';
import {
  GeneralLedger,
  GeneralLedgerSchema,
} from './schemas/general-ledger.schema';
import {
  ExpenseClaims,
  ExpenseClaimsSchema,
} from './schemas/expense-claims.schema';
import {
  BudgetForecast,
  BudgetForecastSchema,
} from './schemas/budget-forecast.schema';

@Module({
  imports: [
    QueueModule,
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
})
export class ImportModule {}
