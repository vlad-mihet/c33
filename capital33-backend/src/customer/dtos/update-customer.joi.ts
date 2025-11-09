import * as Joi from 'joi';

export const updateCustomerSchema = Joi.object({
  name: Joi.string().min(2).optional().messages({
    'string.base': 'Name must be a string',
    'string.min': 'Name must be at least 2 characters long',
  }),
  email: Joi.string().email().optional().messages({
    'string.email': 'Email must be a valid email address',
  }),
  balance: Joi.number().optional().messages({
    'number.base': 'Balance must be a number',
  }),
}).min(1); // At least one field must be provided

export interface UpdateCustomerDto {
  name?: string;
  email?: string;
  balance?: number;
}
