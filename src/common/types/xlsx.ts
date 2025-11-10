/**
 * Raw row from XLSX parsing - all values are unknown until validated
 */
export type RawXlsxRow = Record<string, unknown>;

/**
 * Mapping configuration for converting raw XLSX rows to typed data
 */
export interface XlsxFieldMapping {
  sourceField: string;
  targetField: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  required?: boolean;
  defaultValue?: unknown;
}

/**
 * Result of parsing and validating a single XLSX row
 */
export interface ParsedXlsxRow<T> {
  rowNumber: number;
  data: T | null;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Statistics for XLSX import operation
 */
export interface XlsxImportStats {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  inserted: number;
  updated: number;
  failed: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}
