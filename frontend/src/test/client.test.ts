import { describe, expect, it, vi } from 'vitest';
import { configureApi, getApiBaseUrl, request, requestPaged, setApiBaseUrl } from '../api/client';
import { ApiError, describeError, fieldErrors } from '../api/errors';
import { authApi, teamApi } from '../api/endpoints';
import { apiError, installFetch } from './utils';

describe('api client', () => {
  it('defaults to the relative /api/v1 base and honours overrides', () => {
    expect(getApiBaseUrl()).toBe('/api/v1');
    setApiBaseUrl('http://example.test/api/v1/');
    expect(getApiBaseUrl()).toBe('http://example.test/api/v1');
  });

  it('unwraps {data}, attaches the bearer token and serialises JSON bodies', async () => {
    const mock = installFetch({ 'POST /api/v1/auth/switch-context': { body: { data: { access_token: 'next', expires_in: 10, active_context: { type: 'customer', business_id: 'b' } } } } });
    configureApi({ getToken: () => 'abc' });
    const result = await authApi.switchContext({ business_id: 'b', type: 'customer' });
    expect(result.access_token).toBe('next');
    expect(mock.calls[0].headers.get('authorization')).toBe('Bearer abc');
    expect(mock.calls[0].headers.get('content-type')).toBe('application/json');
    expect(mock.calls[0].body).toEqual({ business_id: 'b', type: 'customer' });
  });

  it('does not send credentials to public endpoints', async () => {
    const mock = installFetch({ 'POST /api/v1/auth/login': { body: { data: {} } } });
    configureApi({ getToken: () => 'abc' });
    await authApi.login('a@b.test', 'pw');
    expect(mock.calls[0].headers.get('authorization')).toBeNull();
  });

  it('builds query strings and skips empty values', async () => {
    const mock = installFetch({ 'GET /api/v1/team': { body: { data: [], meta: { page: 2, page_size: 10, total: 0, total_pages: 0 } } } });
    await teamApi.list({ q: 'ann', role: undefined, is_active: false, page: 2, page_size: 10 });
    const query = mock.calls[0].query;
    expect(query.get('q')).toBe('ann');
    expect(query.get('is_active')).toBe('false');
    expect(query.get('page')).toBe('2');
    expect(query.has('role')).toBe(false);
  });

  it('returns the whole envelope for paged requests', async () => {
    installFetch({ 'GET /api/v1/team': { body: { data: [{ id: '1' }], meta: { page: 1, page_size: 25, total: 1, total_pages: 1 } } } });
    const page = await requestPaged<{ id: string }>('/team');
    expect(page.data[0].id).toBe('1');
    expect(page.meta.total).toBe(1);
  });

  it('parses the error envelope including field details, request id and Retry-After', async () => {
    installFetch({ 'POST /api/v1/auth/login': apiError(429, 'RATE_LIMITED', 'Too many requests, try again later', [], { 'retry-after': '42' }) });
    const error = (await request('POST', '/auth/login', { auth: false }).catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(429);
    expect(error.code).toBe('RATE_LIMITED');
    expect(error.requestId).toBe('req-test');
    expect(error.retryAfter).toBe(42);
    expect(describeError(error)).toContain('42 seconds');
  });

  it('maps validation details to fields', async () => {
    installFetch({ 'POST /api/v1/team': apiError(422, 'VALIDATION_ERROR', 'Request validation failed', [{ field: 'email', message: 'Must be a valid email address' }]) });
    const error = await teamApi.create({ full_name: 'X', email: 'bad' }).catch((e) => e);
    expect(fieldErrors(error)).toEqual({ email: 'Must be a valid email address' });
  });

  it('calls onUnauthorized for 401 on authenticated requests only', async () => {
    const onUnauthorized = vi.fn();
    configureApi({ getToken: () => 'abc', onUnauthorized });
    installFetch({
      'GET /api/v1/auth/me': apiError(401, 'UNAUTHENTICATED', 'Invalid or expired token'),
      'POST /api/v1/auth/login': apiError(401, 'UNAUTHENTICATED', 'Invalid email or password'),
    });
    await authApi.me().catch(() => undefined);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    await authApi.login('a@b.test', 'pw').catch(() => undefined);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('calls onSuspended only for BUSINESS_SUSPENDED, not for plain 403', async () => {
    const onSuspended = vi.fn();
    configureApi({ getToken: () => 'abc', onSuspended });
    installFetch({
      'GET /api/v1/team': apiError(403, 'FORBIDDEN', 'Business Admin access required'),
      'GET /api/v1/auth/me': apiError(403, 'BUSINESS_SUSPENDED', 'This business is suspended'),
    });
    await teamApi.list({}).catch(() => undefined);
    expect(onSuspended).not.toHaveBeenCalled();
    await authApi.me().catch(() => undefined);
    expect(onSuspended).toHaveBeenCalledTimes(1);
  });

  it('turns network failures and non-JSON bodies into ApiErrors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('failed'); }));
    const network = (await authApi.me().catch((e) => e)) as ApiError;
    expect(network.isNetwork).toBe(true);
    expect(describeError(network)).toMatch(/Cannot reach the server/);

    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>bad gateway</html>', { status: 502 })));
    const html = (await authApi.me().catch((e) => e)) as ApiError;
    expect(html.status).toBe(502);
    expect(html.code).toBe('SERVER_ERROR');
  });
});
