import type { JobDocument } from './schemas/job.schema';

export interface IJobHandler<TResult = unknown> {
  handle(job: JobDocument): Promise<TResult>;
}

export interface XlsxImportPayload {
  filePath: string;
  type: 'ap' | 'ar' | 'gl' | 'expense-claims' | 'budget-forecast';
}

export interface ImportSummaryResult {
  totalRows: number;
  valid: number;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
    hint?: string;
  }>;
}
