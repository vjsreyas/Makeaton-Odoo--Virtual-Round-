import { request, requestPaged } from '../api/client';
import type { Rec } from '../api/business';

export const portalApi = {
  summary: () => request<Rec>('GET', '/portal/summary'),
  subscriptions: () => requestPaged<Rec>('/portal/subscriptions', { page_size: 100 }),
  subscription: (id: string) => request<Rec>('GET', `/portal/subscriptions/${id}`),
  subscriptionAction: (id: string, action: 'accept' | 'reject' | 'pause' | 'resume' | 'close') => request<Rec>('POST', `/portal/subscriptions/${id}/${action}`),
  invoices: () => requestPaged<Rec>('/portal/invoices', { page_size: 100 }),
  invoice: (id: string) => request<Rec>('GET', `/portal/invoices/${id}`),
  payments: () => requestPaged<Rec>('/portal/payments', { page_size: 100 }),
  profile: () => request<Rec>('GET', '/portal/profile'),
  updateProfile: (body: Rec) => request<Rec>('PATCH', '/portal/profile', { body }),
};

export type PortalRoute = 'overview' | 'subscriptions' | 'invoices' | 'payments' | 'profile';
