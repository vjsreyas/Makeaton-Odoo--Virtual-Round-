import type { ApiErrorDetail } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetail[];
  readonly requestId: string | null;
  readonly retryAfter: number | null;

  constructor(init: {
    status: number;
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    requestId?: string | null;
    retryAfter?: number | null;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.details = init.details ?? [];
    this.requestId = init.requestId ?? null;
    this.retryAfter = init.retryAfter ?? null;
  }

  get isNetwork(): boolean {
    return this.status === 0;
  }
}

export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const result: Record<string, string> = {};
  for (const detail of error.details) {
    if (detail.field && !(detail.field in result)) result[detail.field] = detail.message;
  }
  return result;
}

export function describeError(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong. Please try again.';
  if (error.isNetwork) return 'Cannot reach the server. Check your connection and try again.';
  if (error.status === 429) {
    const wait = error.retryAfter ? ` Try again in ${error.retryAfter} seconds.` : ' Please try again later.';
    return `Too many attempts.${wait}`;
  }
  if (error.status >= 500) {
    return error.requestId
      ? `The server had a problem (reference ${error.requestId}). Please try again.`
      : 'The server had a problem. Please try again.';
  }
  return error.message;
}
