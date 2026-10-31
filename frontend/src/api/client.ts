import { ApiError } from './errors';
import type { ApiErrorDetail, Paged } from './types';

export interface ApiHooks {
  getToken: () => string | null;
  onUnauthorized: (error: ApiError) => void;
  onSuspended: (error: ApiError) => void;
}

const defaultHooks: ApiHooks = {
  getToken: () => null,
  onUnauthorized: () => undefined,
  onSuspended: () => undefined,
};

let hooks: ApiHooks = defaultHooks;
let baseUrlOverride: string | null = null;

export function configureApi(next: Partial<ApiHooks>): void {
  hooks = { ...hooks, ...next };
}

export function resetApiConfig(): void {
  hooks = defaultHooks;
  baseUrlOverride = null;
}

export function setApiBaseUrl(url: string | null): void {
  baseUrlOverride = url;
}

export function getApiBaseUrl(): string {
  const configured = baseUrlOverride ?? import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
  return configured.replace(/\/+$/, '');
}

type Query = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  body?: unknown;
  query?: Query;
  auth?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return `${getApiBaseUrl()}${path}${qs ? `?${qs}` : ''}`;
}

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number.parseInt(value, 10);
  return Number.isFinite(seconds) ? seconds : null;
}

async function toApiError(response: Response): Promise<ApiError> {
  let code = 'HTTP_ERROR';
  let message = response.statusText || `Request failed (${response.status})`;
  let details: ApiErrorDetail[] = [];
  let requestId: string | null = response.headers.get('x-request-id');
  try {
    const parsed = await response.json();
    const envelope = parsed?.error;
    if (envelope && typeof envelope === 'object') {
      code = typeof envelope.code === 'string' ? envelope.code : code;
      message = typeof envelope.message === 'string' ? envelope.message : message;
      details = Array.isArray(envelope.details) ? envelope.details : [];
      requestId = typeof envelope.request_id === 'string' ? envelope.request_id : requestId;
    }
  } catch {
    code = response.status >= 500 ? 'SERVER_ERROR' : code;
  }
  return new ApiError({
    status: response.status,
    code,
    message,
    details,
    requestId,
    retryAfter: parseRetryAfter(response.headers.get('retry-after')),
  });
}

export async function requestRaw<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const useAuth = options.auth !== false;
  const token = useAuth ? hooks.getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: string | undefined;
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), { method, headers, body, signal: options.signal });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Network error' });
  }

  if (!response.ok) {
    const error = await toApiError(response);
    if (useAuth && error.status === 401) hooks.onUnauthorized(error);
    if (error.status === 403 && error.code === 'BUSINESS_SUSPENDED') hooks.onSuspended(error);
    throw error;
  }

  if (response.status === 204) return undefined as T;
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError({ status: response.status, code: 'INVALID_RESPONSE', message: 'Unexpected response from server' });
  }
}

export async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const payload = await requestRaw<{ data: T }>(method, path, options);
  return payload.data;
}

export function requestPaged<T>(path: string, query?: Query, signal?: AbortSignal): Promise<Paged<T>> {
  return requestRaw<Paged<T>>('GET', path, { query, signal });
}
