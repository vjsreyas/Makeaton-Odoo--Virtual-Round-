import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DEMO_NOTICE_PREFIX } from '../mock/demo';
import { installFetch, makeMe, renderApp, storeToken } from './utils';

const PAGES: [string, string][] = [
  ['Dashboard', 'Monthly Revenue Dynamics'],
  ['Reports', 'Financial & Invoicing Reports'],
  ['Products', 'Products & Variant Management'],
  ['Subscriptions', 'Subscriptions'],
  ['Invoices', 'Invoices Ledger'],
  ['Billing Run', 'Batch Billing Run & Automation'],
  ['Payments', 'Payments Ledger & Settlement Operations'],
  ['Outstanding & Overdue', 'Outstanding & Overdue Receivables'],
  ['Discounts', 'Discounts & Promotional Rules Engine'],
  ['Taxes', 'Taxes & Jurisdictional Rates'],
  ['Settings', 'System & Engine Settings'],
];

describe('existing prototype pages still render', () => {
  it.each(PAGES)('%s', async (label, heading) => {
    storeToken();
    installFetch({ 'GET /api/v1/auth/me': { body: { data: makeMe('business_admin', ['business.*']) } } });
    renderApp('/app');
    const user = userEvent.setup();
    const sidebar = await screen.findByRole('complementary');
    if (label !== 'Dashboard') await user.click(within(sidebar).getByText(label));
    expect((await screen.findAllByText(heading, { exact: false })).length).toBeGreaterThan(0);
    expect(screen.getByRole('note')).toHaveTextContent('Demo data.');
  });

  it('opens the invoice detail view from the ledger', async () => {
    storeToken();
    installFetch({ 'GET /api/v1/auth/me': { body: { data: makeMe('business_admin', ['business.*']) } } });
    renderApp('/app');
    const user = userEvent.setup();
    const sidebar = await screen.findByRole('complementary');
    await user.click(within(sidebar).getByText('Invoices'));
    await user.click((await screen.findAllByText('#INV-2026-00940'))[0]);
    expect(await screen.findByText('Record Payment')).toBeInTheDocument();
  });

  it('labels simulated actions as demo-only instead of claiming success', async () => {
    storeToken();
    installFetch({ 'GET /api/v1/auth/me': { body: { data: makeMe('business_admin', ['business.*']) } } });
    renderApp('/app');
    const user = userEvent.setup();
    const sidebar = await screen.findByRole('complementary');
    await user.click(within(sidebar).getByText('Payments'));
    await user.click(await screen.findByRole('button', { name: /Report Journal CSV/i }));
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining(DEMO_NOTICE_PREFIX));
  });

  it('contains no realistic-looking sensitive identifiers in the mock data', async () => {
    const data = await import('../mock/mockData');
    const text = JSON.stringify(data);
    expect(text).not.toMatch(/\b\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z]\d\b/);
    expect(text).not.toMatch(/\b021000021\b/);
    expect(text).not.toMatch(/@(?!demo\.example)[a-z0-9.-]+\.[a-z]{2,}/i);
  });
});
