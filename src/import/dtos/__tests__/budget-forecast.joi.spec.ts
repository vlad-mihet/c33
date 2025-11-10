import { budgetForecastSchema } from '../budget-forecast.joi';

describe('budgetForecastSchema', () => {
  it('should validate a valid budget forecast entry', () => {
    const validData = {
      fiscalYear: 2024,
      dept: 'Engineering',
      quarter: 1,
      budgetUsd: 100000,
      forecastUsd: 95000,
      actualUsd: 98000,
      varianceUsd: 2000,
      notes: 'On track',
    };

    const { error } = budgetForecastSchema.validate(validData);
    expect(error).toBeUndefined();
  });

  it('should reject fiscal year below 2000', () => {
    const invalidData = {
      fiscalYear: 1999,
      dept: 'Engineering',
      quarter: 1,
      budgetUsd: 100000,
      forecastUsd: 95000,
      actualUsd: 98000,
      varianceUsd: 2000,
    };

    const { error } = budgetForecastSchema.validate(invalidData);
    expect(error).toBeDefined();
    expect(error?.details[0]?.message).toContain(
      'must be greater than or equal to 2000',
    );
  });

  it('should reject fiscal year above 2100', () => {
    const invalidData = {
      fiscalYear: 2101,
      dept: 'Engineering',
      quarter: 1,
      budgetUsd: 100000,
      forecastUsd: 95000,
      actualUsd: 98000,
      varianceUsd: 2000,
    };

    const { error } = budgetForecastSchema.validate(invalidData);
    expect(error).toBeDefined();
    expect(error?.details[0]?.message).toContain(
      'must be less than or equal to 2100',
    );
  });

  it('should reject invalid quarter', () => {
    const invalidData = {
      fiscalYear: 2024,
      dept: 'Engineering',
      quarter: 5,
      budgetUsd: 100000,
      forecastUsd: 95000,
      actualUsd: 98000,
      varianceUsd: 2000,
    };

    const { error } = budgetForecastSchema.validate(invalidData);
    expect(error).toBeDefined();
    expect(error?.details[0]?.message).toContain(
      'must be less than or equal to 4',
    );
  });

  it('should accept null notes', () => {
    const validData = {
      fiscalYear: 2024,
      dept: 'Engineering',
      quarter: 1,
      budgetUsd: 100000,
      forecastUsd: 95000,
      actualUsd: 98000,
      varianceUsd: 2000,
      notes: null,
    };

    const { error } = budgetForecastSchema.validate(validData);
    expect(error).toBeUndefined();
  });

  it('should require all mandatory fields', () => {
    const invalidData = {
      fiscalYear: 2024,
    };

    const { error } = budgetForecastSchema.validate(invalidData);
    expect(error).toBeDefined();
  });
});
