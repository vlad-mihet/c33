import * as Joi from 'joi';

export const createCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(120).trim().required().messages({
    'string.base': 'Name must be a string',
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name must not exceed 120 characters',
    'any.required': 'Name is required',
  }),
  email: Joi.string().email().trim().lowercase().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required',
  }),
  balance: Joi.number().min(0).default(0).messages({
    'number.base': 'Balance must be a number',
    'number.min': 'Balance must be greater than or equal to 0',
  }),
}).options({
  convert: true,
  stripUnknown: true,
});

export interface CreateCustomerDto {
  name: string;
  email: string;
  balance?: number;
}
