import { biz, type Rec } from '../api/business';
import { can } from '../auth/permissions';
import { indiaDate } from '../lib/india';
import type {
  BillingRunHistory,
  DiscountRule,
  Invoice,
  PaymentEntry,
  ProductItem,
  QueuedBillingItem,
  ReceivablesAccount,
  Subscription,
  TaxRegime,
} from '../types';
import type { WorkspaceData } from './workspaceData';

const num = (value: unknown): number => Number(value ?? 0);
const date = (value: unknown): string => (value ? indiaDate(String(value)) : '—');
const short = (id: string): string => id.slice(0, 8).toUpperCase();
const METHODS: Record<string, string> = { cash: 'Cash', bank_transfer: 'Bank Transfer', card: 'Card', upi: 'UPI', cheque: 'Cheque', other: 'Other' };
export const methodLabel = (method: string): string => METHODS[method] ?? method;
export const methodCode = (label: string): string => {
  const normalized = label.trim().toLowerCase();
  if (['neft', 'rtgs', 'imps', 'wire', 'bank transfer', 'bank'].includes(normalized)) return 'bank_transfer';
  if (normalized === 'upi') return 'upi';
  if (normalized.includes('card')) return 'card';
  if (normalized.includes('cheque') || normalized.includes('check')) return 'cheque';
  if (normalized === 'cash') return 'cash';
  return 'other';
};

export function invoiceStatus(row: Rec): Invoice['status'] {
  if (row.is_overdue) return 'Overdue';
  return ({ draft: 'Draft', confirmed: 'Confirmed', paid: 'Paid', cancelled: 'Cancelled' } as const)[row.status as 'draft'] ?? 'Draft';
}

export function mapInvoice(row: Rec): Invoice {
  const customer = row.customer ?? {};
  const terms = Math.max(0, Math.round((new Date(row.due_date).getTime() - new Date(row.issue_date).getTime()) / 86400000));
  return {
    uuid: row.id,
    id: row.number,
    customerName: customer.name ?? row.customer_name ?? '',
    customerEmail: customer.email ?? row.customer_email ?? '',
    customerGstPan: customer.tax_id ?? undefined,
    customerAddress: customer.billing_address ?? undefined,
    subscriptionRef: row.subscription_number ?? '',
    issueDate: date(row.issue_date),
    dueDate: date(row.due_date),
    terms: `NET-${terms}`,
    billingType: 'Recurring / Auto',
    totalAmount: num(row.total),
    paidAmount: num(row.amount_paid),
    balanceDue: num(row.balance),
    status: invoiceStatus(row),
    overdueDays: num(row.days_overdue),
    cyclePeriod: `${date(row.period_start)} - ${date(row.period_end)}`,
    lineItems: (row.lines ?? []).map((line: Rec) => ({
      id: line.id,
      description: line.description,
      sku: '',
      quantity: line.quantity,
      unitPrice: num(line.unit_price),
      taxRate: num(line.tax_rate),
      discount: num(line.discount_amount),
      amount: num(line.taxable_amount),
    })),
    payments: (row.payments ?? []).map((p: Rec) => ({
      id: p.id,
      date: date(p.paid_on),
      method: methodLabel(p.method),
      methodDetail: p.reference ?? p.notes ?? '—',
      amount: num(p.amount),
      status: p.status === 'recorded' ? 'Settled' : 'Failed',
      recordedBy: '',
    })),
    auditTrail: (row.history ?? []).map((h: Rec) => ({
      id: h.id,
      title: String(h.action).replace(/^invoice\./, '').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()),
      description: h.actor_name ? `By ${h.actor_name}` : 'By the system',
      timestamp: date(h.created_at),
      type: 'info',
    })),
  };
}

export function mapSubscription(row: Rec): Subscription {
  const interval = row.billing_interval ?? row.plan?.billing_interval;
  const cadence = ({ daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Annual' } as const)[interval as 'daily'] ?? 'Monthly';
  const status = String(row.status);
  return {
    uuid: row.id,
    actions: row.allowed_actions ?? [],
    id: row.number,
    version: 'v1',
    customerName: row.customer_name ?? row.customer?.name ?? '',
    customerDomain: row.customer_email ?? row.customer?.email ?? '',
    planName: row.plan_name ?? row.plan?.name ?? '',
    tier: cadence,
    contractTerm: `${date(row.start_date)} to ${date(row.expiry_date)}`,
    nextBillingDate: row.next_period_start ? date(row.next_period_start) : '—',
    status: (status.charAt(0).toUpperCase() + status.slice(1)) as Subscription['status'],
    cadence,
    cadenceValue: num(row.subtotal ?? row.totals?.subtotal),
    autoRenew: Boolean(row.plan?.allow_renewal),
  };
}

export function mapProduct(row: Rec): ProductItem {
  const sales = num(row.sales_price);
  const cost = num(row.cost_price);
  return {
    uuid: row.id,
    id: row.id,
    sku: `SKU-${short(row.id)}`,
    name: row.name,
    type: row.product_type as ProductItem['type'],
    salesBasePrice: sales,
    costPrice: cost,
    marginPercent: sales ? Number((((sales - cost) / sales) * 100).toFixed(1)) : 0,
    variantsCount: num(row.variants_count ?? (row.variants ?? []).length),
    internalNotes: row.notes ?? '',
    variants: (row.variants ?? []).map((v: Rec) => ({ uuid: v.id, id: v.id, attribute: v.attribute, value: v.value, extraPrice: num(v.extra_price), effectivePrice: sales + num(v.extra_price) })),
  };
}

export function mapTax(row: Rec): TaxRegime {
  return {
    uuid: row.id,
    id: row.id,
    name: row.name,
    code: `TAX-${num(row.rate_percent)}`,
    rate: num(row.rate_percent),
    type: 'Exclusive',
    regionalSplitRule: row.is_active ? 'Added on top of the taxable amount' : 'Inactive',
    appliesScope: 'Products using this tax rule',
    isDefault: false,
  };
}

export function mapDiscount(row: Rec, today: string): DiscountRule {
  const exhausted = row.usage_limit !== null && row.times_used >= row.usage_limit;
  const expired = row.ends_on && row.ends_on < today;
  const scheduled = row.starts_on > today;
  const status: DiscountRule['status'] = !row.is_active || expired ? 'Expired' : exhausted ? 'Exhausted' : scheduled ? 'Scheduled' : 'Active';
  return {
    uuid: row.id,
    id: row.id,
    name: row.name,
    code: String(row.name).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, ''),
    type: row.discount_type,
    value: num(row.value),
    appliesTo: row.scope === 'product' ? row.product_name ?? 'Product' : 'Whole subscription',
    window: `${date(row.starts_on)} to ${row.ends_on ? date(row.ends_on) : 'open'}`,
    usageCount: num(row.times_used),
    usageLimit: row.usage_limit ?? 0,
    minSubtotal: num(row.min_purchase_amount),
    minQuantity: num(row.min_quantity),
    targetScope: row.scope,
    startDate: row.starts_on,
    endDate: row.ends_on ?? '',
    status,
  };
}

export function mapPayment(row: Rec): PaymentEntry {
  return {
    id: `PAY-${short(row.id)}`,
    date: date(row.paid_on),
    invoiceRef: row.invoice_number,
    customerName: row.customer_name,
    planTier: '',
    paymentMethod: methodLabel(row.method),
    amountSettled: num(row.amount),
    status: row.status === 'recorded' ? 'Settled' : 'Voided',
  };
}

function agingBucket(days: number): ReceivablesAccount['agingBucket'] {
  if (days <= 0) return 'Current';
  if (days <= 30) return '1-30 Days';
  if (days <= 60) return '31-60 Days';
  if (days <= 90) return '61-90 Days';
  return '90+ Days';
}

export function mapReceivable(row: Rec): ReceivablesAccount {
  const days = num(row.days_overdue);
  return {
    id: row.id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    tierTag: '',
    invoiceRef: row.number,
    originationDate: date(row.issue_date),
    dueDate: date(row.due_date),
    terms: '',
    agingBucket: agingBucket(days),
    agingDays: days,
    balanceDue: num(row.balance),
    totalInvoiceAmount: num(row.total),
    dunningStage: days <= 30 ? 'Stage 1: Courtesy Ping' : days <= 60 ? 'Stage 2: Auto-Retry Pending' : 'Stage 3: Service Throttled',
  };
}

export function mapRun(row: Rec): BillingRunHistory {
  const evaluated = num(row.created_count) + num(row.skipped_count) + num(row.failed_count);
  return {
    id: `#RUN-${short(row.id)}`,
    executedAt: row.started_at ? new Date(row.started_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—',
    triggerMode: row.trigger === 'scheduled' ? 'Scheduled Cron' : 'Manual Catch-up',
    evaluated,
    invoicesCreated: num(row.created_count),
    skipped: num(row.skipped_count),
    totalVolume: 0,
    executionTime: row.status === 'completed_with_errors' ? `${num(row.failed_count)} failed` : row.status,
  };
}

export function queueFrom(subs: Rec[], todayIso: string): QueuedBillingItem[] {
  return subs
    .filter((s) => s.status === 'active' || s.status === 'paused')
    .map((s) => {
      const due = s.next_period_start && s.next_period_start <= todayIso;
      return {
        id: s.id,
        subscriptionId: s.number,
        version: 'v1',
        customerName: s.customer_name,
        customerEmail: s.customer_email,
        planTier: s.plan_name,
        billingPeriod: s.next_period_start ? date(s.next_period_start) : '—',
        estimatedAmount: num(s.subtotal),
        amountDetail: 'Before tax and discounts',
        validationStatus: s.status === 'paused' ? ('Paused / Excluded' as const) : due ? ('Clean (Ready)' as const) : ('Paused / Excluded' as const),
      };
    })
    .filter((item) => item.validationStatus === 'Clean (Ready)' || item.planTier !== undefined);
}

export interface LiveWorkspace extends WorkspaceData {
  customers: Rec[];
  plans: Rec[];
  templates: Rec[];
  rawProducts: Rec[];
  currency: string;
}

async function safe<T>(enabled: boolean, task: () => Promise<T>, fallback: T): Promise<T> {
  if (!enabled) return fallback;
  try {
    return await task();
  } catch {
    return fallback;
  }
}

export async function loadLiveWorkspace(permissions: readonly string[], currency: string): Promise<LiveWorkspace> {
  const today = new Date().toISOString().slice(0, 10);
  const has = (code: string) => can(permissions, code);
  const empty = { data: [] as Rec[], meta: { page: 1, page_size: 100, total: 0, total_pages: 0 } };
  const [invoices, subs, payments, runs, products, taxes, discounts, receivables, customers, plans, templates] = await Promise.all([
    safe(has('invoices.view'), () => biz.invoices.list({ sort: '-created_at' }), empty),
    safe(has('subscriptions.view'), () => biz.subscriptions.list({ sort: '-created_at' }), empty),
    safe(has('payments.view'), () => biz.payments.list(), empty),
    safe(has('billing_runs.view'), () => biz.billing.list(), empty),
    safe(has('products.view'), () => biz.products.list(), empty),
    safe(has('taxes.view'), () => biz.taxRules.list(), [] as Rec[]),
    safe(has('discounts.view'), () => biz.discounts.list(), [] as Rec[]),
    safe(has('invoices.view') || has('payments.view'), () => biz.reports.receivables(), { invoices: [] as Rec[] } as Rec),
    safe(has('customers.view'), () => biz.customers.list(), empty),
    safe(has('plans.view'), () => biz.plans.list(), empty),
    safe(has('quotations.view'), () => biz.templates.list(), [] as Rec[]),
  ]);
  const detailedProducts = await Promise.all(
    products.data.map((p) => safe(true, () => request<Rec>('GET', `/products/${p.id}`), p)),
  );
  return {
    invoices: invoices.data.map(mapInvoice),
    subscriptions: subs.data.map(mapSubscription),
    queuedBillingItems: queueFrom(subs.data, today),
    billingRunHistory: runs.data.map(mapRun),
    payments: payments.data.map(mapPayment),
    receivables: (receivables.invoices ?? []).map(mapReceivable),
    products: detailedProducts.map(mapProduct),
    taxRegimes: taxes.map(mapTax),
    discounts: discounts.map((d) => mapDiscount(d, today)),
    customers: customers.data,
    plans: plans.data,
    templates,
    rawProducts: detailedProducts,
    currency,
  };
}

import { request } from '../api/client';

export const placeholderProduct = (): ProductItem => ({ id: 'new-product', sku: 'NEW', name: 'New product', type: 'Software Platform', salesBasePrice: 0, costPrice: 0, marginPercent: 0, variantsCount: 0, internalNotes: '', variants: [] });
export const placeholderTax = (): TaxRegime => ({ id: 'new-tax', name: 'New tax rule', code: 'NEW', rate: 0, type: 'Exclusive', regionalSplitRule: 'Added on top of the taxable amount', appliesScope: 'Products using this tax rule' });
export const placeholderDiscount = (): DiscountRule => ({ id: 'new-discount', name: 'New discount', code: 'NEW-DISCOUNT', type: 'percentage', value: 10, appliesTo: 'Whole subscription', window: '', usageCount: 0, usageLimit: 0, minSubtotal: 0, minQuantity: 0, targetScope: 'subscription', startDate: new Date().toISOString().slice(0, 10), endDate: '', status: 'Active' });
