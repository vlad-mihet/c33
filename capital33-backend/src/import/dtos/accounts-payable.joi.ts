import * as Joi from 'joi';

export const accountsPayableSchema = Joi.object({
  apId: Joi.string().required(),
  vendor: Joi.string().required(),
  invoiceDate: Joi.date().required(),
  dueDate: Joi.date().required(),
  amount: Joi.number().required(),
  currency: Joi.string()
    .pattern(/^[A-Z]{3}$/)
    .required(),
  status: Joi.string()
    .valid('Open', 'Paid', 'PartiallyPaid', 'Overdue', 'Canceled')
    .required(),
  paidDate: Joi.date().optional().allow(null),
  terms: Joi.string().optional().allow(null, ''),
});

export interface AccountsPayableDto {
  apId: string;
  vendor: string;
  invoiceDate: Date;
  dueDate: Date;
  amount: number;
  currency: string;
  status: string;
  paidDate?: Date;
  terms?: string;
}
