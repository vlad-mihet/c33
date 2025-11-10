import * as Joi from 'joi';

import { ValidationError } from '../../src/common/errors/domain-errors';
import { JoiValidationPipe } from '../../src/common/pipes/joi-validation.pipe';

describe('JoiValidationPipe', () => {
  const testSchema = Joi.object({
    name: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    age: Joi.number().optional(),
  });

  let pipe: JoiValidationPipe;

  beforeEach(() => {
    pipe = new JoiValidationPipe(testSchema);
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should validate and return valid data', () => {
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    };

    const result = pipe.transform(validData);

    expect(result).toEqual(validData);
  });

  it('should strip unknown properties', () => {
    const dataWithUnknown = {
      name: 'John Doe',
      email: 'john@example.com',
      unknownField: 'should be removed',
    };

    const result = pipe.transform(dataWithUnknown);

    expect(result).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
    });
    expect(result).not.toHaveProperty('unknownField');
  });

  it('should throw BadRequestException for invalid data', () => {
    const invalidData = {
      name: 'A', // Too short (min 2)
      email: 'invalid-email',
    };

    expect(() => pipe.transform(invalidData)).toThrow(ValidationError);
  });

  it('should return all validation errors', () => {
    const invalidData = {
      name: 'A', // Too short
      email: 'invalid', // Invalid email
    };

    try {
      pipe.transform(invalidData);
      fail('Should have thrown ValidationError');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ValidationError);
      if (error instanceof ValidationError) {
        expect(error.code).toBe('VALIDATION_FAILED');
        expect(error.message).toBe('Validation failed');
      }
    }
  });

  it('should throw for missing required fields', () => {
    const incompleteData = {
      name: 'John Doe',
      // email is missing
    };

    expect(() => pipe.transform(incompleteData)).toThrow(ValidationError);
  });

  it('should apply default values', () => {
    const schemaWithDefaults = Joi.object({
      name: Joi.string().required(),
      balance: Joi.number().default(0),
    });

    const pipeWithDefaults = new JoiValidationPipe(schemaWithDefaults);

    const data = {
      name: 'Test',
    };

    const result = pipeWithDefaults.transform(data);

    expect(result).toEqual({
      name: 'Test',
      balance: 0,
    });
  });

  it('should provide detailed error information', () => {
    const invalidData = {
      name: 'X',
      email: 'not-an-email',
    };

    try {
      pipe.transform(invalidData);
      fail('Should have thrown ValidationError');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ValidationError);
      if (error instanceof ValidationError) {
        expect(error.code).toBe('VALIDATION_FAILED');
        expect(error.message).toBe('Validation failed');
        expect(error.status).toBe(400);
      }
    }
  });
});
