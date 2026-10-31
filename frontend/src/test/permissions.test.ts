import { describe, expect, it } from 'vitest';
import { TAB_REQUIREMENTS, canAccessTab, firstAccessibleTab } from '../auth/navigation';
import { can, canAny, homePathFor, isBusinessAdmin, roleLabel } from '../auth/permissions';

describe('can()', () => {
  it('lets the business wildcard grant business codes but never platform codes', () => {
    expect(can(['business.*'], 'products.view')).toBe(true);
    expect(can(['business.*'], 'invoices.manage')).toBe(true);
    expect(can(['business.*'], 'platform.stats')).toBe(false);
  });

  it('lets the platform wildcard grant only platform codes', () => {
    expect(can(['platform.*'], 'platform.stats')).toBe(true);
    expect(can(['platform.*'], 'products.view')).toBe(false);
  });

  it('grants exactly the explicit codes for staff', () => {
    const perms = ['products.view', 'plans.view'];
    expect(can(perms, 'products.view')).toBe(true);
    expect(can(perms, 'products.create')).toBe(false);
    expect(canAny(perms, ['invoices.view', 'plans.view'])).toBe(true);
    expect(canAny(perms, ['invoices.view'])).toBe(false);
  });

  it('never honours a bare wildcard or a wildcard as the requested code', () => {
    expect(can(['*'], 'products.view')).toBe(false);
    expect(can(['business.*'], 'business.*')).toBe(false);
    expect(can([], 'products.view')).toBe(false);
  });

  it('detects business admins only through the business wildcard', () => {
    expect(isBusinessAdmin(['business.*'])).toBe(true);
    expect(isBusinessAdmin(['products.view'])).toBe(false);
    expect(isBusinessAdmin(['platform.*'])).toBe(false);
  });
});

describe('navigation requirements', () => {
  it('shows only the dashboard to staff without any permission', () => {
    const visible = (Object.keys(TAB_REQUIREMENTS) as (keyof typeof TAB_REQUIREMENTS)[]).filter((tab) => canAccessTab([], tab));
    expect(visible).toEqual(['dashboard']);
  });

  it('maps each staff permission to its modules', () => {
    expect(canAccessTab(['invoices.view'], 'invoices')).toBe(true);
    expect(canAccessTab(['invoices.view'], 'invoice-detail')).toBe(true);
    expect(canAccessTab(['invoices.view'], 'receivables')).toBe(true);
    expect(canAccessTab(['invoices.view'], 'payments')).toBe(false);
    expect(canAccessTab(['plans.view'], 'products')).toBe(true);
    expect(canAccessTab(['taxes.view'], 'taxes')).toBe(true);
    expect(canAccessTab(['taxes.view'], 'discounts')).toBe(false);
  });

  it('reserves team and settings for business admins', () => {
    expect(canAccessTab(['business.*'], 'staff')).toBe(true);
    expect(canAccessTab(['business.*'], 'settings')).toBe(true);
    expect(canAccessTab(['products.view', 'plans.view', 'subscriptions.view'], 'staff')).toBe(false);
    expect(canAccessTab(['products.view'], 'settings')).toBe(false);
  });

  it('picks a sensible first tab', () => {
    expect(firstAccessibleTab(['business.*'])).toBe('dashboard');
    expect(firstAccessibleTab([])).toBe('dashboard');
  });
});

describe('role helpers', () => {
  it('maps roles to home paths and labels', () => {
    expect(homePathFor('platform')).toBe('/platform/businesses');
    expect(homePathFor('business_admin')).toBe('/app');
    expect(homePathFor('business_staff')).toBe('/app');
    expect(homePathFor('customer')).toBe('/portal');
    expect(homePathFor('none')).toBe('/start');
    expect(homePathFor(undefined)).toBe('/start');
    expect(roleLabel('business_staff')).toBe('Business Staff');
  });
});
