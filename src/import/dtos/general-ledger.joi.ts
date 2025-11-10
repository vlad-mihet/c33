import * as Joi from 'joi';

import { optionalCurrency } from '../../common/validators/currency.validator';

export const generalLedgerSchema = Joi.object({
  glId: Joi.string().required(),
  txnDate: Joi.date().required(),
  accountNumber: Joi.number().integer().required(),
  accountName: Joi.string().required(),
  debit: Joi.number().min(0).required(),
  credit: Joi.number().min(0).required(),
  dept: Joi.string().optional().allow(null, ''),
  costCenter: Joi.string().optional().allow(null, ''),
  description: Joi.string().optional().allow(null, ''),
  currency: optionalCurrency,
}).custom((value: unknown, helpers) => {
  // At least one of debit or credit must be non-zero
  if (
    typeof value === 'object' &&
    value !== null &&
    'debit' in value &&
    'credit' in value &&
    (value as { debit: number; credit: number }).debit === 0 &&
    (value as { debit: number; credit: number }).credit === 0
  ) {
    return helpers.error('any.custom', {
      message: 'Either debit or credit must be greater than 0',
    });
  }
  return value;
});

export interface GeneralLedgerDto {
  glId: string;
  txnDate: Date;
  accountNumber: number;
  accountName: string;
  debit: number;
  credit: number;
  dept?: string;
  costCenter?: string;
  description?: string;
  currency?: string;
}
