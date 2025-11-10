import * as Joi from 'joi';

import { PAYMENT_STATUS_VALUES } from '../../common/constants/payment-status';
import { requiredCurrency } from '../../common/validators/currency.validator';

export const accountsReceivableSchema = Joi.object({
  arId: Joi.string().required(),
  customer: Joi.string().required(),
  invoiceDate: Joi.date().required(),
  dueDate: Joi.date().required(),
  amount: Joi.number().required(),
  currency: requiredCurrency,
  status: Joi.string()
    .valid(...PAYMENT_STATUS_VALUES)
    .required(),
  receivedDate: Joi.date().optional().allow(null),
  terms: Joi.string().optional().allow(null, ''),
});

export interface AccountsReceivableDto {
  arId: string;
  customer: string;
  invoiceDate: Date;
  dueDate: Date;
  amount: number;
  currency: string;
  status: string;
  receivedDate?: Date;
  terms?: string;
}
