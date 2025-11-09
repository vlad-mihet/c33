import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AccountsReceivableDocument = HydratedDocument<AccountsReceivable>;

@Schema({ timestamps: true, collection: 'accounts_receivable' })
export class AccountsReceivable {
  @Prop({ required: true, unique: true })
  arId: string;

  @Prop({ required: true })
  customer: string;

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
