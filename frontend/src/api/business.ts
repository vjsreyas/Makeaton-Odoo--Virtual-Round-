import { request, requestPaged } from './client';
import type { Paged } from './types';

export type Rec = Record<string, any>;
type Q = Record<string, string | number | boolean | null | undefined>;

const list = (path: string) => (query: Q = {}, signal?: AbortSignal) => requestPaged<Rec>(path, { page_size: 100, ...query }, signal);
const plain = (path: string) => (signal?: AbortSignal) => request<Rec[]>('GET', path, { signal });

export const biz = {
  products: {
    list: list('/products'),
    create: (body: Rec) => request<Rec>('POST', '/products', { body }),
    update: (id: string, body: Rec) => request<Rec>('PATCH', `/products/${id}`, { body }),
    createVariant: (id: string, body: Rec) => request<Rec>('POST', `/products/${id}/variants`, { body }),
    updateVariant: (id: string, body: Rec) => request<Rec>('PATCH', `/variants/${id}`, { body }),
  },
  plans: {
    list: list('/plans'),
    create: (body: Rec) => request<Rec>('POST', '/plans', { body }),
    update: (id: string, body: Rec) => request<Rec>('PATCH', `/plans/${id}`, { body }),
  },
  taxRules: {
    list: plain('/tax-rules'),
    create: (body: Rec) => request<Rec>('POST', '/tax-rules', { body }),
    update: (id: string, body: Rec) => request<Rec>('PATCH', `/tax-rules/${id}`, { body }),
  },
  discounts: {
    list: plain('/discount-rules'),
    create: (body: Rec) => request<Rec>('POST', '/discount-rules', { body }),
    update: (id: string, body: Rec) => request<Rec>('PATCH', `/discount-rules/${id}`, { body }),
  },
  customers: {
    list: list('/customers'),
    create: (body: Rec) => request<Rec>('POST', '/customers', { body }),
    update: (id: string, body: Rec) => request<Rec>('PATCH', `/customers/${id}`, { body }),
    invite: (id: string) => request<Rec>('POST', `/customers/${id}/invite`),
  },
  templates: { list: plain('/quotation-templates') },
  subscriptions: {
    list: list('/subscriptions'),
    get: (id: string) => request<Rec>('GET', `/subscriptions/${id}`),
    create: (body: Rec) => request<Rec>('POST', '/subscriptions', { body }),
    action: (id: string, action: string, body: Rec = {}) => request<Rec>('POST', `/subscriptions/${id}/${action}`, { body }),
    history: (id: string) => request<Rec[]>('GET', `/subscriptions/${id}/history`),
  },
  billing: {
    run: (body: Rec = {}) => request<Rec>('POST', '/billing-runs', { body }),
    list: list('/billing-runs'),
    items: (id: string, query: Q = {}) => requestPaged<Rec>(`/billing-runs/${id}/items`, { page_size: 100, ...query }),
  },
  invoices: {
    list: list('/invoices'),
    get: (id: string) => request<Rec>('GET', `/invoices/${id}`),
    confirm: (id: string) => request<Rec>('POST', `/invoices/${id}/confirm`),
    cancel: (id: string, reason?: string) => request<Rec>('POST', `/invoices/${id}/cancel`, { body: { reason } }),
    send: (id: string) => request<Rec>('POST', `/invoices/${id}/send`),
    bulkConfirm: (ids?: string[]) => request<Rec>('POST', '/invoices/bulk-confirm', { body: { ids } }),
  },
  payments: {
    list: list('/payments'),
    record: (invoiceId: string, body: Rec, key?: string) => request<Rec>('POST', `/invoices/${invoiceId}/payments`, { body }),
    void: (id: string, reason?: string) => request<Rec>('POST', `/payments/${id}/void`, { body: { reason } }),
  },
  reports: {
    dashboard: (query: Q = {}) => request<Rec>('GET', '/reports/dashboard', { query }),
    revenue: (query: Q = {}) => request<Rec>('GET', '/reports/revenue', { query }),
    receivables: () => request<Rec>('GET', '/reports/receivables'),
    summary: () => request<Rec>('GET', '/reports/subscriptions-summary'),
  },
  settings: {
    get: () => request<Rec>('GET', '/settings'),
    patch: (body: Rec) => request<Rec>('PATCH', '/settings', { body }),
  },
  audit: { list: (query: Q = {}) => requestPaged<Rec>('/audit-logs', { page_size: 50, ...query }) },
};

export type { Paged };
