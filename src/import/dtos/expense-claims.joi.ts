import * as Joi from 'joi';

import { requiredCurrency } from '../../common/validators/currency.validator';

export const expenseClaimsSchema = Joi.object({
  claimId: Joi.string().required(),
  employeeId: Joi.string().required(),
  submitDate: Joi.date().required(),
  category: Joi.string().required(),
  description: Joi.string().required(),
  amount: Joi.number().required(),
  currency: requiredCurrency,
  status: Joi.string()
    .valid('Submitted', 'Approved', 'Rejected', 'Paid')
    .required(),
  approvedBy: Joi.string().optional().allow(null, ''),
  payDate: Joi.date().optional().allow(null),
});

export interface ExpenseClaimsDto {
  claimId: string;
  employeeId: string;
  submitDate: Date;
  category: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  approvedBy?: string;
  payDate?: Date;
}
