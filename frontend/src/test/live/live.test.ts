import { beforeAll, describe, expect, it, vi } from 'vitest';
import { configureApi, setApiBaseUrl } from '../../api/client';
import { IMPLEMENTED_ENDPOINTS, authApi, platformApi, teamApi } from '../../api/endpoints';
import { ApiError } from '../../api/errors';

const FRONTEND = process.env.LIVE_FRONTEND_URL ?? 'http://localhost:5173';
const BACKEND = process.env.LIVE_BACKEND_URL ?? 'http://127.0.0.1:8000';
const MAILPIT = process.env.LIVE_MAILPIT_URL ?? 'http://127.0.0.1:8025';
const PLATFORM = { email: process.env.LIVE_PLATFORM_EMAIL ?? '', password: process.env.LIVE_PLATFORM_PASSWORD ?? '' };
const ADMIN = { email: process.env.LIVE_ADMIN_EMAIL ?? '', password: process.env.LIVE_ADMIN_PASSWORD ?? '' };
const NEW_PASSWORD = process.env.LIVE_NEW_PASSWORD ?? 'Live!Passw0rd9';
const stamp = Date.now().toString(36);

let token: string | null = null;
const onUnauthorized = vi.fn();
const onSuspended = vi.fn();

async function as<T>(session: string | null, run: () => Promise<T>): Promise<T> {
  token = session;
  try {
    return await run();
  } finally {
    token = null;
  }
}

async function inviteTokenFor(email: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const found = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`).then((r) => r.json());
    const id = found.messages?.[0]?.ID;
    if (id) {
      const message = await fetch(`${MAILPIT}/api/v1/message/${id}`).then((r) => r.json());
      const match = /token=([\w-]+)/.exec(message.Text);
      if (match) return match[1];
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`no invitation email for ${email}`);
}

async function login(creds: { email: string; password: string }): Promise<string> {
  const result = await authApi.login(creds.email, creds.password);
  return result.access_token;
}

describe('live backend through the Vite proxy', () => {
  const staffEmail = `live-staff-${stamp}@demo.test`;
  const ownerEmail = `live-owner-${stamp}@demo.test`;
  let staffToken = '';
  let staffMembershipId = '';
  let adminToken = '';
  let platformToken = '';
  let createdBusinessId = '';

  beforeAll(() => {
    expect(PLATFORM.email && ADMIN.email, 'set LIVE_PLATFORM_* and LIVE_ADMIN_* environment variables').toBeTruthy();
    setApiBaseUrl(`${FRONTEND}/api/v1`);
    configureApi({ getToken: () => token, onUnauthorized, onSuspended });
  });

  it('reaches the API through the proxy without any CORS configuration', async () => {
    const health = await fetch(`${FRONTEND}/api/v1/health`);
    expect(health.status).toBe(200);
    expect((await health.json()).data.database).toBe('ok');
    const preflight = await fetch(`${BACKEND}/api/v1/auth/login`, { method: 'OPTIONS', headers: { Origin: FRONTEND, 'Access-Control-Request-Method': 'POST' } });
    expect(preflight.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('only uses endpoints that exist in the backend OpenAPI schema', async () => {
    const schema = await fetch(`${BACKEND}/openapi.json`).then((r) => r.json());
    for (const [method, path] of IMPLEMENTED_ENDPOINTS) {
      const operations = schema.paths[`/api/v1${path}`];
      expect(operations, `${method} ${path}`).toBeDefined();
      expect(operations[method.toLowerCase()], `${method} ${path}`).toBeDefined();
    }
  });

  it('rejects bad credentials with a generic 401 and does not trigger the session hook', async () => {
    const error = (await authApi.login(ADMIN.email, 'Wrong!Pass123').catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(error.message).toBe('Invalid email or password');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('logs a Business Admin in and loads the current user with permissions', async () => {
    adminToken = await login(ADMIN);
    const me = await as(adminToken, () => authApi.me());
    expect(me.role).toBe('business_admin');
    expect(me.permissions).toEqual(['business.*']);
    expect(me.business?.name).toBeTruthy();
    expect(me.contexts.some((c) => c.type === 'business_admin')).toBe(true);
  });

  it('serves the permission catalog and the team list to the admin', async () => {
    const catalog = await as(adminToken, () => teamApi.catalog());
    expect(catalog.permissions).toHaveLength(26);
    expect(catalog.defaults).toEqual(['products.view', 'plans.view', 'subscriptions.view']);
    const team = await as(adminToken, () => teamApi.list({ page: 1, page_size: 5 }));
    expect(team.meta.page).toBe(1);
    expect(team.data.some((m) => m.role === 'business_admin' && m.permissions[0] === 'business.*')).toBe(true);
  });

  it('invites staff, delivers the invitation by email and accepts it', async () => {
    const created = await as(adminToken, () => teamApi.create({ full_name: 'Live Staff', email: staffEmail, permissions: ['products.view', 'plans.view'] }));
    staffMembershipId = created.id;
    expect(created.status).toBe('invited');
    expect(created.permissions).toEqual(['plans.view', 'products.view']);
    const invite = await inviteTokenFor(staffEmail);
    const accepted = await authApi.resetPassword({ token: invite, new_password: NEW_PASSWORD });
    expect(accepted.password_changed).toBe(true);
    const reuse = (await authApi.resetPassword({ token: invite, new_password: NEW_PASSWORD }).catch((e) => e)) as ApiError;
    expect(reuse.status).toBe(422);
    expect(reuse.details[0].field).toBe('token');
  });

  it('gives staff exactly the granted permissions and a 403 on admin routes', async () => {
    staffToken = await login({ email: staffEmail, password: NEW_PASSWORD });
    const me = await as(staffToken, () => authApi.me());
    expect(me.role).toBe('business_staff');
    expect(me.permissions).toEqual(['plans.view', 'products.view']);
    const forbidden = (await as(staffToken, () => teamApi.list({})).catch((e) => e)) as ApiError;
    expect(forbidden.status).toBe(403);
    expect(forbidden.code).toBe('FORBIDDEN');
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(onSuspended).not.toHaveBeenCalled();
  });

  it('applies permission changes to the existing staff token immediately', async () => {
    await as(adminToken, () => teamApi.setPermissions(staffMembershipId, ['invoices.view']));
    const me = await as(staffToken, () => authApi.me());
    expect(me.permissions).toEqual(['invoices.view']);
  });

  it('revokes staff access on deactivation (401) and restores it on activation', async () => {
    await as(adminToken, () => teamApi.deactivate(staffMembershipId));
    const rejected = (await as(staffToken, () => authApi.me()).catch((e) => e)) as ApiError;
    expect(rejected.status).toBe(401);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    await as(adminToken, () => teamApi.activate(staffMembershipId));
    const me = await as(staffToken, () => authApi.me());
    expect(me.role).toBe('business_staff');
  });

  it('treats a tampered token as unauthenticated', async () => {
    const before = onUnauthorized.mock.calls.length;
    const error = (await as(`${adminToken.slice(0, -4)}AAAA`, () => authApi.me()).catch((e) => e)) as ApiError;
    expect(error.status).toBe(401);
    expect(onUnauthorized.mock.calls.length).toBe(before + 1);
  });

  it('logs the Platform Admin in, lists businesses and keeps tenant routes closed', async () => {
    platformToken = await login(PLATFORM);
    const me = await as(platformToken, () => authApi.me());
    expect(me.role).toBe('platform');
    expect(me.permissions).toEqual(['platform.*']);
    const list = await as(platformToken, () => platformApi.list({ page: 1, page_size: 5 }));
    expect(list.data.length).toBeGreaterThan(0);
    expect(Object.keys(list.data[0]).sort()).toEqual(['admin_count', 'contact_email', 'created_at', 'currency', 'customer_count', 'id', 'legal_name', 'name', 'slug', 'staff_count', 'status', 'timezone']);
    const blocked = (await as(platformToken, () => teamApi.list({})).catch((e) => e)) as ApiError;
    expect(blocked.status).toBe(403);
    const adminOnPlatform = (await as(adminToken, () => platformApi.list({})).catch((e) => e)) as ApiError;
    expect(adminOnPlatform.status).toBe(403);
  });

  it('switches context between platform and another role and replaces the token', async () => {
    const me = await as(platformToken, () => authApi.me());
    const customerContext = me.contexts.find((c) => c.type === 'customer');
    if (!customerContext) return;
    const session = await as(platformToken, () => authApi.switchContext({ business_id: customerContext.business_id!, type: 'customer' }));
    expect(session.active_context.type).toBe('customer');
    expect(session.access_token).not.toBe(platformToken);
    const asCustomer = await as(session.access_token, () => authApi.me());
    expect(asCustomer.role).toBe('customer');
    const denied = (await as(session.access_token, () => platformApi.list({})).catch((e) => e)) as ApiError;
    expect(denied.status).toBe(403);
    const back = await as(session.access_token, () => authApi.switchContext({ context: 'platform' }));
    expect(back.active_context.type).toBe('platform');
  });

  it('refuses to switch into a business the user does not belong to', async () => {
    const foreign = '00000000-0000-4000-8000-000000000000';
    const error = (await as(adminToken, () => authApi.switchContext({ business_id: foreign, type: 'business_admin' })).catch((e) => e)) as ApiError;
    expect(error.status).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });

  it('creates a business, onboards its admin, and enforces suspension (403 BUSINESS_SUSPENDED) and reactivation', async () => {
    const business = await as(platformToken, () =>
      platformApi.create({ name: `Live Co ${stamp}`, slug: `live-${stamp}`, admin_full_name: 'Live Owner', admin_email: ownerEmail }),
    );
    createdBusinessId = business.id;
    expect(business.admin_count).toBe(1);
    const invite = await inviteTokenFor(ownerEmail);
    await authApi.resetPassword({ token: invite, new_password: NEW_PASSWORD });
    const ownerToken = await login({ email: ownerEmail, password: NEW_PASSWORD });
    expect((await as(ownerToken, () => authApi.me())).business?.name).toBe(`Live Co ${stamp}`);

    await as(platformToken, () => platformApi.suspend(createdBusinessId));
    const suspended = (await as(ownerToken, () => authApi.me()).catch((e) => e)) as ApiError;
    expect(suspended.status).toBe(403);
    expect(suspended.code).toBe('BUSINESS_SUSPENDED');
    expect(onSuspended).toHaveBeenCalledTimes(1);

    await as(platformToken, () => platformApi.activate(createdBusinessId));
    expect((await as(ownerToken, () => authApi.me())).role).toBe('business_admin');
  });

  it('changes the password and returns a working replacement token while revoking the old one', async () => {
    const original = await login({ email: staffEmail, password: NEW_PASSWORD });
    const changed = await as(original, () => authApi.changePassword({ current_password: NEW_PASSWORD, new_password: `${NEW_PASSWORD}x` }));
    const old = (await as(original, () => authApi.me()).catch((e) => e)) as ApiError;
    expect(old.status).toBe(401);
    expect((await as(changed.access_token, () => authApi.me())).role).toBe('business_staff');
    const wrong = (await as(changed.access_token, () => authApi.changePassword({ current_password: 'Nope!Pass123x', new_password: NEW_PASSWORD })).catch((e) => e)) as ApiError;
    expect(wrong.status).toBe(422);
    expect(wrong.details[0].field).toBe('current_password');
  });
});
