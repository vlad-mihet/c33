import * as Joi from 'joi';

export const budgetForecastSchema = Joi.object({
  fiscalYear: Joi.number().integer().min(2000).max(2100).required(),
  dept: Joi.string().required(),
  quarter: Joi.number().integer().min(1).max(4).required(),
  budgetUsd: Joi.number().required(),
  forecastUsd: Joi.number().required(),
  actualUsd: Joi.number().required(),
  varianceUsd: Joi.number().required(),
  notes: Joi.string().optional().allow(null, ''),
});

export interface BudgetForecastDto {
  fiscalYear: number;
  dept: string;
  quarter: number;
  budgetUsd: number;
  forecastUsd: number;
  actualUsd: number;
  varianceUsd: number;
  notes?: string;
}
