import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { INITIAL_INVOICES, INITIAL_SUBSCRIPTIONS, INITIAL_PRODUCTS, PAYMENT_ENTRIES, RECEIVABLES_ACCOUNTS, QUEUED_BILLING_ITEMS } from '../mock/mockData';
import { invoiceSummary } from '../mock/summary';
import { money, roundMoney } from '../lib/india';
import { installFetch, makeMe, renderApp, storeToken } from './utils';

it('uses Indian grouping and rupees for amounts', () => {
  expect(money(123456.78)).toBe('₹1,23,456.78');
});
it('every invoice resolves to the same customer and price in subscriptions', () => {
  for (const invoice of INITIAL_INVOICES) {
    const subscription = INITIAL_SUBSCRIPTIONS.find(sub => sub.id === invoice.subscriptionRef)!;
    expect(subscription.customerName).toBe(invoice.customerName);
    expect(roundMoney(invoice.lineItems.reduce((sum,line) => sum+line.quantity*line.unitPrice,0))).toBe(subscription.cadenceValue);
    expect(invoice.customerAddress).not.toMatch(/USA|Denmark|San Francisco/);
  }
});
it('invoice lines, tax, payments and balances reconcile to the paisa', () => {
  for (const invoice of INITIAL_INVOICES) {
    const total = roundMoney(invoice.lineItems.reduce((sum,line) => sum+line.amount+roundMoney(line.amount*line.taxRate/100),0));
    expect(invoice.totalAmount).toBe(total);
    expect(invoice.paidAmount).toBe(roundMoney(invoice.payments.reduce((sum,payment) => sum+payment.amount,0)));
    expect(invoice.balanceDue).toBe(roundMoney(invoice.totalAmount-invoice.paidAmount));
    expect(roundMoney(PAYMENT_ENTRIES.filter(payment => payment.invoiceRef === invoice.id).reduce((sum,payment) => sum+payment.amountSettled,0))).toBe(invoice.paidAmount);
  }
});
it('reconciles the dashboard with the complete ledger and excludes drafts', () => {
  const summary = invoiceSummary(INITIAL_INVOICES);
  expect(summary.invoiced).toBe(roundMoney(summary.collected+summary.outstanding));
  expect(summary.issued).toHaveLength(7);
  expect(summary.drafts).toHaveLength(1);
  expect(summary.collected).toBe(roundMoney(PAYMENT_ENTRIES.reduce((sum,payment) => sum+payment.amountSettled,0)));
  expect(summary.outstanding).toBe(roundMoney(RECEIVABLES_ACCOUNTS.reduce((sum,account) => sum+account.balanceDue,0)));
});
it('the worked Odoo example has the required variant, discount and exact totals', () => {
  const product = INITIAL_PRODUCTS[0];
  expect(product.salesBasePrice).toBe(5000);
  expect(product.variants[0].extraPrice).toBe(560);
  expect(INITIAL_INVOICES[0]).toMatchObject({ customerName: 'Lakshmi Traders', totalAmount: 59047.2, paidAmount: 20000, balanceDue: 39047.2, overdueDays: 15 });
});
it('November preview links only existing monthly subscriptions and calculates its amount', () => {
  for (const item of QUEUED_BILLING_ITEMS) {
    const sub = INITIAL_SUBSCRIPTIONS.find(sub => sub.id === item.subscriptionId)!;
    expect(item.customerName).toBe(sub.customerName);
    expect(sub.cadence).toBe('Monthly');
    expect(item.estimatedAmount).toBe(roundMoney(sub.cadenceValue*1.18));
    expect(item.validationStatus === 'Paused / Excluded').toBe(sub.status === 'Paused');
  }
});
it('staff without report permission do not fetch financial summaries', async () => {
  storeToken();
  const mock = installFetch({ 'GET /api/v1/auth/me': { body: { data: makeMe('business_staff',['products.view']) } } });
  renderApp('/app');
  await screen.findByText('Your workspace');
  expect(mock.calls.some(call => call.path === '/api/v1/reports/dashboard')).toBe(false);
  expect(screen.queryByText('Payments received')).not.toBeInTheDocument();
});
