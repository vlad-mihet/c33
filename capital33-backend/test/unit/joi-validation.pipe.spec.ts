import { BadRequestException } from '@nestjs/common';
import { JoiValidationPipe } from '../../src/common/pipes/joi-validation.pipe';
import * as Joi from 'joi';

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

    const result = pipe.transform(validData, { type: 'body' });

    expect(result).toEqual(validData);
  });

  it('should strip unknown properties', () => {
    const dataWithUnknown = {
      name: 'John Doe',
      email: 'john@example.com',
      unknownField: 'should be removed',
    };

    const result = pipe.transform(dataWithUnknown, { type: 'body' });

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

    expect(() => pipe.transform(invalidData, { type: 'body' })).toThrow(
      BadRequestException,
    );
  });

  it('should return all validation errors', () => {
    const invalidData = {
      name: 'A', // Too short
      email: 'invalid', // Invalid email
    };

    try {
      pipe.transform(invalidData, { type: 'body' });
      fail('Should have thrown BadRequestException');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = error.getResponse();
      expect(response).toHaveProperty('errors');
      expect(Array.isArray(response.errors)).toBe(true);
      expect(response.errors.length).toBeGreaterThan(0);
    }
  });

  it('should throw for missing required fields', () => {
    const incompleteData = {
      name: 'John Doe',
      // email is missing
    };

    expect(() => pipe.transform(incompleteData, { type: 'body' })).toThrow(
      BadRequestException,
    );
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

    const result = pipeWithDefaults.transform(data, { type: 'body' });

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
      pipe.transform(invalidData, { type: 'body' });
      fail('Should have thrown BadRequestException');
    } catch (error) {
      const response = error.getResponse();
      expect(response.statusCode).toBe(400);
      expect(response.message).toBe('Validation failed');
      expect(response.errors).toBeDefined();
      expect(response.errors[0]).toHaveProperty('field');
      expect(response.errors[0]).toHaveProperty('message');
    }
  });
});
