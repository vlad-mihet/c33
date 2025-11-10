import * as fs from 'fs';
import * as path from 'path';

import * as xlsx from 'xlsx';

const FIXTURES_DIR = path.join(__dirname, 'data');

function ensureFixturesDir(): void {
  if (!fs.existsSync(FIXTURES_DIR)) {
    fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  }
}

function generateApFixture(): void {
  const data = [
    {
      APID: 'AP-001',
      Vendor: 'Acme Corp',
      InvoiceDate: new Date('2023-01-15'),
      DueDate: new Date('2023-02-15'),
      Amount: 5000.0,
      Currency: 'USD',
      Status: 'Open',
      PaidDate: null,
      Terms: 'Net 30',
    },
    {
      APID: 'AP-002',
      Vendor: 'Global Supplies Inc',
      InvoiceDate: new Date('2023-01-20'),
      DueDate: new Date('2023-02-20'),
      Amount: 3500.5,
      Currency: 'USD',
      Status: 'Paid',
      PaidDate: new Date('2023-02-18'),
      Terms: 'Net 30',
    },
    {
      APID: 'AP-003',
      Vendor: 'Tech Solutions LLC',
      InvoiceDate: new Date('2023-02-01'),
      DueDate: new Date('2023-03-01'),
      Amount: 12000.0,
      Currency: 'EUR',
      Status: 'Overdue',
      PaidDate: null,
      Terms: 'Net 30',
    },
  ];

  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  xlsx.writeFile(wb, path.join(FIXTURES_DIR, 'test-ap.xlsx'));
}

function generateApInvalidFixture(): void {
  const data = [
    {
      APID: 'AP-100',
      Vendor: 'Valid Vendor',
      InvoiceDate: new Date('2023-01-15'),
      DueDate: new Date('2023-02-15'),
      Amount: -100.0, // Invalid: negative amount
      Currency: 'USD',
      Status: 'Open',
      PaidDate: null,
      Terms: 'Net 30',
    },
    {
      APID: 'AP-101',
      Vendor: '', // Invalid: empty vendor
      InvoiceDate: new Date('2023-01-20'),
      DueDate: new Date('2023-02-20'),
      Amount: 1000.0,
      Currency: 'USD',
      Status: 'Paid',
      PaidDate: null,
      Terms: null,
    },
  ];

  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  xlsx.writeFile(wb, path.join(FIXTURES_DIR, 'test-ap-invalid.xlsx'));
}

function generateApBadCurrencyFixture(): void {
  const data = [
    {
      APID: 'AP-200',
      Vendor: 'Test Vendor',
      InvoiceDate: new Date('2023-01-15'),
      DueDate: new Date('2023-02-15'),
      Amount: 1000.0,
      Currency: 'INVALID', // Invalid: not 3-letter ISO code
      Status: 'Open',
      PaidDate: null,
      Terms: 'Net 30',
    },
  ];

  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  xlsx.writeFile(wb, path.join(FIXTURES_DIR, 'test-ap-bad-currency.xlsx'));
}

function generateApBadStatusFixture(): void {
  const data = [
    {
      APID: 'AP-300',
      Vendor: 'Test Vendor',
      InvoiceDate: new Date('2023-01-15'),
      DueDate: new Date('2023-02-15'),
      Amount: 1000.0,
      Currency: 'USD',
      Status: 'InvalidStatus', // Invalid: not in enum
      PaidDate: null,
      Terms: 'Net 30',
    },
  ];

  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  xlsx.writeFile(wb, path.join(FIXTURES_DIR, 'test-ap-bad-status.xlsx'));
}

function generateArFixture(): void {
  const data = [
    {
      ARID: 'AR-001',
      Customer: 'ABC Company',
      InvoiceDate: new Date('2023-01-10'),
      DueDate: new Date('2023-02-10'),
      Amount: 7500.0,
      Currency: 'USD',
      Status: 'Open',
      ReceivedDate: null,
      Terms: 'Net 30',
    },
    {
      ARID: 'AR-002',
      Customer: 'XYZ Industries',
      InvoiceDate: new Date('2023-01-25'),
      DueDate: new Date('2023-02-25'),
      Amount: 4200.75,
      Currency: 'GBP',
      Status: 'Paid',
      ReceivedDate: new Date('2023-02-20'),
      Terms: 'Net 30',
    },
  ];

  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  xlsx.writeFile(wb, path.join(FIXTURES_DIR, 'test-ar.xlsx'));
}

function generateGlFixture(): void {
  const data = [
    {
      GLID: 'GL-001',
      TxnDate: new Date('2023-01-05'),
      AccountNumber: 1000,
      AccountName: 'Cash',
      Debit: 5000.0,
      Credit: 0,
      Dept: 'Finance',
      CostCenter: 'HQ',
      Description: 'Cash receipt',
      Currency: 'USD',
    },
    {
      GLID: 'GL-002',
      TxnDate: new Date('2023-01-06'),
      AccountNumber: 5000,
      AccountName: 'Revenue',
      Debit: 0,
      Credit: 5000.0,
      Dept: 'Sales',
      CostCenter: 'HQ',
      Description: 'Sales revenue',
      Currency: 'USD',
    },
  ];

  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  xlsx.writeFile(wb, path.join(FIXTURES_DIR, 'test-gl.xlsx'));
}

function generateExpenseClaimsFixture(): void {
  const data = [
    {
      ClaimID: 'EC-001',
      EmployeeID: 'EMP-123',
      SubmitDate: new Date('2023-01-10'),
      Category: 'Travel',
      Description: 'Client meeting travel expenses',
      Amount: 350.5,
      Currency: 'USD',
      Status: 'Paid',
      ApprovedBy: 'MGR-001',
      PayDate: new Date('2023-01-20'),
    },
    {
      ClaimID: 'EC-002',
      EmployeeID: 'EMP-456',
      SubmitDate: new Date('2023-01-15'),
      Category: 'Meals',
      Description: 'Business lunch',
      Amount: 85.0,
      Currency: 'USD',
      Status: 'Open',
      ApprovedBy: null,
      PayDate: null,
    },
  ];

  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  xlsx.writeFile(wb, path.join(FIXTURES_DIR, 'test-expense-claims.xlsx'));
}

function generateBudgetForecastFixture(): void {
  const data = [
    {
      FiscalYear: 2023,
      Dept: 'Engineering',
      Quarter: 1,
      BudgetUSD: 100000.0,
      ForecastUSD: 105000.0,
      ActualUSD: 102000.0,
      VarianceUSD: -2000.0,
      Notes: 'Slight overspend due to hiring',
    },
    {
      FiscalYear: 2023,
      Dept: 'Engineering',
      Quarter: 2,
      BudgetUSD: 110000.0,
      ForecastUSD: 108000.0,
      ActualUSD: 107500.0,
      VarianceUSD: 2500.0,
      Notes: 'Under budget',
    },
    {
      FiscalYear: 2023,
      Dept: 'Sales',
      Quarter: 1,
      BudgetUSD: 80000.0,
      ForecastUSD: 82000.0,
      ActualUSD: 81000.0,
      VarianceUSD: -1000.0,
      Notes: null,
    },
  ];

  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  xlsx.writeFile(wb, path.join(FIXTURES_DIR, 'test-budget-forecast.xlsx'));
}

function generateBudgetForecastDuplicatesFixture(): void {
  const data = [
    {
      FiscalYear: 2023,
      Dept: 'Marketing',
      Quarter: 1,
      BudgetUSD: 50000.0,
      ForecastUSD: 51000.0,
      ActualUSD: 50500.0,
      VarianceUSD: -500.0,
      Notes: 'First entry',
    },
    {
      FiscalYear: 2023,
      Dept: 'Marketing',
      Quarter: 1, // Duplicate composite key
      BudgetUSD: 52000.0,
      ForecastUSD: 52000.0,
      ActualUSD: 51500.0,
      VarianceUSD: 500.0,
      Notes: 'Duplicate entry - should upsert',
    },
  ];

  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  xlsx.writeFile(
    wb,
    path.join(FIXTURES_DIR, 'test-budget-forecast-duplicates.xlsx'),
  );
}

function generateBudgetForecastBadYearFixture(): void {
  const data = [
    {
      FiscalYear: 1999, // Invalid: below minimum 2000
      Dept: 'IT',
      Quarter: 1,
      BudgetUSD: 50000.0,
      ForecastUSD: 51000.0,
      ActualUSD: 50500.0,
      VarianceUSD: -500.0,
      Notes: null,
    },
  ];

  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  xlsx.writeFile(
    wb,
    path.join(FIXTURES_DIR, 'test-budget-forecast-bad-year.xlsx'),
  );
}

function generateBudgetForecastBadQuarterFixture(): void {
  const data = [
    {
      FiscalYear: 2023,
      Dept: 'HR',
      Quarter: 5, // Invalid: above maximum 4
      BudgetUSD: 30000.0,
      ForecastUSD: 31000.0,
      ActualUSD: 30500.0,
      VarianceUSD: -500.0,
      Notes: null,
    },
  ];

  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  xlsx.writeFile(
    wb,
    path.join(FIXTURES_DIR, 'test-budget-forecast-bad-quarter.xlsx'),
  );
}

function generateAllFixtures(): void {
  ensureFixturesDir();

  console.log('Generating test fixtures...');

  // Positive tests
  generateApFixture();
  console.log('✓ test-ap.xlsx');

  generateArFixture();
  console.log('✓ test-ar.xlsx');

  generateGlFixture();
  console.log('✓ test-gl.xlsx');

  generateExpenseClaimsFixture();
  console.log('✓ test-expense-claims.xlsx');

  generateBudgetForecastFixture();
  console.log('✓ test-budget-forecast.xlsx');

  // Negative tests
  generateApInvalidFixture();
  console.log('✓ test-ap-invalid.xlsx');

  generateApBadCurrencyFixture();
  console.log('✓ test-ap-bad-currency.xlsx');

  generateApBadStatusFixture();
  console.log('✓ test-ap-bad-status.xlsx');

  generateBudgetForecastDuplicatesFixture();
  console.log('✓ test-budget-forecast-duplicates.xlsx');

  generateBudgetForecastBadYearFixture();
  console.log('✓ test-budget-forecast-bad-year.xlsx');

  generateBudgetForecastBadQuarterFixture();
  console.log('✓ test-budget-forecast-bad-quarter.xlsx');

  console.log('\nAll test fixtures generated successfully!');
  console.log(`Location: ${FIXTURES_DIR}`);
}

if (require.main === module) {
  generateAllFixtures();
}

export { generateAllFixtures };
