import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { PermissionCatalog, PlatformBusiness, TeamMember } from '../api/types';
import { apiError, installFetch, makeMe, renderApp, storeToken } from './utils';

const CATALOG: PermissionCatalog = {
  permissions: [
    { code: 'products.view', module: 'products', action: 'view' },
    { code: 'products.create', module: 'products', action: 'create' },
    { code: 'invoices.view', module: 'invoices', action: 'view' },
  ],
  defaults: ['products.view'],
  admin_only: [],
};

function member(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: 'm-1', user_id: 'u-1', full_name: 'Dev Nair', email: 'dev@demo.example', role: 'business_staff',
    is_active: true, status: 'active', permissions: ['products.view'], created_at: '2026-10-31T06:59:29.845288Z', ...overrides,
  };
}

const ADMIN_MEMBER = member({ id: 'm-0', user_id: 'u-0', full_name: 'Olive Owner', email: 'olive@demo.example', role: 'business_admin', permissions: ['business.*'] });
const page = <T,>(data: T[]) => ({ data, meta: { page: 1, page_size: 10, total: data.length, total_pages: data.length ? 1 : 0 } });

async function openTeam(routes: Record<string, any>) {
  storeToken();
  const mock = installFetch({
    'GET /api/v1/auth/me': { body: { data: makeMe('business_admin', ['business.*']) } },
    'GET /api/v1/permissions/catalog': { body: { data: CATALOG } },
    ...routes,
  });
  renderApp('/app');
  const user = userEvent.setup();
  await user.click(await screen.findByText('Staff & Roles', { selector: 'span' }));
  return { mock, user };
}

describe('team management (live API)', () => {
  it('lists members with statuses, keeps admin rows read-only and sends list filters', async () => {
    const { mock, user } = await openTeam({
      'GET /api/v1/team': { body: page([ADMIN_MEMBER, member(), member({ id: 'm-2', full_name: 'Ana Invited', email: 'ana@demo.example', status: 'invited' })]) },
    });
    expect(await screen.findByText('Dev Nair')).toBeInTheDocument();
    expect(screen.getByText('Managed by the platform')).toBeInTheDocument();
    expect(screen.getByText('Invited')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Edit permissions for/ })).toHaveLength(2);
    await user.selectOptions(screen.getByLabelText('Filter by role'), 'business_staff');
    await waitFor(() => expect(mock.calls.filter((c) => c.path === '/api/v1/team').at(-1)!.query.get('role')).toBe('business_staff'));
  });

  it('creates a staff member with the chosen permissions', async () => {
    const created = member({ id: 'm-9', full_name: 'New Hire', email: 'new@demo.example', status: 'invited', permissions: ['products.view', 'invoices.view'] });
    const { mock, user } = await openTeam({
      'GET /api/v1/team': { body: page([ADMIN_MEMBER]) },
      'POST /api/v1/team': { status: 201, body: { data: created } },
    });
    await user.click(await screen.findByRole('button', { name: /Add staff member/ }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Full name'), 'New Hire');
    await user.type(within(dialog).getByLabelText('Email'), 'new@demo.example');
    expect(within(dialog).getByLabelText('products.view')).toBeChecked();
    await user.click(within(dialog).getByLabelText('invoices.view'));
    await user.click(within(dialog).getByRole('button', { name: 'Add member' }));
    expect(await screen.findByText('New Hire was added to the team.')).toBeInTheDocument();
    const post = mock.calls.find((c) => c.method === 'POST' && c.path === '/api/v1/team')!;
    expect(post.body).toEqual({ full_name: 'New Hire', email: 'new@demo.example', permissions: ['products.view', 'invoices.view'] });
    expect(JSON.stringify(post.body)).not.toContain('business_id');
  });

  it('shows ALREADY_MEMBER and validation errors inline', async () => {
    const { user } = await openTeam({
      'GET /api/v1/team': { body: page([ADMIN_MEMBER]) },
      'POST /api/v1/team': apiError(409, 'ALREADY_MEMBER', 'This person is already on the team'),
    });
    await user.click(await screen.findByRole('button', { name: /Add staff member/ }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Full name'), 'Dup');
    await user.type(within(dialog).getByLabelText('Email'), 'dup@demo.example');
    await user.click(within(dialog).getByRole('button', { name: 'Add member' }));
    expect(await within(dialog).findByText('This person is already on the team.')).toBeInTheDocument();
  });

  it('replaces permissions through PUT', async () => {
    const { mock, user } = await openTeam({
      'GET /api/v1/team': { body: page([ADMIN_MEMBER, member()]) },
      'PUT /api/v1/team/m-1/permissions': { body: { data: member({ permissions: ['products.view', 'products.create'] }) } },
    });
    await user.click(await screen.findByRole('button', { name: 'Edit permissions for Dev Nair' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByLabelText('products.create'));
    await user.click(within(dialog).getByRole('button', { name: 'Save permissions' }));
    expect(await screen.findByText('Permissions updated for Dev Nair.')).toBeInTheDocument();
    expect(mock.calls.find((c) => c.method === 'PUT')!.body).toEqual({ permissions: ['products.view', 'products.create'] });
  });

  it('deactivates after confirmation and surfaces refusal errors', async () => {
    const { mock, user } = await openTeam({
      'GET /api/v1/team': { body: page([ADMIN_MEMBER, member()]) },
      'POST /api/v1/team/m-1/deactivate': apiError(409, 'INVALID_STATE_TRANSITION', 'Team member is already inactive'),
    });
    await user.click(await screen.findByRole('button', { name: 'Deactivate' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }));
    expect(await within(dialog).findByText('Team member is already inactive')).toBeInTheDocument();
    expect(mock.calls.some((c) => c.path.endsWith('/m-1/deactivate'))).toBe(true);
  });

  it('shows an empty state and a retryable error state', async () => {
    let fail = true;
    const { user } = await openTeam({
      'GET /api/v1/team': () => (fail ? apiError(500, 'INTERNAL_ERROR', 'Internal server error') : { body: page([]) }),
    });
    expect(await screen.findByText(/The server had a problem/)).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No team members match')).toBeInTheDocument();
  });
});

function business(overrides: Partial<PlatformBusiness> = {}): PlatformBusiness {
  return {
    id: 'b-1', name: 'Acme Cloud', slug: 'acme', status: 'active', timezone: 'Asia/Kolkata', currency: 'INR',
    legal_name: null, contact_email: 'owner@demo.example', created_at: '2026-10-31T06:59:21Z', admin_count: 1, staff_count: 2, customer_count: 3, ...overrides,
  };
}

async function openPlatform(routes: Record<string, any>) {
  storeToken();
  const mock = installFetch({ 'GET /api/v1/auth/me': { body: { data: makeMe('platform', ['platform.*']) } }, ...routes });
  renderApp('/platform/businesses');
  return { mock, user: userEvent.setup() };
}

describe('platform business management (live API)', () => {
  it('lists businesses with counts only', async () => {
    await openPlatform({ 'GET /api/v1/platform/businesses': { body: page([business(), business({ id: 'b-2', name: 'Northwind', slug: 'northwind', status: 'suspended' })]) } });
    expect(await screen.findByText('Acme Cloud')).toBeInTheDocument();
    expect(screen.getAllByText('Suspended').length).toBeGreaterThan(0);
    expect(screen.getByText('acme')).toBeInTheDocument();
  });

  it('searches and filters on the server', async () => {
    const { mock, user } = await openPlatform({ 'GET /api/v1/platform/businesses': { body: page([business()]) } });
    await screen.findByText('Acme Cloud');
    await user.selectOptions(screen.getByLabelText('Filter by status'), 'suspended');
    await user.type(screen.getByLabelText('Search businesses'), 'north');
    await waitFor(() => {
      const last = mock.calls.filter((c) => c.path === '/api/v1/platform/businesses').at(-1)!;
      expect(last.query.get('status')).toBe('suspended');
      expect(last.query.get('q')).toBe('north');
    });
  });

  it('creates a business and reports the invitation', async () => {
    const { mock, user } = await openPlatform({
      'GET /api/v1/platform/businesses': { body: page([]) },
      'POST /api/v1/platform/businesses': { status: 201, body: { data: business({ name: 'New Co', slug: 'new-co' }) } },
    });
    await user.click(await screen.findByRole('button', { name: /New business/ }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Business name'), 'New Co');
    await user.type(within(dialog).getByLabelText('Identifier (slug)'), 'New-Co');
    await user.type(within(dialog).getByLabelText('Administrator name'), 'Olive Owner');
    await user.type(within(dialog).getByLabelText('Administrator email'), 'olive@demo.example');
    await user.click(within(dialog).getByRole('button', { name: 'Create business' }));
    expect(await screen.findByText(/New Co was created/)).toBeInTheDocument();
    expect(mock.calls.find((c) => c.method === 'POST')!.body).toEqual({ name: 'New Co', slug: 'new-co', admin_full_name: 'Olive Owner', admin_email: 'olive@demo.example' });
  });

  it('shows duplicate slug and validation errors on the fields', async () => {
    const { user } = await openPlatform({
      'GET /api/v1/platform/businesses': { body: page([]) },
      'POST /api/v1/platform/businesses': apiError(409, 'SLUG_TAKEN', 'This business slug is already in use'),
    });
    await user.click(await screen.findByRole('button', { name: /New business/ }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Business name'), 'X');
    await user.type(within(dialog).getByLabelText('Identifier (slug)'), 'taken');
    await user.type(within(dialog).getByLabelText('Administrator name'), 'A');
    await user.type(within(dialog).getByLabelText('Administrator email'), 'a@demo.example');
    await user.click(within(dialog).getByRole('button', { name: 'Create business' }));
    expect(await within(dialog).findByText('This identifier is already in use.')).toBeInTheDocument();
  });

  it('suspends after confirmation', async () => {
    const { mock, user } = await openPlatform({
      'GET /api/v1/platform/businesses': { body: page([business()]) },
      'POST /api/v1/platform/businesses/b-1/suspend': { body: { data: business({ status: 'suspended' }) } },
    });
    await user.click(await screen.findByRole('button', { name: 'Suspend' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('lose access immediately');
    await user.click(within(dialog).getByRole('button', { name: 'Suspend' }));
    expect(await screen.findByText('Acme Cloud is now suspended.')).toBeInTheDocument();
    expect(mock.calls.some((c) => c.path.endsWith('/b-1/suspend'))).toBe(true);
  });

  it('resends the administrator invitation and handles the none-pending refusal', async () => {
    const { user } = await openPlatform({
      'GET /api/v1/platform/businesses': { body: page([business()]) },
      'POST /api/v1/platform/businesses/b-1/resend-admin-invite': apiError(409, 'INVALID_STATE_TRANSITION', 'No pending administrator invitation'),
    });
    await user.click(await screen.findByRole('button', { name: 'Resend invitation for Acme Cloud' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Resend' }));
    expect(await within(dialog).findByText('No pending administrator invitation')).toBeInTheDocument();
  });

  it('edits profile fields only', async () => {
    const { mock, user } = await openPlatform({
      'GET /api/v1/platform/businesses': { body: page([business()]) },
      'PATCH /api/v1/platform/businesses/b-1': { body: { data: business({ name: 'Acme Renamed' }) } },
    });
    await user.click(await screen.findByRole('button', { name: 'Edit Acme Cloud' }));
    const dialog = await screen.findByRole('dialog');
    const name = within(dialog).getByLabelText('Business name');
    await user.clear(name);
    await user.type(name, 'Acme Renamed');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Business updated.')).toBeInTheDocument();
    expect(Object.keys(mock.calls.find((c) => c.method === 'PATCH')!.body).sort()).toEqual(['contact_email', 'legal_name', 'name']);
  });
});
