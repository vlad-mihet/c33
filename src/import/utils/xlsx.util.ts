/**
 * Pure utility functions for XLSX data transformation
 *
 * This file contains stateless utility functions for processing XLSX data.
 * For I/O operations and manifest management, use XlsxService.
 */

export interface XlsxRow {
  [key: string]: unknown;
}

/**
 * Parse Excel date serial number to JavaScript Date
 * Excel stores dates as numbers (days since 1900-01-01)
 */
export function parseExcelDate(value: unknown): Date | null {
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
  valueTransformations?: Record<string, Record<string, string>>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [excelCol, targetField] of Object.entries(mapping)) {
    let value: unknown = row[excelCol];

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

    // Apply value transformations if configured
    if (
      valueTransformations &&
      valueTransformations[targetField] &&
      typeof normalized[targetField] === 'string'
    ) {
      const transformMap = valueTransformations[targetField];
      const originalValue = normalized[targetField];
      if (typeof originalValue === 'string' && transformMap[originalValue] !== undefined) {
        normalized[targetField] = transformMap[originalValue];
      }
    }
  }

  return normalized;
}
