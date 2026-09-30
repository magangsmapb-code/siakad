export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiResponse<T> = {
  data: T | null;
  error: ApiErrorBody | null;
  meta?: Record<string, unknown> | null;
};

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code = "api_error") {
    super(message);
    this.name = "ApiRequestError";
  }
}