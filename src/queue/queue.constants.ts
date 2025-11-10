export enum JobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
}

export enum JobType {
  IMPORT_XLSX_CUSTOMERS = 'import.xlsx.customers',
  IMPORT_XLSX_AP = 'import.xlsx.ap',
  IMPORT_XLSX_AR = 'import.xlsx.ar',
  IMPORT_XLSX_GL = 'import.xlsx.gl',
  IMPORT_XLSX_EXPENSE_CLAIMS = 'import.xlsx.expenseClaims',
  IMPORT_XLSX_BUDGET_FORECAST = 'import.xlsx.budgetForecast',
}

/**
 * Job priority levels (lower number = higher priority)
 */
export enum JobPriority {
  CRITICAL = 0, // Immediate processing required
  HIGH = 25, // Important jobs, process before normal
  NORMAL = 100, // Default priority
  LOW = 200, // Background jobs, process when idle
  DEFERRED = 500, // Very low priority, process last
}
