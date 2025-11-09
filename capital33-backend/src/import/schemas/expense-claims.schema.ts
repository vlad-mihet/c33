import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ExpenseClaimsDocument = HydratedDocument<ExpenseClaims>;

@Schema({ timestamps: true, collection: 'expense_claims' })
export class ExpenseClaims {
  @Prop({ required: true, unique: true })
  claimId: string;

  @Prop({ required: true })
  employeeId: string;

  @Prop({ required: true, type: Date })
  submitDate: Date;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, match: /^[A-Z]{3}$/ })
  currency: string;

  @Prop({
    required: true,
    enum: ['Submitted', 'Approved', 'Rejected', 'Paid'],
  })
  status: string;

  @Prop()
  approvedBy?: string;

  @Prop({ type: Date })
  payDate?: Date;
}

export const ExpenseClaimsSchema = SchemaFactory.createForClass(ExpenseClaims);

// Indexes
ExpenseClaimsSchema.index({ claimId: 1 }, { unique: true });
ExpenseClaimsSchema.index({ employeeId: 1 });
ExpenseClaimsSchema.index({ submitDate: 1 });
