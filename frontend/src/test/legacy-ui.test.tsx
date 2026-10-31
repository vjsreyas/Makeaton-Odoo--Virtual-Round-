import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { installFetch, makeMe, renderApp, storeToken } from './utils';

const page = <T,>(data: T[]) => ({ data, meta: { page: 1, page_size: 100, total: data.length, total_pages: 1 } });
const ADMIN = makeMe('business_admin', ['business.*']);

const INVOICE = {
  id: 'inv-1', number: 'INV-000001', status: 'confirmed', period_start: '2026-11-01', period_end: '2026-11-30', issue_date: '2026-11-01', due_date: '2026-11-16',
  subtotal: '55600.00', discount_total: '5560.00', tax_total: '9007.20', total: '59047.20', amount_paid: '20000.00', balance: '39047.20', currency: 'INR',
  payment_state: 'partial', is_overdue: false, days_overdue: 0, customer_id: 'c1', customer_name: 'Shop One', customer_email: 'shop@demo.example', subscription_id: 's1', subscription_number: 'SUB-000001',
};
const INVOICE_DETAIL = {
  ...INVOICE, customer: { name: 'Shop One', email: 'shop@demo.example', billing_address: null, tax_id: null },
  lines: [{ id: 'l1', description: 'Odoo ERP – Brand: Odoo', quantity: 10, unit_price: '5560.00', gross_amount: '55600.00', discount_amount: '5560.00', taxable_amount: '50040.00', tax_rate: '18.0000', tax_amount: '9007.20', line_total: '59047.20' }],
  payments: [{ id: 'p1', method: 'bank_transfer', amount: '20000.00', paid_on: '2026-11-05', reference: 'UTR1', notes: null, status: 'recorded' }], history: [],
};
const SUBSCRIPTION = { id: 's1', number: 'SUB-000001', status: 'active', billing_interval: 'monthly', start_date: '2026-11-01', expiry_date: '2027-10-31', next_period_start: '2026-12-01', customer_id: 'c1', customer_name: 'Shop One', customer_email: 'shop@demo.example', plan_id: 'pl1', plan_name: 'Odoo Monthly', subtotal: '55600.00', allowed_actions: ['pause', 'close'] };

const ROUTES = {
  'GET /api/v1/auth/me': { body: { data: ADMIN } },
  'GET /api/v1/invoices': { body: page([INVOICE]) },
  'GET /api/v1/invoices/inv-1': { body: { data: INVOICE_DETAIL } },
  'GET /api/v1/subscriptions': { body: page([SUBSCRIPTION]) },
  'GET /api/v1/products': { body: page([]) },
  'GET /api/v1/payments': { body: page([]) },
  'GET /api/v1/billing-runs': { body: page([]) },
  'GET /api/v1/tax-rules': { body: { data: [] } },
  'GET /api/v1/discount-rules': { body: { data: [] } },
  'GET /api/v1/customers': { body: page([]) },
  'GET /api/v1/plans': { body: page([]) },
  'GET /api/v1/quotation-templates': { body: { data: [] } },
  'GET /api/v1/reports/receivables': { body: { data: { buckets: [], invoices: [], total_outstanding: '0.00' } } },
  'GET /api/v1/reports/dashboard': { body: { data: { active_subscriptions: 1, revenue_collected: '20000.00', invoiced_total: '59047.20', outstanding_total: '39047.20', overdue: { count: 0, amount: '0.00' }, payments_count: 1, payments_by_method: [], revenue_by_month: [], recent_overdue_invoices: [], mrr: '55600.00', upcoming_renewals: 0, subscriptions_by_status: [], currency: 'INR' } } },
  'GET /api/v1/reports/revenue': { body: { data: { total: '20000.00', by_month: [], by_method: [], top_customers: [] } } },
  'GET /api/v1/reports/subscriptions-summary': { body: { data: { by_status: [], by_plan: [], mrr: '0.00' } } },
  'GET /api/v1/settings': { body: { data: { name: 'Acme', currency: 'INR', timezone: 'Asia/Kolkata', auto_confirm_invoices: false, default_payment_terms_days: 15, customer_self_service: true, legal_name: null, address: null, tax_id: null, contact_email: null } } },
};

const PAGES: [string, string][] = [
  ['Dashboard', 'Monthly Revenue Dynamics'],
  ['Reports', 'Financial & Invoicing Reports'],
  ['Products', 'Products & Variant Management'],
  ['Customers', 'People and companies you bill'],
  ['Plans', 'Price, billing interval'],
  ['Subscriptions', 'Subscriptions'],
  ['Invoices', 'Invoices Ledger'],
  ['Billing Run', 'Batch Billing Run & Automation'],
  ['Payments', 'Payments Ledger & Settlement Operations'],
  ['Outstanding & Overdue', 'Outstanding & Overdue Receivables'],
  ['Discounts', 'Discounts & Promotional Rules Engine'],
  ['Taxes', 'Taxes & Jurisdictional Rates'],
  ['Settings', 'Business settings'],
];

async function open(label: string) {
  storeToken();
  const mock = installFetch(ROUTES);
  renderApp('/app');
  const user = userEvent.setup();
  const sidebar = await screen.findByRole('complementary');
  if (label !== 'Dashboard') await user.click(within(sidebar).getByText(label));
  return { mock, user };
}

describe('business workspace pages load live data and render', () => {
  it.each(PAGES)('%s', async (label, heading) => {
    await open(label);
    expect((await screen.findAllByText(heading, { exact: false })).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Demo data/i)).not.toBeInTheDocument();
  });

  it('shows live invoices and opens the detail with real line items', async () => {
    const { mock, user } = await open('Invoices');
    await user.click((await screen.findAllByText('INV-000001'))[0]);
    expect(await screen.findByText('Odoo ERP – Brand: Odoo')).toBeInTheDocument();
    expect(mock.calls.some((c) => c.path === '/api/v1/invoices/inv-1')).toBe(true);
    expect(await screen.findByRole('button', { name: 'Record Payment' })).toBeInTheDocument();
  });

  it('offers only the lifecycle actions the server allows', async () => {
    const { mock, user } = await open('Subscriptions');
    expect(await screen.findByRole('button', { name: 'pause' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'renew' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'pause' }));
    await waitFor(() => expect(mock.calls.some((c) => c.method === 'POST' && c.path === '/api/v1/subscriptions/s1/pause')).toBe(true));
  });

  it('runs billing through the API', async () => {
    storeToken();
    const mock = installFetch({ ...ROUTES, 'POST /api/v1/billing-runs': { status: 202, body: { data: { id: 'r1', created_count: 2, skipped_count: 0, failed_count: 0 } } } });
    renderApp('/app');
    const user = userEvent.setup();
    await user.click(within(await screen.findByRole('complementary')).getByText('Billing Run'));
    await user.click(await screen.findByRole('button', { name: 'Run billing' }));
    await waitFor(() => expect(mock.calls.some((c) => c.method === 'POST' && c.path === '/api/v1/billing-runs')).toBe(true));
    expect(await screen.findByText(/2 created, 0 skipped, 0 failed/)).toBeInTheDocument();
  });

  it('contains no realistic-looking sensitive identifiers in the sample data', async () => {
    const data = await import('../mock/mockData');
    const text = JSON.stringify(data);
    expect(text).not.toMatch(/\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z]\d\b/);
    expect(text).not.toMatch(/\b021000021\b/);
  });
});
