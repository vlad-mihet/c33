import { generalLedgerSchema } from '../general-ledger.joi';

describe('generalLedgerSchema', () => {
  it('should validate a valid GL entry with debit', () => {
    const validData = {
      glId: 'GL-001',
      txnDate: new Date('2024-01-15'),
      accountNumber: 1000,
      accountName: 'Cash',
      debit: 5000,
      credit: 0,
      dept: 'Finance',
      costCenter: 'HQ',
      description: 'Payment received',
      currency: 'USD',
    };

    const { error } = generalLedgerSchema.validate(validData);
    expect(error).toBeUndefined();
  });

  it('should validate a valid GL entry with credit', () => {
    const validData = {
      glId: 'GL-002',
      txnDate: new Date('2024-01-15'),
      accountNumber: 2000,
      accountName: 'Revenue',
      debit: 0,
      credit: 5000,
    };

    const { error } = generalLedgerSchema.validate(validData);
    expect(error).toBeUndefined();
  });

  it('should reject when both debit and credit are zero', () => {
    const invalidData = {
      glId: 'GL-003',
      txnDate: new Date('2024-01-15'),
      accountNumber: 1000,
      accountName: 'Cash',
      debit: 0,
      credit: 0,
    };

    const { error } = generalLedgerSchema.validate(invalidData);
    expect(error).toBeDefined();
  });

  it('should reject negative amounts', () => {
    const invalidData = {
      glId: 'GL-004',
      txnDate: new Date('2024-01-15'),
      accountNumber: 1000,
      accountName: 'Cash',
      debit: -100,
      credit: 0,
    };

    const { error } = generalLedgerSchema.validate(invalidData);
    expect(error).toBeDefined();
    expect(error?.details[0]?.message).toContain(
      'must be greater than or equal to 0',
    );
  });

  it('should require all mandatory fields', () => {
    const invalidData = {
      glId: 'GL-001',
    };

    const { error } = generalLedgerSchema.validate(invalidData);
    expect(error).toBeDefined();
  });
});
