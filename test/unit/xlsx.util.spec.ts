import { parseExcelDate, normalizeRow } from '../../src/import/utils/xlsx.util';

describe('XLSX Utilities', () => {
  describe('parseExcelDate', () => {
    it('should parse Excel serial number to UTC midnight Date', () => {
      const serialNumber = 44927; // 2023-01-01
      const result = parseExcelDate(serialNumber);

      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCFullYear()).toBe(2023);
      expect(result?.getUTCMonth()).toBe(0); // January
      expect(result?.getUTCDate()).toBe(1);
      expect(result?.getUTCHours()).toBe(0);
      expect(result?.getUTCMinutes()).toBe(0);
      expect(result?.getUTCSeconds()).toBe(0);
    });

    it('should parse ISO date string to UTC midnight Date', () => {
      const isoString = '2023-06-15';
      const result = parseExcelDate(isoString);

      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCFullYear()).toBe(2023);
      expect(result?.getUTCMonth()).toBe(5); // June
      expect(result?.getUTCDate()).toBe(15);
      expect(result?.getUTCHours()).toBe(0);
      expect(result?.getUTCMinutes()).toBe(0);
      expect(result?.getUTCSeconds()).toBe(0);
    });

    it('should handle Date objects and normalize to UTC midnight', () => {
      const date = new Date('2023-03-20T15:30:45Z');
      const result = parseExcelDate(date);

      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCFullYear()).toBe(2023);
      expect(result?.getUTCMonth()).toBe(2); // March
      expect(result?.getUTCDate()).toBe(20);
      expect(result?.getUTCHours()).toBe(0);
      expect(result?.getUTCMinutes()).toBe(0);
      expect(result?.getUTCSeconds()).toBe(0);
    });

    it('should return null for null or undefined input', () => {
      expect(parseExcelDate(null)).toBeNull();
      expect(parseExcelDate(undefined)).toBeNull();
      expect(parseExcelDate('')).toBeNull();
    });

    it('should return null for invalid string input', () => {
      expect(parseExcelDate('not a date')).toBeNull();
      expect(parseExcelDate('xyz123')).toBeNull();
    });
  });

  describe('normalizeRow', () => {
    it('should map Excel columns to target fields', () => {
      const row = {
        APID: 'AP-001',
        Vendor: 'Acme Corp',
        Amount: 1000.5,
        Currency: 'usd',
      };

      const mapping = {
        APID: 'apId',
        Vendor: 'vendor',
        Amount: 'amount',
        Currency: 'currency',
      };

      const result = normalizeRow(row, mapping);

      expect(result.apId).toBe('AP-001');
      expect(result.vendor).toBe('Acme Corp');
      expect(result.amount).toBe(1000.5);
      expect(result.currency).toBe('USD'); // Uppercased
    });

    it('should normalize currency to uppercase', () => {
      const row = { Currency: 'eur' };
      const mapping = { Currency: 'currency' };

      const result = normalizeRow(row, mapping);

      expect(result.currency).toBe('EUR');
    });

    it('should parse date fields to Date objects', () => {
      const row = {
        InvoiceDate: '2023-05-10',
        DueDate: 44927, // Excel serial number
      };

      const mapping = {
        InvoiceDate: 'invoiceDate',
        DueDate: 'dueDate',
      };

      const result = normalizeRow(row, mapping);

      expect(result.invoiceDate).toBeInstanceOf(Date);
      expect(result.dueDate).toBeInstanceOf(Date);
    });

    it('should parse numeric fields correctly', () => {
      const row = {
        Amount: '1500.75',
        Debit: '500',
        AccountNumber: '1001',
        FiscalYear: '2023',
        Quarter: '2',
      };

      const mapping = {
        Amount: 'amount',
        Debit: 'debit',
        AccountNumber: 'accountNumber',
        FiscalYear: 'fiscalYear',
        Quarter: 'quarter',
      };

      const result = normalizeRow(row, mapping);

      expect(result.amount).toBe(1500.75);
      expect(result.debit).toBe(500);
      expect(result.accountNumber).toBe(1001);
      expect(result.fiscalYear).toBe(2023);
      expect(result.quarter).toBe(2);
    });

    it('should handle missing values as null', () => {
      const row = {
        APID: 'AP-001',
        PaidDate: null,
        Terms: '',
      };

      const mapping = {
        APID: 'apId',
        PaidDate: 'paidDate',
        Terms: 'terms',
      };

      const result = normalizeRow(row, mapping);

      expect(result.apId).toBe('AP-001');
      expect(result.paidDate).toBeNull();
      expect(result.terms).toBeNull();
    });

    it('should trim string values', () => {
      const row = {
        Vendor: '  Acme Corp  ',
        Description: '\tTest description\n',
      };

      const mapping = {
        Vendor: 'vendor',
        Description: 'description',
      };

      const result = normalizeRow(row, mapping);

      expect(result.vendor).toBe('Acme Corp');
      expect(result.description).toBe('Test description');
    });

    it('should handle budget/forecast USD fields', () => {
      const row = {
        BudgetUSD: '50000',
        ForecastUSD: '52000.50',
        ActualUSD: '51500',
        VarianceUSD: '-500',
      };

      const mapping = {
        BudgetUSD: 'budgetUsd',
        ForecastUSD: 'forecastUsd',
        ActualUSD: 'actualUsd',
        VarianceUSD: 'varianceUsd',
      };

      const result = normalizeRow(row, mapping);

      expect(result.budgetUsd).toBe(50000);
      expect(result.forecastUsd).toBe(52000.5);
      expect(result.actualUsd).toBe(51500);
      expect(result.varianceUsd).toBe(-500);
    });

    it('should preserve non-date/non-currency/non-numeric fields', () => {
      const row = {
        Status: 'Open',
        Description: 'Invoice for services',
        Category: 'Travel',
      };

      const mapping = {
        Status: 'status',
        Description: 'description',
        Category: 'category',
      };

      const result = normalizeRow(row, mapping);

      expect(result.status).toBe('Open');
      expect(result.description).toBe('Invoice for services');
      expect(result.category).toBe('Travel');
    });
  });
});
