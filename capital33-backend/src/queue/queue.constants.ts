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
