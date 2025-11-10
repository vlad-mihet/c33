export type JobStatus = 'queued' | 'processing' | 'succeeded' | 'failed';

export interface JobErrorDetail {
  row: number;
  field?: string;
  location?: string;
  message: string;
  hint?: string;
}

export interface JobResultSummary {
  totalRows: number;
  valid: number;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: JobErrorDetail[];
}
