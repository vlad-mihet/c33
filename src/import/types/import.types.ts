/**
 * Shared types for import functionality
 */

// Re-export from queue.types for backwards compatibility
export type {
  ImportSummaryResult,
  XlsxImportPayload,
} from '../../queue/queue.types';

/**
 * Import summary interface used during processing
 * (Same as ImportSummaryResult but used internally)
 */
export interface ImportSummary {
  totalRows: number;
  valid: number;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<ImportError>;
}

/**
 * Error details for a single row import failure
 */
export interface ImportError {
  row: number;
  field?: string;
  message: string;
  hint?: string;
}

/**
 * Import configuration from manifest
 */
export interface ImportConfig {
  description: string;
  filename: string;
  sheet: string;
  collection: string;
  uniqueKey?: string;
  uniqueCompositeKey?: string[];
  mapping: Record<string, string>;
  valueTransformations?: Record<string, Record<string, string>>;
  indexes: Array<{
    fields: Record<string, number>;
    unique?: boolean;
  }>;
}

/**
 * Complete manifest structure
 */
export interface ImportManifest {
  version: number;
  importTypes: Record<string, ImportConfig>;
}

/**
 * Import type identifier
 */
export type ImportType =
  | 'ap'
  | 'ar'
  | 'gl'
  | 'expenseClaims'
  | 'budgetForecast'
  | 'customers';

/**
 * Upsert filter type - can be a simple object or a function
 */
export type UpsertFilter<T = unknown> =
  | Record<string, unknown>
  | ((value: T) => Record<string, unknown>);
