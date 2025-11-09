import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AccountsPayableDocument = HydratedDocument<AccountsPayable>;

@Schema({ timestamps: true, collection: 'accounts_payable' })
export class AccountsPayable {
  @Prop({ required: true, unique: true })
  apId: string;

  @Prop({ required: true })
  vendor: string;

  @Prop({ required: true, type: Date })
  invoiceDate: Date;

  @Prop({ required: true, type: Date })
  dueDate: Date;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, match: /^[A-Z]{3}$/ })
  currency: string;

  @Prop({
    required: true,
    enum: ['Open', 'Paid', 'PartiallyPaid', 'Overdue', 'Canceled'],
  })
  status: string;

  @Prop({ type: Date })
  paidDate?: Date;

  @Prop()
  terms?: string;
}

export const AccountsPayableSchema =
  SchemaFactory.createForClass(AccountsPayable);

// Indexes
AccountsPayableSchema.index({ apId: 1 }, { unique: true });
AccountsPayableSchema.index({ vendor: 1 });
AccountsPayableSchema.index({ dueDate: 1 });
