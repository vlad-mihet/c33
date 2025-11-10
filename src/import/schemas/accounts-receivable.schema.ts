import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

import {
  PaymentStatus,
  PAYMENT_STATUS_VALUES,
} from '../../common/constants/payment-status';
import { CURRENCY_CODE_PATTERN } from '../../common/validators/currency.validator';

export type AccountsReceivableDocument = HydratedDocument<AccountsReceivable>;

@Schema({ timestamps: true, collection: 'accounts_receivable' })
export class AccountsReceivable {
  @Prop({ required: true })
  arId!: string;

  @Prop({ required: true })
  customer!: string;

  @Prop({ required: true, type: Date })
  invoiceDate!: Date;

  @Prop({ required: true, type: Date })
  dueDate!: Date;

  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true, match: CURRENCY_CODE_PATTERN })
  currency!: string;

  @Prop({
    required: true,
    type: String,
    enum: PAYMENT_STATUS_VALUES,
  })
  status!: PaymentStatus;

  @Prop({ type: Date })
  receivedDate?: Date;

  @Prop()
  terms?: string;
}

export const AccountsReceivableSchema =
  SchemaFactory.createForClass(AccountsReceivable);

// Indexes
AccountsReceivableSchema.index({ arId: 1 }, { unique: true });
AccountsReceivableSchema.index({ customer: 1 });
AccountsReceivableSchema.index({ dueDate: 1 });
