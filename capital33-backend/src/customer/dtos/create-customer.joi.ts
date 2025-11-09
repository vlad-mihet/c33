import * as Joi from 'joi';

export const createCustomerSchema = Joi.object({
  name: Joi.string().min(2).required().messages({
    'string.base': 'Name must be a string',
    'string.min': 'Name must be at least 2 characters long',
    'any.required': 'Name is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required',
  }),
  balance: Joi.number().default(0).messages({
    'number.base': 'Balance must be a number',
  }),
});

export interface CreateCustomerDto {
  name: string;
  email: string;
  balance?: number;
}
