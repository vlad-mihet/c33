import * as Joi from 'joi';

/**
 * ISO 4217 currency code pattern (3 uppercase letters)
 * Examples: USD, EUR, GBP, JPY
 */
export const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

/**
 * Joi validator for required currency code
 */
export const requiredCurrency = Joi.string()
  .pattern(CURRENCY_CODE_PATTERN)
  .required()
  .messages({
    'string.pattern.base':
      'Currency must be a valid ISO 4217 code (3 uppercase letters)',
  });

/**
 * Joi validator for optional currency code
 */
export const optionalCurrency = Joi.string()
  .pattern(CURRENCY_CODE_PATTERN)
  .optional()
  .allow(null, '')
  .messages({
    'string.pattern.base':
      'Currency must be a valid ISO 4217 code (3 uppercase letters)',
  });
