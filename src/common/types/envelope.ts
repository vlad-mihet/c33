export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
  correlationId: string;
}

export interface ApiErrorDetail {
  field?: string;
  location?: string;
  message: string;
  hint?: string;
}

export interface ApiErrorBody {
  code: string;
  title: string;
  detail: string;
  status: number;
  type: string;
  instance?: string;
  details?: ApiErrorDetail[];
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
  correlationId: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorResponse;
