import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { apiError, installFetch, makeMe, renderApp, storeToken } from './utils';

const ME = makeMe('business_admin', ['business.*']);

describe('forgot password', () => {
  it('shows the same confirmation after submitting', async () => {
    const mock = installFetch({ 'POST /api/v1/auth/forgot-password': { status: 202, body: { data: { message: 'If the email is registered, a reset link has been sent' } } } });
    renderApp('/forgot-password');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Email'), 'someone@demo.example');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByText(/If that email is registered, a reset link has been sent/)).toBeInTheDocument();
    expect(mock.calls[0].body).toEqual({ email: 'someone@demo.example' });
  });

  it('reports rate limiting', async () => {
    installFetch({ 'POST /api/v1/auth/forgot-password': apiError(429, 'RATE_LIMITED', 'Too many requests', [], { 'retry-after': '3600' }) });
    renderApp('/forgot-password');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Email'), 'someone@demo.example');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts');
  });
});

describe('reset password page', () => {
  it('reads the token, removes it from the address bar and submits it', async () => {
    const mock = installFetch({ 'POST /api/v1/auth/reset-password': { body: { data: { message: 'Password updated', password_changed: true } } } });
    renderApp('/reset-password?token=secret-token-123');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('New password'), 'N3w!Password9');
    await user.type(screen.getByLabelText('Confirm password'), 'N3w!Password9');
    expect(screen.getByTestId('location').textContent).toBe('/reset-password');
    await user.click(screen.getByRole('button', { name: 'Set new password' }));
    expect(await screen.findByText(/Your password has been set/)).toBeInTheDocument();
    expect(mock.calls[0].body).toEqual({ token: 'secret-token-123', new_password: 'N3w!Password9' });
    expect(mock.calls[0].headers.get('authorization')).toBeNull();
  });

  it('validates the password locally before calling the API', async () => {
    const mock = installFetch({});
    renderApp('/reset-password?token=t');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('New password'), 'short');
    await user.type(screen.getByLabelText('Confirm password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Set new password' }));
    expect(await screen.findByText('Password does not meet the requirements.')).toBeInTheDocument();
    expect(mock.calls).toHaveLength(0);
  });

  it('requires matching confirmation', async () => {
    installFetch({});
    renderApp('/reset-password?token=t');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('New password'), 'N3w!Password9');
    await user.type(screen.getByLabelText('Confirm password'), 'N3w!Password8');
    await user.click(screen.getByRole('button', { name: 'Set new password' }));
    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
  });

  it('explains an invalid or expired link', async () => {
    installFetch({ 'POST /api/v1/auth/reset-password': apiError(422, 'VALIDATION_ERROR', 'Request validation failed', [{ field: 'token', message: 'Invalid or expired token' }]) });
    renderApp('/reset-password?token=old');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('New password'), 'N3w!Password9');
    await user.type(screen.getByLabelText('Confirm password'), 'N3w!Password9');
    await user.click(screen.getByRole('button', { name: 'Set new password' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This reset link is invalid or has expired');
  });

  it('handles a link without a token', async () => {
    installFetch({});
    renderApp('/reset-password');
    expect(await screen.findByText('Reset link incomplete')).toBeInTheDocument();
  });
});

describe('invitation acceptance page', () => {
  it('lets a new user set a password', async () => {
    const mock = installFetch({ 'POST /api/v1/auth/reset-password': { body: { data: { message: 'Password updated', password_changed: true } } } });
    renderApp('/accept-invitation?token=invite-1');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('New password (optional)'), 'N3w!Password9');
    await user.type(screen.getByLabelText('Confirm password'), 'N3w!Password9');
    await user.click(screen.getByRole('button', { name: 'Accept invitation' }));
    expect(await screen.findByText(/Your password has been set/)).toBeInTheDocument();
    expect(mock.calls[0].body).toEqual({ token: 'invite-1', new_password: 'N3w!Password9' });
    expect(screen.getByTestId('location').textContent).toBe('/accept-invitation');
  });

  it('lets an existing user accept without a password and reports that it was kept', async () => {
    const mock = installFetch({ 'POST /api/v1/auth/reset-password': { body: { data: { message: 'Invitation accepted', password_changed: false } } } });
    renderApp('/accept-invitation?token=invite-2');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Accept invitation' }));
    expect(await screen.findByText(/Your existing password was kept/)).toBeInTheDocument();
    expect(mock.calls[0].body).toEqual({ token: 'invite-2' });
  });

  it('asks for a password when the server requires one', async () => {
    installFetch({ 'POST /api/v1/auth/reset-password': apiError(422, 'VALIDATION_ERROR', 'Request validation failed', [{ field: 'new_password', message: 'Required to activate this account' }]) });
    renderApp('/accept-invitation?token=invite-3');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Accept invitation' }));
    expect(await screen.findByText('Required to activate this account')).toBeInTheDocument();
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
  });

  it('explains an invalid invitation', async () => {
    installFetch({ 'POST /api/v1/auth/reset-password': apiError(422, 'VALIDATION_ERROR', 'Request validation failed', [{ field: 'token', message: 'Invalid or expired token' }]) });
    renderApp('/accept-invitation?token=bad');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Accept invitation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('invitation link is invalid or has expired');
  });
});

describe('registration', () => {
  const business = { 'GET /api/v1/public/businesses/demo-co': { body: { data: { name: 'Demo Co', slug: 'demo-co' } } } };

  async function fill(user: ReturnType<typeof userEvent.setup>, password = 'Str0ng!Pass9') {
    await user.type(await screen.findByLabelText('Full name'), 'Rita Shah');
    await user.type(screen.getByLabelText('Email'), 'rita@demo.example');
    await user.type(screen.getByLabelText('Password'), password);
    await user.type(screen.getByLabelText('Confirm password'), password);
    await user.click(screen.getByRole('button', { name: 'Create account' }));
  }

  it('shows the business name and registers a linked customer', async () => {
    const mock = installFetch({ ...business, 'POST /api/v1/auth/register': { status: 201, body: { data: { user_id: 'u', customer_id: 'c', role: 'customer' } } } });
    renderApp('/register/demo-co');
    expect(await screen.findByText('Customer registration for Demo Co.')).toBeInTheDocument();
    await fill(userEvent.setup());
    expect(await screen.findByText(/Your account for Demo Co is ready/)).toBeInTheDocument();
    expect(mock.calls.at(-1)!.body).toEqual({ business_slug: 'demo-co', full_name: 'Rita Shah', email: 'rita@demo.example', password: 'Str0ng!Pass9' });
  });

  it('explains the unlinked-record case', async () => {
    installFetch({ ...business, 'POST /api/v1/auth/register': { status: 201, body: { data: { user_id: 'u', customer_id: null, role: 'customer' } } } });
    renderApp('/register/demo-co');
    await fill(userEvent.setup());
    expect(await screen.findByText(/already has a customer record for this email address/)).toBeInTheDocument();
  });

  it('handles an existing email', async () => {
    installFetch({ ...business, 'POST /api/v1/auth/register': apiError(409, 'EMAIL_ALREADY_REGISTERED', 'This email is already registered') });
    renderApp('/register/demo-co');
    await fill(userEvent.setup());
    expect(await screen.findByRole('alert')).toHaveTextContent('already has a Brightloop account');
  });

  it('shows server field errors', async () => {
    installFetch({ ...business, 'POST /api/v1/auth/register': apiError(422, 'VALIDATION_ERROR', 'Request validation failed', [{ field: 'email', message: 'Must be a valid email address' }]) });
    renderApp('/register/demo-co');
    await fill(userEvent.setup());
    expect(await screen.findByText('Must be a valid email address')).toBeInTheDocument();
  });

  it('blocks weak passwords locally', async () => {
    const mock = installFetch(business);
    renderApp('/register/demo-co');
    await fill(userEvent.setup(), 'weakpass');
    expect(await screen.findByText('Password does not meet the requirements.')).toBeInTheDocument();
    expect(mock.calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('reports unknown businesses', async () => {
    installFetch({ 'GET /api/v1/public/businesses/nope': apiError(404, 'NOT_FOUND', 'Business not found') });
    renderApp('/register/nope');
    expect(await screen.findByText('Business not available')).toBeInTheDocument();
  });

  it('lets people enter a business identifier first', async () => {
    installFetch(business);
    renderApp('/register');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Business identifier'), 'Demo-Co');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/register/demo-co'));
  });
});

describe('change password', () => {
  async function open() {
    storeToken('old-token');
    const mock = installFetch({
      'GET /api/v1/auth/me': { body: { data: ME } },
      'POST /api/v1/auth/change-password': { body: { data: { access_token: 'new-token', expires_in: 28800 } } },
    });
    renderApp('/account/password');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Current password'), 'Str0ng!Pass9');
    await user.type(screen.getByLabelText('New password'), 'N3w!Password9');
    await user.type(screen.getByLabelText('Confirm new password'), 'N3w!Password9');
    return { mock, user };
  }

  it('replaces the stored token with the one returned', async () => {
    const { mock, user } = await open();
    await user.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await screen.findByText('Your password has been changed.')).toBeInTheDocument();
    expect(mock.calls.find((c) => c.path.endsWith('/change-password'))!.headers.get('authorization')).toBe('Bearer old-token');
    expect(JSON.parse(window.sessionStorage.getItem('brightloop.session')!).token).toBe('new-token');
    expect(mock.calls.filter((c) => c.path.endsWith('/auth/me')).at(-1)!.headers.get('authorization')).toBe('Bearer new-token');
  });

  it('shows a field error (and keeps the session) for a wrong current password', async () => {
    storeToken('old-token');
    installFetch({
      'GET /api/v1/auth/me': { body: { data: ME } },
      'POST /api/v1/auth/change-password': apiError(422, 'VALIDATION_ERROR', 'Request validation failed', [{ field: 'current_password', message: 'Current password is incorrect' }]),
    });
    renderApp('/account/password');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Current password'), 'wrong');
    await user.type(screen.getByLabelText('New password'), 'N3w!Password9');
    await user.type(screen.getByLabelText('Confirm new password'), 'N3w!Password9');
    await user.click(screen.getByRole('button', { name: 'Update password' }));
    expect(await screen.findByText('Current password is incorrect')).toBeInTheDocument();
    expect(window.sessionStorage.getItem('brightloop.session')).not.toBeNull();
  });
});

describe('start page for users without a business', () => {
  it('joins a business and explains the invitation case', async () => {
    storeToken();
    const none = makeMe('none', []);
    const mock = installFetch({
      'GET /api/v1/auth/me': { body: { data: none } },
      'POST /api/v1/auth/join-business': { body: { data: { customer_id: null, role: 'customer' } } },
    });
    renderApp('/start');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Business identifier'), 'demo-co');
    await user.click(screen.getByRole('button', { name: 'Join business' }));
    expect(await screen.findByText(/We sent you a confirmation email/)).toBeInTheDocument();
    expect(mock.calls.find((c) => c.path.endsWith('/join-business'))!.body).toEqual({ business_slug: 'demo-co' });
  });
});
