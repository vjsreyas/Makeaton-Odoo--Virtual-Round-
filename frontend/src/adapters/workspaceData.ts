import {
  BILLING_RUN_HISTORY,
  DISCOUNT_RULES,
  INITIAL_INVOICES,
  INITIAL_PRODUCTS,
  INITIAL_SUBSCRIPTIONS,
  PAYMENT_ENTRIES,
  QUEUED_BILLING_ITEMS,
  RECEIVABLES_ACCOUNTS,
  TAX_REGIMES,
} from '../mock/mockData';
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

export interface WorkspaceData {
  invoices: Invoice[];
  subscriptions: Subscription[];
  queuedBillingItems: QueuedBillingItem[];
  billingRunHistory: BillingRunHistory[];
  payments: PaymentEntry[];
  receivables: ReceivablesAccount[];
  products: ProductItem[];
  taxRegimes: TaxRegime[];
  discounts: DiscountRule[];
}

export interface WorkspaceDataSource {
  readonly kind: 'mock' | 'api';
  load(): WorkspaceData;
}

export const mockWorkspaceDataSource: WorkspaceDataSource = {
  kind: 'mock',
  load: () => ({
    invoices: INITIAL_INVOICES,
    subscriptions: INITIAL_SUBSCRIPTIONS,
    queuedBillingItems: QUEUED_BILLING_ITEMS,
    billingRunHistory: BILLING_RUN_HISTORY,
    payments: PAYMENT_ENTRIES,
    receivables: RECEIVABLES_ACCOUNTS,
    products: INITIAL_PRODUCTS,
    taxRegimes: TAX_REGIMES,
    discounts: DISCOUNT_RULES,
  }),
};

export const workspaceDataSource: WorkspaceDataSource = mockWorkspaceDataSource;
