import * as xlsx from 'xlsx';
import { Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

const logger = new Logger('XlsxUtil');

export interface ImportManifest {
  version: number;
  importTypes: {
    [key: string]: {
      description: string;
      filename: string;
      sheet: string;
      collection: string;
      uniqueKey?: string;
      uniqueCompositeKey?: string[];
      mapping: { [excelColumn: string]: string };
      indexes: Array<{ fields: any; unique?: boolean }>;
    };
  };
}

let cachedManifest: ImportManifest | null = null;

/**
 * Load and cache the import manifest
 */
export function loadManifest(): ImportManifest {
  if (cachedManifest) {
    return cachedManifest;
  }

  const manifestPath = path.join(
    process.cwd(),
    'config',
    'import-manifest.json',
  );

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Import manifest not found at ${manifestPath}`);
  }

  const manifestData = fs.readFileSync(manifestPath, 'utf-8');
  cachedManifest = JSON.parse(manifestData) as ImportManifest;

  logger.log('Import manifest loaded successfully');
  return cachedManifest;
}

/**
 * Parse Excel date serial number to JavaScript Date
 * Excel stores dates as numbers (days since 1900-01-01)
 */
export function parseExcelDate(value: any): Date | null {
  if (!value) return null;

  // If already a Date object
  if (value instanceof Date) {
    return new Date(
      Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()),
    );
  }

  // If it's a string that looks like a date
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return new Date(
        Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()),
      );
    }
  }

  // If it's an Excel serial number
  if (typeof value === 'number') {
    // Excel epoch: January 1, 1900 (with known leap year bug)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // Dec 30, 1899
    const days = Math.floor(value);
    const date = new Date(excelEpoch.getTime() + days * 86400000);
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  return null;
}

/**
 * Normalize a row based on manifest mapping
 */
export function normalizeRow(
  row: XlsxRow,
  mapping: { [excelColumn: string]: string },
  rowNumber: number,
): any {
  const normalized: any = {};

  for (const [excelCol, targetField] of Object.entries(mapping)) {
    let value = row[excelCol];

    // Handle missing values
    if (value === undefined || value === null || value === '') {
      normalized[targetField] = null;
      continue;
    }

    // Trim strings
    if (typeof value === 'string') {
      value = value.trim();
    }

    // Special handling for date fields
    if (
      targetField.toLowerCase().includes('date') &&
      !targetField.toLowerCase().includes('update') &&
      !targetField.toLowerCase().includes('created')
    ) {
      const dateValue = parseExcelDate(value);
      normalized[targetField] = dateValue;
    }
    // Special handling for currency (uppercase)
    else if (targetField === 'currency' && typeof value === 'string') {
      normalized[targetField] = value.toUpperCase();
    }
    // Numbers
    else if (
      typeof value === 'number' ||
      targetField.includes('amount') ||
      targetField.includes('usd') ||
      targetField.includes('Usd') ||
      targetField === 'debit' ||
      targetField === 'credit' ||
      targetField === 'accountNumber' ||
      targetField === 'fiscalYear' ||
      targetField === 'quarter'
    ) {
      normalized[targetField] = parseFloat(String(value)) || 0;
    }
    // Everything else as-is
    else {
      normalized[targetField] = value;
    }
  }

  return normalized;
}

export interface XlsxRow {
  [key: string]: any;
}

/**
 * Parse XLSX file and return rows from the specified sheet or first sheet.
 * @param filePath - Path to the XLSX file
 * @param sheetName - Optional sheet name (defaults to 'Customers' or first sheet)
 * @returns Array of row objects
 */
export function parseXlsxFile(filePath: string, sheetName?: string): XlsxRow[] {
  try {
    // Read the workbook
    const workbook = xlsx.readFile(filePath);

    // Get target sheet name
    let targetSheet: string;
    if (sheetName && workbook.SheetNames.includes(sheetName)) {
      targetSheet = sheetName;
    } else if (workbook.SheetNames.includes('Customers')) {
      targetSheet = 'Customers';
    } else {
      targetSheet = workbook.SheetNames[0]; // First sheet
    }

    logger.log(`Parsing sheet: ${targetSheet}`);

    // Get the worksheet
    const worksheet = workbook.Sheets[targetSheet];

    // Convert to JSON (array of objects)
    const rows = xlsx.utils.sheet_to_json<XlsxRow>(worksheet, {
      defval: '', // Default value for empty cells
      raw: false, // Format cells as strings
    });

    return rows;
  } catch (error) {
    logger.error(`Error parsing XLSX file: ${error.message}`);
    throw new Error(`Failed to parse XLSX file: ${error.message}`);
  }
}

/**
 * Validate and normalize a row for customer import.
 * @param row - Raw row from XLSX
 * @param rowNumber - Row number for error reporting
 * @returns Normalized customer data or null if invalid
 */
export function normalizeCustomerRow(
  row: XlsxRow,
  rowNumber: number,
): { name: string; email: string; balance: number } | null {
  try {
    // Handle different column name variations
    const name =
      row.name || row.Name || row.NAME || row.customer_name || row.CustomerName;
    const email =
      row.email ||
      row.Email ||
      row.EMAIL ||
      row.customer_email ||
      row.CustomerEmail;
    const balance =
      row.balance !== undefined
        ? row.balance
        : row.Balance !== undefined
          ? row.Balance
          : row.BALANCE !== undefined
            ? row.BALANCE
            : 0;

    // Basic validation
    if (!name || !email) {
      logger.warn(`Row ${rowNumber}: Missing name or email`);
      return null;
    }

    return {
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      balance: parseFloat(String(balance)) || 0,
    };
  } catch (error) {
    logger.warn(`Row ${rowNumber}: Normalization error - ${error.message}`);
    return null;
  }
}
