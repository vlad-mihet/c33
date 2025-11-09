import * as Joi from 'joi';

export const accountsReceivableSchema = Joi.object({
  arId: Joi.string().required(),
  customer: Joi.string().required(),
  invoiceDate: Joi.date().required(),
  dueDate: Joi.date().required(),
  amount: Joi.number().required(),
  currency: Joi.string()
    .pattern(/^[A-Z]{3}$/)
    .required(),
  status: Joi.string()
    .valid('Open', 'Paid', 'PartiallyPaid', 'Overdue', 'Canceled')
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
