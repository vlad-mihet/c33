import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type GeneralLedgerDocument = HydratedDocument<GeneralLedger>;

@Schema({ timestamps: true, collection: 'general_ledger' })
export class GeneralLedger {
  @Prop({ required: true, unique: true })
  glId: string;

  @Prop({ required: true, type: Date })
  txnDate: Date;

  @Prop({ required: true, type: Number })
  accountNumber: number;

  @Prop({ required: true })
  accountName: string;

  @Prop({ required: true, min: 0 })
  debit: number;

  @Prop({ required: true, min: 0 })
  credit: number;

  @Prop()
  dept?: string;

  @Prop()
  costCenter?: string;

  @Prop()
  description?: string;

  @Prop({ match: /^[A-Z]{3}$/ })
  currency?: string;
}

export const GeneralLedgerSchema = SchemaFactory.createForClass(GeneralLedger);

// Indexes
GeneralLedgerSchema.index({ glId: 1 }, { unique: true });
GeneralLedgerSchema.index({ txnDate: 1 });
GeneralLedgerSchema.index({ accountNumber: 1 });
GeneralLedgerSchema.index({ dept: 1 });
