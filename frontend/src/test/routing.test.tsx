import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  BUSINESS_A,
  BUSINESS_B,
  apiError,
  context,
  installFetch,
  makeLogin,
  makeMe,
  renderApp,
  storeToken,
} from './utils';

const STAFF_PERMS = ['products.view', 'plans.view', 'subscriptions.view'];
const ADMIN = makeMe('business_admin', ['business.*']);
const STAFF = makeMe('business_staff', STAFF_PERMS);

function nav() {
  return screen.getByRole('complementary');
}

describe('authentication gate', () => {
  it('redirects anonymous visitors to login and remembers the target', async () => {
    installFetch({});
    renderApp('/app');
    expect(await screen.findByText('Sign in to Brightloop')).toBeInTheDocument();
    expect(screen.getByTestId('location').textContent).toBe('/login?next=%2Fapp');
  });

  it('logs in, loads the current user and opens the role home', async () => {
    const mock = installFetch({
      'POST /api/v1/auth/login': { body: { data: makeLogin(ADMIN, 'jwt-1') } },
      'GET /api/v1/auth/me': { body: { data: ADMIN } },
    });
    renderApp('/login');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Email'), 'admin@demo.example');
    await user.type(screen.getByLabelText('Password'), 'Str0ng!Pass9');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByText('Staff & Roles', { selector: 'span' });
    expect(mock.calls.slice(0, 2).map((c) => `${c.method} ${c.path}`)).toEqual(['POST /api/v1/auth/login', 'GET /api/v1/auth/me']);
    expect(mock.calls[1].headers.get('authorization')).toBe('Bearer jwt-1');
    expect(screen.getByTestId('location').textContent).toBe('/app');
    expect(JSON.parse(window.sessionStorage.getItem('brightloop.session')!).token).toBe('jwt-1');
  });

  it('follows a safe next parameter and ignores an external one', async () => {
    installFetch({
      'POST /api/v1/auth/login': { body: { data: makeLogin(ADMIN) } },
      'GET /api/v1/auth/me': { body: { data: ADMIN } },
      'GET /api/v1/team': { body: { data: [], meta: { page: 1, page_size: 10, total: 0, total_pages: 0 } } },
      'GET /api/v1/permissions/catalog': { body: { data: { permissions: [], defaults: [], admin_only: [] } } },
    });
    renderApp('/login?next=//evil.example');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Email'), 'admin@demo.example');
    await user.type(screen.getByLabelText('Password'), 'Str0ng!Pass9');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/app'));
  });

  it('shows one generic message for bad credentials and clears the password', async () => {
    installFetch({ 'POST /api/v1/auth/login': apiError(401, 'UNAUTHENTICATED', 'Invalid email or password') });
    renderApp('/login');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Email'), 'x@demo.example');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
    expect(screen.getByLabelText('Password')).toHaveValue('');
  });

  it('reports rate limiting with the wait time', async () => {
    installFetch({ 'POST /api/v1/auth/login': apiError(429, 'RATE_LIMITED', 'Too many requests, try again later', [], { 'retry-after': '30' }) });
    renderApp('/login');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Email'), 'x@demo.example');
    await user.type(screen.getByLabelText('Password'), 'whatever');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again in 30 seconds');
  });

  it('restores a stored session with the bearer token', async () => {
    storeToken('stored-jwt');
    const mock = installFetch({ 'GET /api/v1/auth/me': { body: { data: ADMIN } } });
    renderApp('/');
    await screen.findByText('Staff & Roles', { selector: 'span' });
    expect(mock.calls[0].headers.get('authorization')).toBe('Bearer stored-jwt');
  });

  it('ignores an expired stored session without calling the API', async () => {
    storeToken('old', -1000);
    const mock = installFetch({});
    renderApp('/app');
    await screen.findByText('Sign in to Brightloop');
    expect(mock.calls).toHaveLength(0);
  });

  it('clears the session and explains when the token is rejected (401)', async () => {
    storeToken();
    installFetch({ 'GET /api/v1/auth/me': apiError(401, 'UNAUTHENTICATED', 'Invalid or expired token') });
    renderApp('/app');
    expect(await screen.findByText('Your session has ended. Please sign in again.')).toBeInTheDocument();
    expect(window.sessionStorage.getItem('brightloop.session')).toBeNull();
  });

  it('signs out from the account menu and clears stored credentials', async () => {
    storeToken();
    installFetch({ 'GET /api/v1/auth/me': { body: { data: ADMIN } } });
    renderApp('/app');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Test Person/ }));
    await user.click(screen.getByRole('button', { name: /Log out/ }));
    expect(await screen.findByText('Sign in to Brightloop')).toBeInTheDocument();
    expect(window.sessionStorage.getItem('brightloop.session')).toBeNull();
  });
});

describe('permission-aware navigation', () => {
  it('shows a Business Admin every section including Staff & Roles and Run Billing', async () => {
    storeToken();
    installFetch({ 'GET /api/v1/auth/me': { body: { data: ADMIN } } });
    renderApp('/app');
    await screen.findByText('Staff & Roles', { selector: 'span' });
    for (const label of ['Dashboard', 'Reports', 'Products', 'Plans', 'Quotation Templates', 'Subscriptions', 'Invoices', 'Billing Run', 'Payments', 'Outstanding & Overdue', 'Discounts', 'Taxes', 'Staff & Roles', 'Settings']) {
      expect(within(nav()).getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: /Run Billing/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Subscription/ })).toBeInTheDocument();
  });

  it('shows staff only the modules granted to them and no admin actions', async () => {
    storeToken();
    installFetch({ 'GET /api/v1/auth/me': { body: { data: STAFF } } });
    renderApp('/app');
    await screen.findByText('Products', { selector: 'span' });
    const sidebar = within(nav());
    for (const label of ['Dashboard', 'Products', 'Plans', 'Subscriptions']) expect(sidebar.getByText(label)).toBeInTheDocument();
    for (const label of ['Invoices', 'Billing Run', 'Payments', 'Outstanding & Overdue', 'Discounts', 'Taxes', 'Staff & Roles', 'Settings', 'Reports', 'Quotation Templates']) {
      expect(sidebar.queryByText(label)).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: /Run Billing/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New Subscription/ })).not.toBeInTheDocument();
  });

  it('shows the new-subscription action only with subscriptions.create', async () => {
    storeToken();
    installFetch({ 'GET /api/v1/auth/me': { body: { data: makeMe('business_staff', ['subscriptions.view', 'subscriptions.create']) } } });
    renderApp('/app');
    expect(await screen.findByRole('button', { name: /New Subscription/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Run Billing/ })).not.toBeInTheDocument();
  });

  it('no longer offers the mock Admin/Staff role switcher', async () => {
    storeToken();
    installFetch({ 'GET /api/v1/auth/me': { body: { data: STAFF } } });
    renderApp('/app');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Test Person/ }));
    expect(screen.queryByText(/Test Role Privilege/i)).not.toBeInTheDocument();
    expect(screen.getByText('Business Staff • Acme Cloud')).toBeInTheDocument();
  });

  it('shows the Team page without any banner', async () => {
    storeToken();
    installFetch({
      'GET /api/v1/auth/me': { body: { data: ADMIN } },
      'GET /api/v1/team': { body: { data: [], meta: { page: 1, page_size: 10, total: 0, total_pages: 0 } } },
      'GET /api/v1/permissions/catalog': { body: { data: { permissions: [], defaults: [], admin_only: [] } } },
    });
    renderApp('/app');
    const user = userEvent.setup();
    await user.click(await screen.findByText('Staff & Roles', { selector: 'span' }));
    await screen.findByText('No team members match');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});

describe('role based routing', () => {
  it('sends platform admins to the businesses page and keeps business users out', async () => {
    storeToken();
    installFetch({
      'GET /api/v1/auth/me': { body: { data: makeMe('platform', ['platform.*']) } },
      'GET /api/v1/platform/businesses': { body: { data: [], meta: { page: 1, page_size: 10, total: 0, total_pages: 0 } } },
    });
    renderApp('/');
    await screen.findByRole('heading', { name: 'Businesses' });
    expect(screen.getByTestId('location').textContent).toBe('/platform/businesses');
  });

  it('redirects a business admin away from platform pages', async () => {
    storeToken();
    installFetch({ 'GET /api/v1/auth/me': { body: { data: ADMIN } } });
    renderApp('/platform/businesses');
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/app'));
  });

  it('shows customers the portal and keeps them out of the back office', async () => {
    storeToken();
    installFetch({ 'GET /api/v1/auth/me': { body: { data: makeMe('customer', []) } } });
    renderApp('/app');
    await screen.findByRole('heading', { name: /Welcome, Test/ });
    expect(screen.getByTestId('location').textContent).toBe('/portal');
  });

  it('sends users without a usable context to the start page', async () => {
    storeToken();
    installFetch({ 'GET /api/v1/auth/me': { body: { data: makeMe('none', []) } } });
    renderApp('/');
    await screen.findByRole('heading', { name: 'Choose a business' });
    expect(screen.getByTestId('location').textContent).toBe('/start');
  });
});

describe('business context switching', () => {
  const contexts = [context('business_admin', BUSINESS_A), context('business_staff', BUSINESS_B), context('customer', BUSINESS_B, 'suspended')];
  const meA = makeMe('business_admin', ['business.*'], contexts);
  const meB = makeMe('business_staff', ['products.view'], contexts, BUSINESS_B);

  it('switches business, replaces the token and reloads the workspace for the new role', async () => {
    storeToken('token-a');
    let current = meA;
    const mock = installFetch({
      'GET /api/v1/auth/me': () => ({ body: { data: current } }),
      'POST /api/v1/auth/switch-context': () => {
        current = meB;
        return { body: { data: { access_token: 'token-b', expires_in: 28800, active_context: meB.active_context } } };
      },
    });
    renderApp('/app');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Test Person/ }));
    await user.click(screen.getByRole('button', { name: /Northwind Fitness Business Staff/ }));
    await waitFor(() => expect(within(nav()).queryByText('Staff & Roles')).not.toBeInTheDocument());
    const switchCall = mock.calls.find((c) => c.path.endsWith('/switch-context'))!;
    expect(switchCall.body).toEqual({ business_id: BUSINESS_B.id, type: 'business_staff' });
    expect(switchCall.headers.get('authorization')).toBe('Bearer token-a');
    const after = mock.calls.filter((c) => c.path.endsWith('/auth/me')).at(-1)!;
    expect(after.headers.get('authorization')).toBe('Bearer token-b');
    expect(JSON.parse(window.sessionStorage.getItem('brightloop.session')!).token).toBe('token-b');
  });

  it('disables suspended contexts', async () => {
    storeToken();
    installFetch({ 'GET /api/v1/auth/me': { body: { data: meA } } });
    renderApp('/app');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Test Person/ }));
    const suspended = screen.getByRole('button', { name: /Northwind Fitness Customer/ });
    expect(suspended).toBeDisabled();
    expect(suspended).toHaveTextContent('Suspended');
  });

  it('shows the server message when a switch is refused', async () => {
    storeToken();
    installFetch({
      'GET /api/v1/auth/me': { body: { data: meA } },
      'POST /api/v1/auth/switch-context': apiError(403, 'FORBIDDEN', 'Context not available'),
    });
    renderApp('/app');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Test Person/ }));
    await user.click(screen.getByRole('button', { name: /Northwind Fitness Business Staff/ }));
    expect(await screen.findByText('Context not available')).toBeInTheDocument();
  });
});

describe('suspension and authorization failures', () => {
  it('shows the suspended screen when the stored session belongs to a suspended business', async () => {
    storeToken();
    installFetch({ 'GET /api/v1/auth/me': apiError(403, 'BUSINESS_SUSPENDED', 'This business is suspended') });
    renderApp('/app');
    expect(await screen.findByRole('heading', { name: 'This business is suspended' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
  });

  it('switches to the suspended screen when a call returns BUSINESS_SUSPENDED mid-session', async () => {
    storeToken();
    installFetch({
      'GET /api/v1/auth/me': { body: { data: ADMIN } },
      'GET /api/v1/team': apiError(403, 'BUSINESS_SUSPENDED', 'This business is suspended'),
      'GET /api/v1/permissions/catalog': apiError(403, 'BUSINESS_SUSPENDED', 'This business is suspended'),
    });
    renderApp('/app');
    const user = userEvent.setup();
    await user.click(await screen.findByText('Staff & Roles', { selector: 'span' }));
    expect(await screen.findByRole('heading', { name: 'This business is suspended' })).toBeInTheDocument();
  });

  it('offers other businesses from the suspended screen', async () => {
    storeToken();
    const contexts = [context('business_admin', BUSINESS_A, 'suspended'), context('business_staff', BUSINESS_B)];
    const meB = makeMe('business_staff', ['products.view'], contexts, BUSINESS_B);
    let suspended = true;
    installFetch({
      'POST /api/v1/auth/login': { body: { data: makeLogin(makeMe('business_admin', ['business.*'], contexts)) } },
      'GET /api/v1/auth/me': () => (suspended ? apiError(403, 'BUSINESS_SUSPENDED', 'This business is suspended') : { body: { data: meB } }),
      'POST /api/v1/auth/switch-context': () => {
        suspended = false;
        return { body: { data: { access_token: 'tok-b', expires_in: 100, active_context: meB.active_context } } };
      },
    });
    renderApp('/login');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Email'), 'a@demo.example');
    await user.type(screen.getByLabelText('Password'), 'Str0ng!Pass9');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByRole('heading', { name: 'This business is suspended' });
    await user.click(screen.getByRole('button', { name: /Northwind Fitness Business Staff/ }));
    await screen.findByText('Products', { selector: 'span' });
    expect(screen.queryByRole('heading', { name: 'This business is suspended' })).not.toBeInTheDocument();
  });

  it('treats a plain 403 as not-allowed without ending the session', async () => {
    storeToken();
    installFetch({
      'GET /api/v1/auth/me': { body: { data: ADMIN } },
      'GET /api/v1/team': apiError(403, 'FORBIDDEN', 'Business Admin access required'),
      'GET /api/v1/permissions/catalog': apiError(403, 'FORBIDDEN', 'Business Admin access required'),
    });
    renderApp('/app');
    const user = userEvent.setup();
    await user.click(await screen.findByText('Staff & Roles', { selector: 'span' }));
    expect(await screen.findAllByText('Business Admin access required')).not.toHaveLength(0);
    expect(window.sessionStorage.getItem('brightloop.session')).not.toBeNull();
  });

  it('ends the session when an API call returns 401 mid-session', async () => {
    storeToken();
    installFetch({
      'GET /api/v1/auth/me': { body: { data: ADMIN } },
      'GET /api/v1/team': apiError(401, 'UNAUTHENTICATED', 'Invalid or expired token'),
      'GET /api/v1/permissions/catalog': apiError(401, 'UNAUTHENTICATED', 'Invalid or expired token'),
    });
    renderApp('/app');
    const user = userEvent.setup();
    await user.click(await screen.findByText('Staff & Roles', { selector: 'span' }));
    expect(await screen.findByText('Your session has ended. Please sign in again.')).toBeInTheDocument();
    expect(window.sessionStorage.getItem('brightloop.session')).toBeNull();
  });

  it('shows not-allowed instead of the module when staff reach a tab without permission', async () => {
    storeToken();
    installFetch({ 'GET /api/v1/auth/me': { body: { data: makeMe('business_staff', ['products.view']) } } });
    renderApp('/app');
    await screen.findByText('Products', { selector: 'span' });
    expect(within(nav()).queryByText('Invoices')).not.toBeInTheDocument();
    expect(screen.queryByText('Invoices Ledger')).not.toBeInTheDocument();
  });
});
