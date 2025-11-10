import * as Joi from 'joi';

export const updateCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(120).trim().optional().messages({
    'string.base': 'Name must be a string',
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name must not exceed 120 characters',
  }),
  email: Joi.string().email().trim().lowercase().optional().messages({
    'string.email': 'Email must be a valid email address',
  }),
  balance: Joi.number().min(0).optional().messages({
    'number.base': 'Balance must be a number',
    'number.min': 'Balance must be greater than or equal to 0',
  }),
})
  .min(1)
  .messages({
    'object.min': 'At least one field must be provided for update',
  })
  .options({
    convert: true,
    stripUnknown: true,
  });

export interface UpdateCustomerDto {
  name?: string;
  email?: string;
  balance?: number;
}
