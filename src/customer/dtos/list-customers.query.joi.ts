import * as Joi from 'joi';

const ALLOWED_SORT_FIELDS = [
  'name',
  'email',
  'balance',
  'createdAt',
  '-name',
  '-email',
  '-balance',
  '-createdAt',
] as const;

export const listCustomersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1',
  }),
  pageSize: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.base': 'Page size must be a number',
    'number.integer': 'Page size must be an integer',
    'number.min': 'Page size must be at least 1',
    'number.max': 'Page size must not exceed 100',
  }),
  email: Joi.string().trim().optional().messages({
    'string.base': 'Email search must be a string',
  }),
  name: Joi.string().trim().optional().messages({
    'string.base': 'Name search must be a string',
  }),
  minBalance: Joi.number().optional().messages({
    'number.base': 'Min balance must be a number',
  }),
  maxBalance: Joi.number().optional().messages({
    'number.base': 'Max balance must be a number',
  }),
  sort: Joi.string()
    .valid(...ALLOWED_SORT_FIELDS)
    .optional()
    .messages({
      'any.only': `Sort must be one of: ${ALLOWED_SORT_FIELDS.join(', ')}`,
    }),
})
  .custom((value: ListCustomersQueryDto, helpers) => {
    // Validate minBalance <= maxBalance when both provided
    if (
      value.minBalance !== undefined &&
      value.maxBalance !== undefined &&
      value.minBalance > value.maxBalance
    ) {
      return helpers.error('custom.balanceRange');
    }
    return value;
  })
  .messages({
    'custom.balanceRange':
      'Min balance must be less than or equal to max balance',
  })
  .options({
    convert: true,
    stripUnknown: true,
  });

export interface ListCustomersQueryDto {
  page?: number;
  pageSize?: number;
  email?: string;
  name?: string;
  minBalance?: number;
  maxBalance?: number;
  sort?: (typeof ALLOWED_SORT_FIELDS)[number];
}
