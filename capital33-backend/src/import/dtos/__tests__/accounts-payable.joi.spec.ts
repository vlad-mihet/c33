import { accountsPayableSchema } from '../accounts-payable.joi';

describe('accountsPayableSchema', () => {
  it('should validate a valid AP record', () => {
    const validData = {
      apId: 'AP-001',
      vendor: 'Acme Corp',
      invoiceDate: new Date('2024-01-15'),
      dueDate: new Date('2024-02-15'),
      amount: 5000,
      currency: 'USD',
      status: 'Open',
      paidDate: null,
      terms: 'Net 30',
    };

    const { error } = accountsPayableSchema.validate(validData);
    expect(error).toBeUndefined();
  });

  it('should reject invalid status', () => {
    const invalidData = {
      apId: 'AP-001',
      vendor: 'Acme Corp',
      invoiceDate: new Date('2024-01-15'),
      dueDate: new Date('2024-02-15'),
      amount: 5000,
      currency: 'USD',
      status: 'InvalidStatus',
    };

    const { error } = accountsPayableSchema.validate(invalidData);
    expect(error).toBeDefined();
    expect(error?.details[0].message).toContain('must be one of');
  });

  it('should reject invalid currency format', () => {
    const invalidData = {
      apId: 'AP-001',
      vendor: 'Acme Corp',
      invoiceDate: new Date('2024-01-15'),
      dueDate: new Date('2024-02-15'),
      amount: 5000,
      currency: 'US',
      status: 'Open',
    };

    const { error } = accountsPayableSchema.validate(invalidData);
    expect(error).toBeDefined();
  });

  it('should require all mandatory fields', () => {
    const invalidData = {
      apId: 'AP-001',
    };

    const { error } = accountsPayableSchema.validate(invalidData);
    expect(error).toBeDefined();
    expect(error?.details.length).toBeGreaterThan(0);
  });

  it('should accept optional fields as null', () => {
    const validData = {
      apId: 'AP-001',
      vendor: 'Acme Corp',
      invoiceDate: new Date('2024-01-15'),
      dueDate: new Date('2024-02-15'),
      amount: 5000,
      currency: 'USD',
      status: 'Open',
      paidDate: null,
      terms: null,
    };

    const { error } = accountsPayableSchema.validate(validData);
    expect(error).toBeUndefined();
  });
});
