import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BudgetForecastDocument = HydratedDocument<BudgetForecast>;

@Schema({ timestamps: true, collection: 'budget_forecast' })
export class BudgetForecast {
  @Prop({ required: true, min: 2000, max: 2100 })
  fiscalYear!: number;

  @Prop({ required: true })
  dept!: string;

  @Prop({ required: true, min: 1, max: 4 })
  quarter!: number;

  @Prop({ required: true })
  budgetUsd!: number;

  @Prop({ required: true })
  forecastUsd!: number;

  @Prop({ required: true })
  actualUsd!: number;

  @Prop({ required: true })
  varianceUsd!: number;

  @Prop()
  notes?: string;
}

export const BudgetForecastSchema =
  SchemaFactory.createForClass(BudgetForecast);

// Indexes - composite unique index on fiscal year, dept, and quarter
BudgetForecastSchema.index(
  { fiscalYear: 1, dept: 1, quarter: 1 },
  { unique: true },
);
BudgetForecastSchema.index({ dept: 1 });
BudgetForecastSchema.index({ quarter: 1 });
