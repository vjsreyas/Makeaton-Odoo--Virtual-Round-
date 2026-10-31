import type { Invoice, Subscription } from '../types';
import { roundMoney } from '../lib/india';

export function invoiceSummary(invoices: Invoice[]) {
  const issued = invoices.filter(invoice => !['Draft', 'Cancelled'].includes(invoice.status));
  const invoiced = roundMoney(issued.reduce((sum, invoice) => sum + invoice.totalAmount, 0));
  const collected = roundMoney(issued.reduce((sum, invoice) => sum + invoice.paidAmount, 0));
  const outstanding = roundMoney(issued.reduce((sum, invoice) => sum + invoice.balanceDue, 0));
  const overdue = issued.filter(invoice => invoice.status === 'Overdue');
  const tax = roundMoney(issued.reduce((sum, invoice) => sum + invoice.lineItems.reduce((lineSum, line) => lineSum + roundMoney(line.amount * line.taxRate / 100), 0), 0));
  return { issued, invoiced, collected, outstanding, overdue, overdueAmount: roundMoney(overdue.reduce((sum, invoice) => sum + invoice.balanceDue, 0)), tax, drafts: invoices.filter(invoice => invoice.status === 'Draft') };
}
export function monthlyRevenue(subscriptions: Subscription[]) {
  return roundMoney(subscriptions.filter(sub => sub.status === 'Active').reduce((sum, sub) => sum + sub.cadenceValue / (sub.cadence === 'Annual' ? 12 : sub.cadence === 'Quarterly' ? 3 : 1), 0));
}
