import type { NavigationTab } from '../types';
import { canAny, isBusinessAdmin } from './permissions';

export interface TabRequirement {
  admin?: boolean;
  anyOf?: readonly string[];
}

export const TAB_REQUIREMENTS: Record<NavigationTab, TabRequirement> = {
  dashboard: {},
  reports: { anyOf: ['reports.view'] },
  products: { anyOf: ['products.view', 'plans.view', 'quotations.view'] },
  subscriptions: { anyOf: ['subscriptions.view'] },
  invoices: { anyOf: ['invoices.view'] },
  'invoice-detail': { anyOf: ['invoices.view'] },
  'billing-run': { anyOf: ['billing_runs.view'] },
  payments: { anyOf: ['payments.view'] },
  receivables: { anyOf: ['invoices.view', 'payments.view'] },
  discounts: { anyOf: ['discounts.view'] },
  taxes: { anyOf: ['taxes.view'] },
  staff: { admin: true },
  settings: { admin: true },
};

export const SIDEBAR_ENTRIES = {
  plans: { anyOf: ['plans.view'] },
  quotationTemplates: { anyOf: ['quotations.view'] },
} as const;

export function canAccessRequirement(permissions: readonly string[], requirement: TabRequirement): boolean {
  if (requirement.admin) return isBusinessAdmin(permissions);
  if (requirement.anyOf && requirement.anyOf.length > 0) return canAny(permissions, requirement.anyOf);
  return true;
}

export function canAccessTab(permissions: readonly string[], tab: NavigationTab): boolean {
  return canAccessRequirement(permissions, TAB_REQUIREMENTS[tab]);
}

export const MOCK_TABS: ReadonlySet<NavigationTab> = new Set<NavigationTab>([
  'dashboard',
  'reports',
  'products',
  'subscriptions',
  'invoices',
  'invoice-detail',
  'billing-run',
  'payments',
  'receivables',
  'discounts',
  'taxes',
  'settings',
]);

const FIRST_TAB_ORDER: readonly NavigationTab[] = [
  'dashboard',
  'invoices',
  'subscriptions',
  'products',
  'payments',
  'staff',
];

export function firstAccessibleTab(permissions: readonly string[]): NavigationTab {
  return FIRST_TAB_ORDER.find((tab) => canAccessTab(permissions, tab)) ?? 'dashboard';
}
