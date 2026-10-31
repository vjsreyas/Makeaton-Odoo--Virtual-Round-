import type { ActiveContextType } from '../api/types';

export const BUSINESS_WILDCARD = 'business.*';
export const PLATFORM_WILDCARD = 'platform.*';

export function can(permissions: readonly string[], code: string): boolean {
  if (code.includes('*')) return false;
  if (code.startsWith('platform.')) return permissions.includes(PLATFORM_WILDCARD);
  return permissions.includes(BUSINESS_WILDCARD) || permissions.includes(code);
}

export function canAny(permissions: readonly string[], codes: readonly string[]): boolean {
  return codes.some((code) => can(permissions, code));
}

export function isBusinessAdmin(permissions: readonly string[]): boolean {
  return permissions.includes(BUSINESS_WILDCARD);
}

export function homePathFor(role: ActiveContextType | null | undefined): string {
  switch (role) {
    case 'platform':
      return '/platform/businesses';
    case 'business_admin':
    case 'business_staff':
      return '/app';
    case 'customer':
      return '/portal';
    default:
      return '/start';
  }
}

export function roleLabel(role: ActiveContextType | null | undefined): string {
  switch (role) {
    case 'platform':
      return 'Platform Admin';
    case 'business_admin':
      return 'Business Admin';
    case 'business_staff':
      return 'Business Staff';
    case 'customer':
      return 'Customer';
    default:
      return 'No business selected';
  }
}
