import { request, requestPaged } from './client';
import type {
  ChangePasswordRequest,
  JoinBusinessResult,
  LoginResult,
  Me,
  Paged,
  PermissionCatalog,
  PlatformBusiness,
  PlatformBusinessCreate,
  PlatformBusinessQuery,
  PlatformBusinessUpdate,
  PublicBusiness,
  RegisterRequest,
  RegisterResult,
  ResetPasswordRequest,
  ResetPasswordResult,
  Session,
  SwitchContextRequest,
  TeamCreateRequest,
  TeamMember,
  TeamQuery,
  TeamUpdateRequest,
} from './types';

export const authApi = {
  register: (body: RegisterRequest) => request<RegisterResult>('POST', '/auth/register', { body, auth: false }),
  login: (email: string, password: string) =>
    request<LoginResult>('POST', '/auth/login', { body: { email, password }, auth: false }),
  me: (signal?: AbortSignal) => request<Me>('GET', '/auth/me', { signal }),
  switchContext: (body: SwitchContextRequest) => request<Session>('POST', '/auth/switch-context', { body }),
  joinBusiness: (business_slug: string) =>
    request<JoinBusinessResult>('POST', '/auth/join-business', { body: { business_slug } }),
  forgotPassword: (email: string) =>
    request<{ message: string }>('POST', '/auth/forgot-password', { body: { email }, auth: false }),
  resetPassword: (body: ResetPasswordRequest) =>
    request<ResetPasswordResult>('POST', '/auth/reset-password', { body, auth: false }),
  changePassword: (body: ChangePasswordRequest) =>
    request<{ access_token: string; expires_in: number }>('POST', '/auth/change-password', { body }),
};

export const publicApi = {
  business: (slug: string, signal?: AbortSignal) =>
    request<PublicBusiness>('GET', `/public/businesses/${encodeURIComponent(slug)}`, { auth: false, signal }),
};

export const teamApi = {
  catalog: (signal?: AbortSignal) => request<PermissionCatalog>('GET', '/permissions/catalog', { signal }),
  list: (query: TeamQuery, signal?: AbortSignal): Promise<Paged<TeamMember>> =>
    requestPaged<TeamMember>('/team', { ...query }, signal),
  create: (body: TeamCreateRequest) => request<TeamMember>('POST', '/team', { body }),
  get: (id: string) => request<TeamMember>('GET', `/team/${id}`),
  update: (id: string, body: TeamUpdateRequest) => request<TeamMember>('PATCH', `/team/${id}`, { body }),
  setPermissions: (id: string, permissions: string[]) =>
    request<TeamMember>('PUT', `/team/${id}/permissions`, { body: { permissions } }),
  deactivate: (id: string) => request<TeamMember>('POST', `/team/${id}/deactivate`),
  activate: (id: string) => request<TeamMember>('POST', `/team/${id}/activate`),
};

export const platformApi = {
  list: (query: PlatformBusinessQuery, signal?: AbortSignal): Promise<Paged<PlatformBusiness>> =>
    requestPaged<PlatformBusiness>('/platform/businesses', { ...query }, signal),
  create: (body: PlatformBusinessCreate) => request<PlatformBusiness>('POST', '/platform/businesses', { body }),
  get: (id: string) => request<PlatformBusiness>('GET', `/platform/businesses/${id}`),
  update: (id: string, body: PlatformBusinessUpdate) =>
    request<PlatformBusiness>('PATCH', `/platform/businesses/${id}`, { body }),
  suspend: (id: string) => request<PlatformBusiness>('POST', `/platform/businesses/${id}/suspend`),
  activate: (id: string) => request<PlatformBusiness>('POST', `/platform/businesses/${id}/activate`),
  resendAdminInvite: (id: string) =>
    request<{ invites_sent: number }>('POST', `/platform/businesses/${id}/resend-admin-invite`),
};

export const IMPLEMENTED_ENDPOINTS: ReadonlyArray<readonly [string, string]> = [
  ['POST', '/auth/register'],
  ['POST', '/auth/login'],
  ['GET', '/auth/me'],
  ['POST', '/auth/switch-context'],
  ['POST', '/auth/join-business'],
  ['POST', '/auth/forgot-password'],
  ['POST', '/auth/reset-password'],
  ['POST', '/auth/change-password'],
  ['GET', '/public/businesses/{slug}'],
  ['GET', '/permissions/catalog'],
  ['GET', '/team'],
  ['POST', '/team'],
  ['GET', '/team/{membership_id}'],
  ['PATCH', '/team/{membership_id}'],
  ['PUT', '/team/{membership_id}/permissions'],
  ['POST', '/team/{membership_id}/deactivate'],
  ['POST', '/team/{membership_id}/activate'],
  ['GET', '/platform/businesses'],
  ['POST', '/platform/businesses'],
  ['GET', '/platform/businesses/{business_id}'],
  ['PATCH', '/platform/businesses/{business_id}'],
  ['POST', '/platform/businesses/{business_id}/suspend'],
  ['POST', '/platform/businesses/{business_id}/activate'],
  ['POST', '/platform/businesses/{business_id}/resend-admin-invite'],
];
