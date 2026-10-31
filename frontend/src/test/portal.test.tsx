import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { apiError, installFetch, makeMe, renderApp, storeToken } from './utils';

const page = <T,>(data: T[]) => ({ data, meta: { page: 1, page_size: 100, total: data.length, total_pages: 1 } });
const CUSTOMER = makeMe('customer', []);

const INVOICE = { id: 'i1', number: 'INV-000001', status: 'confirmed', is_overdue: true, days_overdue: 12, issue_date: '2026-10-01', due_date: '2026-10-16', total: '59047.20', balance: '39047.20', subscription_number: 'SUB-000001' };
const INVOICE_DETAIL = { ...INVOICE, period_start: '2026-10-01', period_end: '2026-10-31', subtotal: '55600.00', discount_total: '5560.00', tax_total: '9007.20', amount_paid: '20000.00',
  lines: [{ id: 'l1', description: 'Odoo ERP – Brand: Odoo', quantity: 10, unit_price: '5560.00', tax_rate: '18.0000', line_total: '59047.20' }],
  payments: [{ id: 'p1', method: 'bank_transfer', amount: '20000.00', paid_on: '2026-10-05', reference: 'UTR1', status: 'recorded' }] };
const SUB = { id: 's1', number: 'SUB-000001', status: 'active', billing_interval: 'monthly', start_date: '2026-10-01', expiry_date: '2027-09-30', next_period_start: '2026-11-01', plan_name: 'Odoo Monthly', subtotal: '55600.00' };
const SUB_DETAIL = { ...SUB, payment_terms_days: 15, plan: { name: 'Odoo Monthly' }, billing_interval: 'monthly', quotation_valid_until: null, customer: { name: 'Shop' },
  lines: [{ id: 'sl1', description: 'Odoo ERP – Brand: Odoo', quantity: 10, unit_price: '5560.00', tax_rate: '18.0000', amount: '55600.00' }], totals: { subtotal: '55600.00', tax_total: '10008.00', total: '65608.00' }, allowed_actions: ['pause', 'close'] };

const ROUTES = {
  'GET /api/v1/auth/me': { body: { data: CUSTOMER } },
  'GET /api/v1/portal/summary': { body: { data: { business: { name: 'Acme Cloud' }, active_subscriptions: 1, outstanding_balance: '39047.20', overdue_invoices: 1, upcoming_renewals: [], recent_invoices: [INVOICE], recent_payments: [{ id: 'p1', method: 'bank_transfer', amount: '20000.00', paid_on: '2026-10-05', invoice_number: 'INV-000001' }] } } },
  'GET /api/v1/portal/subscriptions': { body: page([SUB]) },
  'GET /api/v1/portal/subscriptions/s1': { body: { data: SUB_DETAIL } },
  'GET /api/v1/portal/invoices': { body: page([INVOICE]) },
  'GET /api/v1/portal/invoices/i1': { body: { data: INVOICE_DETAIL } },
  'GET /api/v1/portal/payments': { body: page([{ id: 'p1', invoice_id: 'i1', invoice_number: 'INV-000001', method: 'bank_transfer', amount: '20000.00', paid_on: '2026-10-05', reference: 'UTR1', status: 'recorded' }]) },
  'GET /api/v1/portal/profile': { body: { data: { id: 'c1', name: 'Shop One', email: 'shop@demo.example', phone: null, billing_address: null, tax_id: null } } },
};

async function open(routes: Record<string, any> = ROUTES) {
  storeToken();
  const mock = installFetch(routes);
  renderApp('/portal');
  return { mock, user: userEvent.setup() };
}
const nav = () => within(screen.getByRole('navigation', { name: 'Portal' }));

describe('customer portal', () => {
  it('shows the live overview with outstanding and overdue amounts', async () => {
    await open();
    expect(await screen.findByText(/Welcome, Test/)).toBeInTheDocument();
    expect((await screen.findAllByText(/39,047\.20/)).length).toBeGreaterThan(0);
    expect(screen.getByText('1 overdue')).toBeInTheDocument();
    expect(screen.queryByText(/Demo data/i)).not.toBeInTheDocument();
  });

  it('opens an invoice drawer with line items and payments from the API', async () => {
    const { mock, user } = await open();
    await user.click(within(await screen.findByRole('complementary')).getByText('My Invoices'));
    await user.click((await screen.findAllByText('INV-000001'))[0]);
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Odoo ERP – Brand: Odoo')).toBeInTheDocument();
    expect(within(dialog).getByText(/UTR1/)).toBeInTheDocument();
    expect(mock.calls.some((c) => c.path === '/api/v1/portal/invoices/i1')).toBe(true);
  });

  it('shows only the actions the server allows and calls the portal endpoint', async () => {
    const { mock, user } = await open({ ...ROUTES, 'POST /api/v1/portal/subscriptions/s1/pause': { body: { data: SUB_DETAIL } } });
    await user.click(within(await screen.findByRole('complementary')).getByText('My Subscriptions'));
    expect(await screen.findByRole('button', { name: 'Pause subscription' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept quotation' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pause subscription' }));
    await waitFor(() => expect(mock.calls.some((c) => c.method === 'POST' && c.path === '/api/v1/portal/subscriptions/s1/pause')).toBe(true));
  });

  it('shows plan-policy refusals as an error message', async () => {
    const { user } = await open({ ...ROUTES, 'POST /api/v1/portal/subscriptions/s1/pause': apiError(409, 'ACTION_NOT_ALLOWED_BY_PLAN', 'This plan does not allow pausing') });
    await user.click(within(await screen.findByRole('complementary')).getByText('My Subscriptions'));
    await user.click(await screen.findByRole('button', { name: 'Pause subscription' }));
    expect(await screen.findByText('This plan does not allow pausing')).toBeInTheDocument();
  });

  it('lists payments and saves profile changes', async () => {
    const { mock, user } = await open({ ...ROUTES, 'PATCH /api/v1/portal/profile': { body: { data: { id: 'c1', name: 'Shop One', email: 'shop@demo.example', phone: '999', billing_address: null, tax_id: null } } } });
    const side = within(await screen.findByRole('complementary'));
    await user.click(side.getByText('Payments & History'));
    expect(await screen.findByText('UTR1')).toBeInTheDocument();
    await user.click(side.getByText('Company & Profile'));
    const phone = await screen.findByLabelText('Phone');
    await user.type(phone, '999');
    await user.click(screen.getByRole('button', { name: 'Save profile' }));
    await waitFor(() => expect(mock.calls.find((c) => c.method === 'PATCH')!.body).toMatchObject({ phone: '999' }));
  });

  it('never calls staff endpoints', async () => {
    const { mock, user } = await open();
    await screen.findByText(/Welcome, Test/);
    await user.click(within(await screen.findByRole('complementary')).getByText('My Invoices'));
    expect(mock.calls.every((c) => !/\/api\/v1\/(invoices|payments|subscriptions|customers)/.test(c.path))).toBe(true);
  });
});
